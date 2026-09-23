import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { env } from "../config.js";
import { writeAudit } from "../lib/audit.js";
import { prisma } from "../lib/prisma.js";
import {
  clearRefreshCookie,
  createRefreshSession,
  hashPassword,
  revokeRefreshSession,
  rotateRefreshSession,
  setRefreshCookie,
  signAccessToken,
  verifyPassword,
} from "../lib/security.js";
import { authenticatedUserId, requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errors.js";
import { passwordSchema } from "../validation.js";

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

const registerSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  password: passwordSchema,
});

const loginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(72),
});

const updateProfileSchema = z
  .object({
    displayName: z.string().trim().min(2).max(120).optional(),
    currentPassword: z.string().min(1).max(72).optional(),
    newPassword: passwordSchema.optional(),
  })
  .refine((value) => !value.newPassword || Boolean(value.currentPassword), {
    message: "Current password is required to change your password.",
    path: ["currentPassword"],
  });

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function userView(user: {
  id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

authRouter.post("/register", authLimiter, async (req, res) => {
  const input = registerSchema.parse(req.body);
  const email = normalizeEmail(input.email);

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new AppError(409, "An account with that email already exists.");

  const bootstrapEmail = env.BOOTSTRAP_SUPER_ADMIN_EMAIL?.toLowerCase();
  const role = bootstrapEmail && bootstrapEmail === email ? "super_admin" : "student";

  const user = await prisma.user.create({
    data: {
      email,
      displayName: input.displayName,
      passwordHash: await hashPassword(input.password),
      role,
    },
  });

  void writeAudit(req, "auth.register", "user", user.id, { email: user.email, role: user.role });
  res.status(201).json({ data: userView(user), message: "Account created." });
});

authRouter.post("/login", loginLimiter, async (req, res) => {
  const input = loginSchema.parse(req.body);
  const email = normalizeEmail(input.email);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
    void writeAudit(req, "security.login_failed", "user", undefined, { email });
    throw new AppError(401, "Invalid email or password.");
  }

  const refreshToken = await createRefreshSession(user.id);
  setRefreshCookie(res, refreshToken);

  void writeAudit(req, "auth.login", "user", user.id, {});
  res.json({
    data: {
      token: signAccessToken(user.id),
      user: userView(user),
    },
    message: "Signed in.",
  });
});

authRouter.post("/refresh", authLimiter, async (req, res) => {
  const currentToken = req.cookies?.[env.COOKIE_NAME] as string | undefined;
  if (!currentToken) throw new AppError(401, "Refresh session is missing.");

  try {
    const { userId, newToken } = await rotateRefreshSession(currentToken);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    setRefreshCookie(res, newToken);
    res.json({
      data: {
        token: signAccessToken(user.id),
        user: userView(user),
      },
    });
  } catch {
    clearRefreshCookie(res);
    throw new AppError(401, "Refresh session is invalid or expired.");
  }
});

authRouter.post("/logout", async (req, res) => {
  const token = req.cookies?.[env.COOKIE_NAME] as string | undefined;
  await revokeRefreshSession(token);
  clearRefreshCookie(res);
  res.status(204).send();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: authenticatedUserId(req) } });
  if (!user) throw new AppError(404, "User not found.");
  res.json({ data: userView(user) });
});

authRouter.patch("/me", requireAuth, async (req, res) => {
  const input = updateProfileSchema.parse(req.body);
  const userId = authenticatedUserId(req);
  const current = await prisma.user.findUnique({ where: { id: userId } });
  if (!current) throw new AppError(404, "User not found.");

  let passwordHash: string | undefined;
  if (input.newPassword) {
    if (!current.passwordHash || !input.currentPassword) {
      throw new AppError(400, "Current password is required.");
    }
    const valid = await verifyPassword(input.currentPassword, current.passwordHash);
    if (!valid) throw new AppError(400, "Current password is incorrect.");
    passwordHash = await hashPassword(input.newPassword);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
      ...(passwordHash ? { passwordHash } : {}),
    },
  });

  if (passwordHash) {
    await prisma.refreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    const refreshToken = await createRefreshSession(userId);
    setRefreshCookie(res, refreshToken);
  }

  void writeAudit(req, "auth.profile_updated", "user", userId, {
    displayNameChanged: input.displayName !== undefined,
    passwordChanged: Boolean(passwordHash),
  });
  res.json({ data: userView(user) });
});

authRouter.delete("/me", requireAuth, async (req, res) => {
  const userId = authenticatedUserId(req);
  await prisma.user.delete({ where: { id: userId } });
  clearRefreshCookie(res);
  res.status(204).send();
});
