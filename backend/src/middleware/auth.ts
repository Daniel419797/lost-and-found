import type { NextFunction, Request, RequestHandler, Response } from "express";
import { writeAudit } from "../lib/audit.js";
import { prisma } from "../lib/prisma.js";
import { verifyAccessToken } from "../lib/security.js";

export interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
    role?: string;
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    void writeAudit(req, "security.unauthorized", "request", req.originalUrl, { reason: "missing_token" });
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  try {
    const userId = verifyAccessToken(token);
    (req as AuthenticatedRequest).auth = { userId };
    next();
  } catch {
    void writeAudit(req, "security.unauthorized", "request", req.originalUrl, { reason: "invalid_token" });
    res.status(401).json({ message: "Invalid or expired access token." });
  }
}

export function requireRoles(...roles: string[]): RequestHandler {
  return async (req, res, next) => {
    const auth = (req as AuthenticatedRequest).auth;
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { role: true },
    });

    if (!user || !roles.includes(user.role)) {
      void writeAudit(req, "security.forbidden", "request", req.originalUrl, {
        requiredRoles: roles,
        actualRole: user?.role ?? null,
      });
      res.status(403).json({ message: "You do not have permission to perform this action." });
      return;
    }

    auth.role = user.role;
    next();
  };
}

export function authenticatedUserId(req: Request): string {
  return (req as AuthenticatedRequest).auth.userId;
}
