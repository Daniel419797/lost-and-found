import { Router } from "express";
import { z } from "zod";
import { writeAudit } from "../lib/audit.js";
import { prisma } from "../lib/prisma.js";
import { authenticatedUserId, requireAuth, requireRoles } from "../middleware/auth.js";
import { AppError } from "../middleware/errors.js";
import { claimStatusSchema, paginationSchema, uuidSchema } from "../validation.js";

export const claimsRouter = Router();
export const handoversRouter = Router();

claimsRouter.use(requireAuth);
handoversRouter.use(requireAuth);

const claimCreateSchema = z.object({
  foundReportId: uuidSchema,
  lostReportId: uuidSchema.optional(),
  description: z.string().trim().min(10).max(5000),
});

const decisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  decisionReason: z.string().trim().min(3).max(3000).optional(),
  decision_reason: z.string().trim().min(3).max(3000).optional(),
  notes: z.string().trim().max(3000).optional(),
});

const queueQuerySchema = paginationSchema.extend({
  status: claimStatusSchema.optional(),
});

function claimView(row: {
  id: string;
  linkedLostReportId: string | null;
  foundReportId: string;
  claimantUserId: string;
  status: string;
  evidenceText: string;
  reviewedByUserId: string | null;
  decisionReason: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    lostReportId: row.linkedLostReportId ?? "",
    foundReportId: row.foundReportId,
    claimantId: row.claimantUserId,
    status: row.status,
    description: row.evidenceText,
    reviewedBy: row.reviewedByUserId ?? undefined,
    reviewNotes: row.decisionReason ?? undefined,
    reviewedAt: row.reviewedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function handoverView(row: {
  id: string;
  claimId: string;
  officerUserId: string;
  status: string;
  handoverPoint: string;
  handoverTime: Date;
  completedAt: Date | null;
  completedByUserId: string | null;
  evidenceUrl: string | null;
  notes: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    claimId: row.claimId,
    officerUserId: row.officerUserId,
    status: row.status,
    handoverPoint: row.handoverPoint,
    handoverTime: row.handoverTime.toISOString(),
    completedAt: row.completedAt?.toISOString(),
    completedByUserId: row.completedByUserId ?? undefined,
    evidenceUrl: row.evidenceUrl ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

async function isReviewer(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return Boolean(user && ["staff", "admin", "super_admin"].includes(user.role));
}

claimsRouter.get("/my", async (req, res) => {
  const query = queueQuerySchema.parse(req.query);
  const userId = authenticatedUserId(req);
  const where = {
    claimantUserId: userId,
    ...(query.status ? { status: query.status } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.claim.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: query.offset,
      take: query.limit,
    }),
    prisma.claim.count({ where }),
  ]);

  res.json({ data: { rows: rows.map(claimView), total } });
});

claimsRouter.get(
  "/review-queue",
  requireRoles("staff", "admin", "super_admin"),
  async (req, res) => {
    const query = queueQuerySchema.parse(req.query);
    const where = {
      ...(query.status ? { status: query.status } : { status: { in: ["pending", "under_review"] } }),
    };

    const [rows, total] = await Promise.all([
      prisma.claim.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip: query.offset,
        take: query.limit,
      }),
      prisma.claim.count({ where }),
    ]);

    res.json({ data: { rows: rows.map(claimView), total } });
  },
);

claimsRouter.get("/:id", async (req, res) => {
  const id = uuidSchema.parse(req.params.id);
  const userId = authenticatedUserId(req);
  const row = await prisma.claim.findUnique({ where: { id } });
  if (!row) throw new AppError(404, "Claim not found.");

  if (row.claimantUserId !== userId && !(await isReviewer(userId))) {
    throw new AppError(403, "You cannot view this claim.");
  }

  res.json({ data: claimView(row) });
});

