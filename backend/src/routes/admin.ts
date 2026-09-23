import { Router } from "express";
import type { Prisma } from "../generated/prisma/client.js";
import { z } from "zod";
import { writeAudit } from "../lib/audit.js";
import { prisma } from "../lib/prisma.js";
import { authenticatedUserId, requireAuth, requireRoles } from "../middleware/auth.js";
import { AppError } from "../middleware/errors.js";
import { paginationSchema, uuidSchema } from "../validation.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRoles("admin", "super_admin"));

adminRouter.get("/audit-logs", async (req, res) => {
  const query = paginationSchema
    .extend({
      action: z.string().trim().max(100).optional(),
      resource_type: z.string().trim().max(100).optional(),
      resource_id: z.string().trim().max(100).optional(),
      user_id: uuidSchema.optional(),
      date_from: z.coerce.date().optional(),
      date_to: z.coerce.date().optional(),
    })
    .parse(req.query);

  const where: Prisma.AuditLogWhereInput = {
    ...(query.action ? { action: query.action } : {}),
    ...(query.resource_type ? { resource: query.resource_type } : {}),
    ...(query.resource_id ? { resourceId: query.resource_id } : {}),
    ...(query.user_id ? { userId: query.user_id } : {}),
    ...(query.date_from || query.date_to
      ? {
          createdAt: {
            ...(query.date_from ? { gte: query.date_from } : {}),
            ...(query.date_to ? { lte: query.date_to } : {}),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: query.offset,
      take: query.limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({
    data: {
      rows: rows.map((row) => ({
        id: row.id,
        action: row.action,
        resource: row.resource,
        resourceId: row.resourceId,
        details: row.details,
        userId: row.userId,
        createdAt: row.createdAt.toISOString(),
      })),
      total,
      hasMore: query.offset + rows.length < total,
    },
  });
});

adminRouter.get("/metrics", async (_req, res) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    claimsTotal,
    claimsApproved,
    claimsRejected,
    claimsPending,
    handoversCompleted,
    unauthorizedAttempts,
    auditEventsLast24h,
    completedHandovers,
  ] = await Promise.all([
    prisma.claim.count(),
    prisma.claim.count({ where: { status: { in: ["approved", "completed"] } } }),
    prisma.claim.count({ where: { status: "rejected" } }),
    prisma.claim.count({ where: { status: { in: ["pending", "under_review"] } } }),
    prisma.handover.count({ where: { status: "completed" } }),
    prisma.auditLog.count({
      where: {
        action: { in: ["security.unauthorized", "security.forbidden", "security.login_failed"] },
      },
    }),
    prisma.auditLog.count({ where: { createdAt: { gte: since } } }),
    prisma.handover.findMany({
      where: { completedAt: { not: null } },
      select: {
        completedAt: true,
        claim: { select: { createdAt: true } },
      },
      take: 1000,
    }),
  ]);

  const avgResolutionTimeDays =
    completedHandovers.length === 0
      ? 0
      : completedHandovers.reduce((sum, item) => {
          const completedAt = item.completedAt?.getTime() ?? item.claim.createdAt.getTime();
          return sum + (completedAt - item.claim.createdAt.getTime()) / 86_400_000;
        }, 0) / completedHandovers.length;

  res.json({
    data: {
      claims_total: claimsTotal,
      claims_approved: claimsApproved,
      claims_rejected: claimsRejected,
      claims_pending: claimsPending,
      handovers_completed: handoversCompleted,
      avg_resolution_time_days: Number(avgResolutionTimeDays.toFixed(2)),
      unauthorized_access_attempts: unauthorizedAttempts,
      audit_events_last_24h: auditEventsLast24h,
    },
  });
});

adminRouter.get("/users", async (req, res) => {
  const query = paginationSchema
    .extend({
      role: z.enum(["student", "staff", "admin", "super_admin"]).optional(),
      search: z.string().trim().max(120).optional(),
    })
    .parse(req.query);

  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.search
      ? {
          OR: [
            { email: { contains: query.search, mode: "insensitive" } },
            { displayName: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: query.offset,
      take: query.limit,
      select: { id: true, email: true, displayName: true, role: true, createdAt: true },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    data: {
      rows: rows.map((user) => ({ ...user, createdAt: user.createdAt.toISOString() })),
      total,
    },
  });
});

adminRouter.patch(
  "/users/:id/role",
  requireRoles("super_admin"),
  async (req, res) => {
    const id = uuidSchema.parse(req.params.id);
    const input = z.object({ role: z.enum(["student", "staff", "admin", "super_admin"]) }).parse(req.body);
    const actorId = authenticatedUserId(req);
    if (id === actorId && input.role !== "super_admin") {
      throw new AppError(409, "You cannot demote your own super admin account.");
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role: input.role },
      select: { id: true, email: true, displayName: true, role: true, createdAt: true },
    });

    void writeAudit(req, "user.role_changed", "user", id, { role: input.role });
    res.json({ data: { ...user, createdAt: user.createdAt.toISOString() } });
  },
);
