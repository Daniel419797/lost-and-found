import crypto from "node:crypto";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";

type LostLike = {
  id: string;
  reporterUserId: string;
  itemTitle: string;
  category: string;
  color: string | null;
  brand: string | null;
  description: string | null;
  locationLost: string;
  dateLost: Date;
};

type FoundLike = {
  id: string;
  itemTitle: string;
  category: string;
  color: string | null;
  brand: string | null;
  description: string | null;
  locationFound: string;
  dateFound: Date;
};

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string | null | undefined): Set<string> {
  return new Set(
    normalize(value)
      .split(" ")
      .filter((part) => part.length >= 2),
  );
}

function similarity(a: string | null | undefined, b: string | null | undefined): number {
  const left = tokens(a);
  const right = tokens(b);
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }
  return intersection / (left.size + right.size - intersection);
}

function equalText(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalize(a);
  const right = normalize(b);
  return Boolean(left && right && left === right);
}

function daysApart(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 86_400_000;
}

export function scoreMatch(lost: LostLike, found: FoundLike): {
  score: number;
  factors: Record<string, number>;
} {
  const factors: Record<string, number> = {};

  factors.category = equalText(lost.category, found.category) ? 35 : 0;
  factors.title = Math.round(similarity(lost.itemTitle, found.itemTitle) * 25);
  factors.brand = equalText(lost.brand, found.brand) ? 12 : 0;
  factors.color = equalText(lost.color, found.color) ? 8 : 0;
  factors.location = Math.round(similarity(lost.locationLost, found.locationFound) * 8);

  const delta = daysApart(lost.dateLost, found.dateFound);
  factors.date = delta <= 1 ? 8 : delta <= 3 ? 6 : delta <= 7 ? 4 : delta <= 14 ? 2 : 0;
  factors.description = Math.round(similarity(lost.description, found.description) * 4);

  const score = Math.min(
    100,
    Object.values(factors).reduce((sum, value) => sum + value, 0),
  );

  return { score, factors };
}

function pairHash(lostReportId: string, foundReportId: string): string {
  return crypto.createHash("sha256").update(`${lostReportId}:${foundReportId}`).digest("hex");
}

async function saveCandidate(lost: LostLike, found: FoundLike): Promise<void> {
  const { score, factors } = scoreMatch(lost, found);
  if (score < 30) return;

  const existing = await prisma.matchCandidate.findUnique({
    where: {
      lostReportId_foundReportId: {
        lostReportId: lost.id,
        foundReportId: found.id,
      },
    },
    select: { notifiedAt: true },
  });

  await prisma.matchCandidate.upsert({
    where: {
      lostReportId_foundReportId: {
        lostReportId: lost.id,
        foundReportId: found.id,
      },
    },
    create: {
      lostReportId: lost.id,
      foundReportId: found.id,
      score,
      factorsJson: factors as Prisma.InputJsonValue,
      computedAt: new Date(),
      uniquePairHash: pairHash(lost.id, found.id),
    },
    update: {
      score,
      factorsJson: factors as Prisma.InputJsonValue,
      computedAt: new Date(),
    },
  });

  if (score >= 70 && !existing?.notifiedAt) {
    await prisma.$transaction([
      prisma.notification.create({
        data: {
          recipientUserId: lost.reporterUserId,
          type: "match_found",
          title: "Possible match found",
          body: `We found a possible match for "${lost.itemTitle}". Review the found item before submitting a claim.`,
          metaJson: {
            lostReportId: lost.id,
            foundReportId: found.id,
            score,
          } as Prisma.InputJsonValue,
        },
      }),
      prisma.matchCandidate.update({
        where: {
          lostReportId_foundReportId: {
            lostReportId: lost.id,
            foundReportId: found.id,
          },
        },
        data: { notifiedAt: new Date() },
      }),
    ]);
  }
}

export async function recomputeMatchesForLost(lostReportId: string): Promise<void> {
  const lost = await prisma.lostReport.findUnique({ where: { id: lostReportId } });
  if (!lost || lost.status !== "open") return;

  const foundReports = await prisma.foundReport.findMany({
    where: { status: { in: ["open", "verified"] } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  for (const found of foundReports) {
    await saveCandidate(lost, found);
  }
}

export async function recomputeMatchesForFound(foundReportId: string): Promise<void> {
  const found = await prisma.foundReport.findUnique({ where: { id: foundReportId } });
  if (!found || !["open", "verified"].includes(found.status)) return;

  const lostReports = await prisma.lostReport.findMany({
    where: { status: "open" },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  for (const lost of lostReports) {
    await saveCandidate(lost, found);
  }
}