claimsRouter.post("/", async (req, res) => {
  const input = claimCreateSchema.parse(req.body);
  const userId = authenticatedUserId(req);

  const found = await prisma.foundReport.findUnique({ where: { id: input.foundReportId } });
  if (!found) throw new AppError(404, "Found report not found.");
  if (!["open", "verified"].includes(found.status)) {
    throw new AppError(409, "This item is no longer available for claims.");
  }
  if (found.finderUserId === userId) {
    throw new AppError(409, "You cannot claim an item from your own found report.");
  }

  if (input.lostReportId) {
    const lost = await prisma.lostReport.findUnique({ where: { id: input.lostReportId } });
    if (!lost) throw new AppError(404, "Linked lost report not found.");
    if (lost.reporterUserId !== userId) {
      throw new AppError(403, "You can only link one of your own lost reports.");
    }
  }

  const row = await prisma.claim.create({
    data: {
      foundReportId: input.foundReportId,
      linkedLostReportId: input.lostReportId,
      claimantUserId: userId,
      evidenceText: input.description,
      status: "pending",
    },
  });

  const staff = await prisma.user.findMany({
    where: { role: { in: ["staff", "admin", "super_admin"] } },
    select: { id: true },
  });
  if (staff.length > 0) {
    await prisma.notification.createMany({
      data: staff.map((member) => ({
        recipientUserId: member.id,
        type: "claim_submitted",
        title: "New ownership claim",
        body: `A new claim was submitted for "${found.itemTitle}".`,
        metaJson: { claimId: row.id, foundReportId: found.id },
      })),
    });
  }

  void writeAudit(req, "claim.submitted", "claim", row.id, { foundReportId: found.id });
  res.status(201).json({ data: claimView(row) });
});

claimsRouter.patch(
  "/:id/decision",
  requireRoles("staff", "admin", "super_admin"),
  async (req, res) => {
    const id = uuidSchema.parse(req.params.id);
    const input = decisionSchema.parse(req.body);
    const reviewerId = authenticatedUserId(req);
    const reason = input.decisionReason ?? input.decision_reason ?? input.notes ?? "Decision recorded.";

    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.claim.findUnique({
        where: { id },
        include: { foundReport: true },
      });
      if (!current) throw new AppError(404, "Claim not found.");
      if (!["pending", "under_review"].includes(current.status)) {
        throw new AppError(409, "This claim has already been decided.");
      }

      if (input.decision === "rejected") {
        const claim = await tx.claim.update({
          where: { id },
          data: {
            status: "rejected",
            decisionReason: reason,
            reviewedByUserId: reviewerId,
            reviewedAt: new Date(),
          },
        });
        await tx.notification.create({
          data: {
            recipientUserId: current.claimantUserId,
            type: "claim_decided",
            title: "Claim reviewed",
            body: `Your claim for "${current.foundReport.itemTitle}" was not approved.`,
            metaJson: { claimId: id, decision: "rejected" },
          },
        });
        return claim;
      }

      const otherClaims = await tx.claim.findMany({
        where: {
          foundReportId: current.foundReportId,
          id: { not: current.id },
          status: { in: ["pending", "under_review"] },
        },
        select: { id: true, claimantUserId: true },
      });

      const claim = await tx.claim.update({
        where: { id },
        data: {
          status: "approved",
          decisionReason: reason,
          reviewedByUserId: reviewerId,
          reviewedAt: new Date(),
        },
      });

      await tx.foundReport.update({
        where: { id: current.foundReportId },
        data: { status: "claimed" },
      });

      if (current.linkedLostReportId) {
        await tx.lostReport.update({
          where: { id: current.linkedLostReportId },
          data: { status: "matched" },
        });
      }

      if (otherClaims.length > 0) {
        await tx.claim.updateMany({
          where: { id: { in: otherClaims.map((item) => item.id) } },
          data: {
            status: "rejected",
            decisionReason: "Another ownership claim was approved for this item.",
            reviewedByUserId: reviewerId,
            reviewedAt: new Date(),
          },
        });

        await tx.notification.createMany({
          data: otherClaims.map((other) => ({
            recipientUserId: other.claimantUserId,
            type: "claim_decided",
            title: "Claim reviewed",
            body: `Another ownership claim was approved for "${current.foundReport.itemTitle}".`,
            metaJson: { claimId: other.id, decision: "rejected" },
          })),
        });
      }

      const handoverPoint = current.foundReport.custodyLocation || "Campus Lost & Found Office";
      const handoverTime = new Date(Date.now() + 60 * 60 * 1000);
      await tx.handover.upsert({
        where: { claimId: current.id },
        create: {
          claimId: current.id,
          officerUserId: reviewerId,
          status: "ready",
          handoverPoint,
          handoverTime,
          notes: "Bring a valid student or staff ID for collection.",
        },
        update: {
          officerUserId: reviewerId,
          status: "ready",
          handoverPoint,
          handoverTime,
        },
      });

      await tx.notification.createMany({
        data: [
          {
            recipientUserId: current.claimantUserId,
            type: "claim_decided",
            title: "Claim approved",
            body: `Your claim for "${current.foundReport.itemTitle}" was approved.`,
            metaJson: { claimId: current.id, decision: "approved" },
          },
          {
            recipientUserId: current.claimantUserId,
            type: "handover_ready",
            title: "Item ready for handover",
            body: `Your item is ready for collection at ${handoverPoint}.`,
            metaJson: { claimId: current.id, handoverPoint },
          },
        ],
      });

      return claim;
    });

    void writeAudit(req, "claim.decided", "claim", id, { decision: input.decision });
    res.json({ data: { claim: claimView(result) } });
  },
);

