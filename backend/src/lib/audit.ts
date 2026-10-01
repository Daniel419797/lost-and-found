import type { Request } from "express";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";

type AuthShape = { auth?: { userId?: string } };

export async function writeAudit(
  req: Request,
  action: string,
  resource?: string,
  resourceId?: string,
  details: Prisma.InputJsonValue = {},
): Promise<void> {
  const userId = (req as Request & AuthShape).auth?.userId ?? null;
  const forwarded = req.header("x-forwarded-for")?.split(",")[0]?.trim();
  const ipAddress = forwarded || req.ip || null;
  const userAgent = req.header("user-agent") || null;

  try {
    await prisma.auditLog.create({
      data: {
        action,
        resource: resource ?? null,
        resourceId: resourceId ?? null,
        details,
        userId,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error("audit_write_failed", error);
  }
}
