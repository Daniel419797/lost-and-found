import { Router } from "express";
import type { Prisma } from "../generated/prisma/client.js";
import { z } from "zod";
import { writeAudit } from "../lib/audit.js";
import { recomputeMatchesForFound, recomputeMatchesForLost } from "../lib/matching.js";
import { prisma } from "../lib/prisma.js";
import { authenticatedUserId, requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errors.js";
import {
  foundStatusSchema,
  itemCategorySchema,
  lostStatusSchema,
  paginationSchema,
  uuidSchema,
} from "../validation.js";

export const lostReportsRouter = Router();
export const foundReportsRouter = Router();

lostReportsRouter.use(requireAuth);
foundReportsRouter.use(requireAuth);

const sharedCreateFields = {
  itemTitle: z.string().trim().min(2).max(180),
  category: itemCategorySchema,
  color: z.string().trim().max(80).optional(),
  brand: z.string().trim().max(120).optional(),
  description: z.string().trim().max(5000).optional(),
  imageUrls: z.array(z.string().url()).max(8).optional(),
};

const lostCreateSchema = z.object({
  ...sharedCreateFields,
  locationLost: z.string().trim().min(2).max(180),
  dateLost: z.coerce.date(),
});

const foundCreateSchema = z.object({
  ...sharedCreateFields,
  locationFound: z.string().trim().min(2).max(180),
  dateFound: z.coerce.date(),
  custodyLocation: z.string().trim().max(180).optional(),
});

const lostUpdateSchema = lostCreateSchema.partial().extend({ status: lostStatusSchema.optional() });
const foundUpdateSchema = foundCreateSchema.partial().extend({ status: foundStatusSchema.optional() });

const lostQuerySchema = paginationSchema.extend({
  status: lostStatusSchema.optional(),
  category: itemCategorySchema.optional(),
  keyword: z.string().trim().max(120).optional(),
  userId: uuidSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  mine: z.enum(["true", "false"]).optional(),
});

const foundQuerySchema = paginationSchema.extend({
  status: foundStatusSchema.optional(),
  category: itemCategorySchema.optional(),
  keyword: z.string().trim().max(120).optional(),
  userId: uuidSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  mine: z.enum(["true", "false"]).optional(),
});

function lostView(row: {
  id: string;
  reporterUserId: string;
  itemTitle: string;
  category: string;
  color: string | null;
  brand: string | null;
  description: string | null;
  imageUrls: string[];
  locationLost: string;
  dateLost: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    userId: row.reporterUserId,
    itemTitle: row.itemTitle,
    category: row.category,
    color: row.color ?? undefined,
    brand: row.brand ?? undefined,
    description: row.description ?? undefined,
    imageUrls: row.imageUrls,
    locationLost: row.locationLost,
    dateLost: row.dateLost.toISOString().slice(0, 10),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function foundView(row: {
  id: string;
  finderUserId: string;
  itemTitle: string;
  category: string;
  color: string | null;
  brand: string | null;
  description: string | null;
  imageUrls: string[];
  locationFound: string;
  dateFound: Date;
  custodyLocation: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    userId: row.finderUserId,
    itemTitle: row.itemTitle,
    category: row.category,
    color: row.color ?? undefined,
    brand: row.brand ?? undefined,
    description: row.description ?? undefined,
    imageUrls: row.imageUrls,
    locationFound: row.locationFound,
    dateFound: row.dateFound.toISOString().slice(0, 10),
    custodyLocation: row.custodyLocation ?? undefined,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function roleFor(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) throw new AppError(401, "User not found.");
  return user.role;
}

function isStaffRole(role: string): boolean {
  return ["staff", "admin", "super_admin"].includes(role);
}

lostReportsRouter.get("/", async (req, res) => {
  const query = lostQuerySchema.parse(req.query);
  const userId = authenticatedUserId(req);
  const effectiveUserId = query.mine === "true" ? userId : query.userId;

  const where: Prisma.LostReportWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(effectiveUserId ? { reporterUserId: effectiveUserId } : {}),
    ...(query.from || query.to
      ? {
          dateLost: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
    ...(query.keyword
      ? {
          OR: [
            { itemTitle: { contains: query.keyword, mode: "insensitive" } },
            { description: { contains: query.keyword, mode: "insensitive" } },
            { brand: { contains: query.keyword, mode: "insensitive" } },
            { locationLost: { contains: query.keyword, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.lostReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: query.offset,
      take: query.limit,
    }),
    prisma.lostReport.count({ where }),
  ]);

  res.json({ data: { rows: rows.map(lostView), total } });
});

lostReportsRouter.get("/:id", async (req, res) => {
  const id = uuidSchema.parse(req.params.id);
  const row = await prisma.lostReport.findUnique({ where: { id } });
  if (!row) throw new AppError(404, "Lost report not found.");
  res.json({ data: lostView(row) });
});

lostReportsRouter.post("/", async (req, res) => {
  const input = lostCreateSchema.parse(req.body);
  const userId = authenticatedUserId(req);

  const row = await prisma.lostReport.create({
    data: {
      reporterUserId: userId,
      itemTitle: input.itemTitle,
      category: input.category,
      color: input.color,
      brand: input.brand,
      description: input.description,
      imageUrls: input.imageUrls ?? [],
      locationLost: input.locationLost,
      dateLost: input.dateLost,
      status: "open",
    },
  });

  void recomputeMatchesForLost(row.id).catch((error) => console.error("match_recompute_failed", error));
  void writeAudit(req, "lost_report.created", "lost_report", row.id, {});
  res.status(201).json({ data: lostView(row) });
});

lostReportsRouter.patch("/:id", async (req, res) => {
  const id = uuidSchema.parse(req.params.id);
  const input = lostUpdateSchema.parse(req.body);
  const userId = authenticatedUserId(req);
  const current = await prisma.lostReport.findUnique({ where: { id } });
  if (!current) throw new AppError(404, "Lost report not found.");

  const role = await roleFor(userId);
  const owner = current.reporterUserId === userId;
  if (!owner && !isStaffRole(role)) throw new AppError(403, "You cannot edit this report.");
  if (!isStaffRole(role) && input.status && !["open", "closed_unrecovered"].includes(input.status)) {
    throw new AppError(403, "Only staff can set that report status.");
  }

  const row = await prisma.lostReport.update({ where: { id }, data: input });
  if (row.status === "open") {
    void recomputeMatchesForLost(row.id).catch((error) => console.error("match_recompute_failed", error));
  }
  void writeAudit(req, "lost_report.updated", "lost_report", row.id, { status: row.status });
  res.json({ data: lostView(row) });
});

lostReportsRouter.delete("/:id", async (req, res) => {
  const id = uuidSchema.parse(req.params.id);
  const userId = authenticatedUserId(req);
  const current = await prisma.lostReport.findUnique({ where: { id } });
  if (!current) throw new AppError(404, "Lost report not found.");

  const role = await roleFor(userId);
  if (current.reporterUserId !== userId && !["admin", "super_admin"].includes(role)) {
    throw new AppError(403, "You cannot delete this report.");
  }
  if (current.status !== "open" && !["admin", "super_admin"].includes(role)) {
    throw new AppError(409, "Only open reports can be deleted by their owner.");
  }

  await prisma.lostReport.delete({ where: { id } });
  void writeAudit(req, "lost_report.deleted", "lost_report", id, {});
  res.status(204).send();
});

foundReportsRouter.get("/", async (req, res) => {
  const query = foundQuerySchema.parse(req.query);
  const userId = authenticatedUserId(req);
  const effectiveUserId = query.mine === "true" ? userId : query.userId;

  const where: Prisma.FoundReportWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(effectiveUserId ? { finderUserId: effectiveUserId } : {}),
    ...(query.from || query.to
      ? {
          dateFound: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
    ...(query.keyword
      ? {
          OR: [
            { itemTitle: { contains: query.keyword, mode: "insensitive" } },
            { description: { contains: query.keyword, mode: "insensitive" } },
            { brand: { contains: query.keyword, mode: "insensitive" } },
            { locationFound: { contains: query.keyword, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.foundReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: query.offset,
      take: query.limit,
    }),
    prisma.foundReport.count({ where }),
  ]);

  res.json({ data: { rows: rows.map(foundView), total } });
});

foundReportsRouter.get("/:id", async (req, res) => {
  const id = uuidSchema.parse(req.params.id);
  const row = await prisma.foundReport.findUnique({ where: { id } });
  if (!row) throw new AppError(404, "Found report not found.");
  res.json({ data: foundView(row) });
});

foundReportsRouter.post("/", async (req, res) => {
  const input = foundCreateSchema.parse(req.body);
  const userId = authenticatedUserId(req);

  const row = await prisma.foundReport.create({
    data: {
      finderUserId: userId,
      itemTitle: input.itemTitle,
      category: input.category,
      color: input.color,
      brand: input.brand,
      description: input.description,
      imageUrls: input.imageUrls ?? [],
      locationFound: input.locationFound,
      dateFound: input.dateFound,
      custodyLocation: input.custodyLocation,
      status: "open",
    },
  });

  void recomputeMatchesForFound(row.id).catch((error) => console.error("match_recompute_failed", error));
  void writeAudit(req, "found_report.created", "found_report", row.id, {});
  res.status(201).json({ data: foundView(row) });
});

foundReportsRouter.patch("/:id", async (req, res) => {
  const id = uuidSchema.parse(req.params.id);
  const input = foundUpdateSchema.parse(req.body);
  const userId = authenticatedUserId(req);
  const current = await prisma.foundReport.findUnique({ where: { id } });
  if (!current) throw new AppError(404, "Found report not found.");

  const role = await roleFor(userId);
  const owner = current.finderUserId === userId;
  if (!owner && !isStaffRole(role)) throw new AppError(403, "You cannot edit this report.");
  if (!isStaffRole(role) && input.status && input.status !== "open") {
    throw new AppError(403, "Only staff can set that report status.");
  }

  const row = await prisma.foundReport.update({ where: { id }, data: input });
  if (["open", "verified"].includes(row.status)) {
    void recomputeMatchesForFound(row.id).catch((error) => console.error("match_recompute_failed", error));
  }
  void writeAudit(req, "found_report.updated", "found_report", row.id, { status: row.status });
  res.json({ data: foundView(row) });
});

foundReportsRouter.delete("/:id", async (req, res) => {
  const id = uuidSchema.parse(req.params.id);
  const userId = authenticatedUserId(req);
  const current = await prisma.foundReport.findUnique({
    where: { id },
    include: { _count: { select: { claims: true } } },
  });
  if (!current) throw new AppError(404, "Found report not found.");

  const role = await roleFor(userId);
  if (current.finderUserId !== userId && !["admin", "super_admin"].includes(role)) {
    throw new AppError(403, "You cannot delete this report.");
  }
  if (current._count.claims > 0) throw new AppError(409, "A report with claims cannot be deleted.");

  await prisma.foundReport.delete({ where: { id } });
  void writeAudit(req, "found_report.deleted", "found_report", id, {});
  res.status(204).send();
});