handoversRouter.get("/", async (req, res) => {
  const query = paginationSchema
    .extend({ claimId: uuidSchema.optional() })
    .parse(req.query);
  const userId = authenticatedUserId(req);
  const reviewer = await isReviewer(userId);

  const where = reviewer
    ? { ...(query.claimId ? { claimId: query.claimId } : {}) }
    : {
        claim: {
          claimantUserId: userId,
          ...(query.claimId ? { id: query.claimId } : {}),
        },
      };

  const [rows, total] = await Promise.all([
    prisma.handover.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: query.offset,
      take: query.limit,
    }),
    prisma.handover.count({ where }),
  ]);

  res.json({ data: { rows: rows.map(handoverView), total } });
});

handoversRouter.patch(
  "/:id/complete",
  requireRoles("staff", "admin", "super_admin"),
  async (req, res) => {
    const id = uuidSchema.parse(req.params.id);
    const input = z
      .object({
        notes: z.string().trim().max(3000).optional(),
        evidenceUrl: z.string().url().optional(),
      })
      .parse(req.body);
    const actorId = authenticatedUserId(req);

    const handover = await prisma.$transaction(async (tx) => {
      const current = await tx.handover.findUnique({
        where: { id },
        include: { claim: { include: { foundReport: true } } },
      });
      if (!current) throw new AppError(404, "Handover not found.");
      if (current.status === "completed") return current;

      const completed = await tx.handover.update({
        where: { id },
        data: {
          status: "completed",
          completedAt: new Date(),
          completedByUserId: actorId,
          notes: input.notes ?? current.notes,
          evidenceUrl: input.evidenceUrl ?? current.evidenceUrl,
        },
        include: { claim: { include: { foundReport: true } } },
      });

      await tx.claim.update({ where: { id: current.claimId }, data: { status: "completed" } });
      await tx.foundReport.update({ where: { id: current.claim.foundReportId }, data: { status: "closed" } });
      if (current.claim.linkedLostReportId) {
        await tx.lostReport.update({
          where: { id: current.claim.linkedLostReportId },
          data: { status: "recovered" },
        });
      }

      await tx.notification.create({
        data: {
          recipientUserId: current.claim.claimantUserId,
          type: "system",
          title: "Handover completed",
          body: `The handover for "${current.claim.foundReport.itemTitle}" has been completed.`,
          metaJson: { claimId: current.claimId, handoverId: current.id },
        },
      });

      return completed;
    });

    void writeAudit(req, "handover.completed", "handover", id, {});
    res.json({ data: handoverView(handover) });
  },
);
