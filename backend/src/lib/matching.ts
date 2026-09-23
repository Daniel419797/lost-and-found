import crypto from "node:crypto";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";
import {
  scoreMatch,
  type FoundMatchInput,
  type LostMatchInput,
} from "./matchScore.js";

function pairHash(lostReportId: string, foundReportId: string): string {
  return crypto.createHash("sha256").update(`${lostReportId}:${foundReportId}`).digest("hex");
}

async function saveCandidate(lost: LostMatchInput, found: FoundMatchInput): Promise<void> {
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
