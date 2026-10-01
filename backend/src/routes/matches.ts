import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { authenticatedUserId, requireAuth } from "../middleware/auth.js";
import { paginationSchema, uuidSchema } from "../validation.js";

export const matchesRouter = Router();
matchesRouter.use(requireAuth);

const querySchema = paginationSchema.extend({
  minScore: z.coerce.number().int().min(0).max(100).default(30),
  lostReportId: uuidSchema.optional(),
});

function lostSummary(row: {
  id: string;
  itemTitle: string;
  category: string;
  color: string | null;
  brand: string | null;
  imageUrls: string[];
  locationLost: string;
  dateLost: Date;
  status: string;
}) {
  return {
    id: row.id,
    itemTitle: row.itemTitle,
    category: row.category,
    color: row.color ?? undefined,
    brand: row.brand ?? undefined,
    imageUrls: row.imageUrls,
    locationLost: row.locationLost,
    dateLost: row.dateLost.toISOString().slice(0, 10),
    status: row.status,
  };
}

function foundSummary(row: {
  id: string;
  itemTitle: string;
  category: string;
  color: string | null;
  brand: string | null;
  imageUrls: string[];
  locationFound: string;
  dateFound: Date;
  custodyLocation: string | null;
  status: string;
}) {
  return {
    id: row.id,
    itemTitle: row.itemTitle,
    category: row.category,
    color: row.color ?? undefined,
    brand: row.brand ?? undefined,
    imageUrls: row.imageUrls,
    locationFound: row.locationFound,
    dateFound: row.dateFound.toISOString().slice(0, 10),
    custodyLocation: row.custodyLocation ?? undefined,
    status: row.status,
  };
}
matchesRouter.get("/", async (req, res) => {
  const query = querySchema.parse(req.query);
  const userId = authenticatedUserId(req);
  const actor = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  const staff = Boolean(actor && ["staff", "admin", "super_admin"].includes(actor.role));
  const where: Prisma.MatchCandidateWhereInput = {
    score: { gte: query.minScore },
    ...(query.lostReportId ? { lostReportId: query.lostReportId } : {}),
    lostReport: {
      status: "open",
      ...(staff ? {} : { reporterUserId: userId }),
    },
    foundReport: { status: { in: ["open", "verified"] } },
  };

  const [rows, total] = await Promise.all([
    prisma.matchCandidate.findMany({
      where,
      orderBy: [{ score: "desc" }, { computedAt: "desc" }],
      skip: query.offset,
      take: query.limit,
      include: {
        lostReport: true,
        foundReport: true,
      },
    }),
    prisma.matchCandidate.count({ where }),
  ]);

  res.json({
    data: {
      rows: rows.map((row) => ({
        id: row.id,
        lostReportId: row.lostReportId,
        foundReportId: row.foundReportId,
        score: row.score,
        computedAt: row.computedAt.toISOString(),
        lostReport: lostSummary(row.lostReport),
        foundReport: foundSummary(row.foundReport),
      })),
      total,
    },
  });
});
