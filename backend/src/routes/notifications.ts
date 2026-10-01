import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticatedUserId, requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errors.js";
import { uuidSchema } from "../validation.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

function notificationView(row: {
  id: string;
  recipientUserId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  metaJson: unknown;
  createdAt: Date;
}) {
  return {
    id: row.id,
    recipient_user_id: row.recipientUserId,
    type: row.type,
    title: row.title,
    body: row.body,
    is_read: row.isRead,
    meta_json: row.metaJson,
    created_at: row.createdAt.toISOString(),
  };
}

notificationsRouter.get("/", async (req, res) => {
  const query = z
    .object({
      status: z.enum(["read", "unread", "all"]).default("all"),
      limit: z.coerce.number().int().min(1).max(200).default(100),
      offset: z.coerce.number().int().min(0).default(0),
    })
    .parse(req.query);
  const userId = authenticatedUserId(req);

  const where = {
    recipientUserId: userId,
    ...(query.status === "read" ? { isRead: true } : {}),
    ...(query.status === "unread" ? { isRead: false } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.notification.count({ where }),
  ]);

  res.json({ data: { rows: rows.map(notificationView), total } });
});

notificationsRouter.patch("/:id/read", async (req, res) => {
  const id = uuidSchema.parse(req.params.id);
  const userId = authenticatedUserId(req);
  const current = await prisma.notification.findFirst({ where: { id, recipientUserId: userId } });
  if (!current) throw new AppError(404, "Notification not found.");

  const notification = current.isRead
    ? current
    : await prisma.notification.update({ where: { id }, data: { isRead: true } });

  res.json({
    data: {
      notification: notificationView(notification),
      idempotent: current.isRead,
    },
  });
});

notificationsRouter.patch("/mark-all-read", async (req, res) => {
  const userId = authenticatedUserId(req);
  const result = await prisma.notification.updateMany({
    where: { recipientUserId: userId, isRead: false },
    data: { isRead: true },
  });
  res.json({ data: { updated_count: result.count } });
});
