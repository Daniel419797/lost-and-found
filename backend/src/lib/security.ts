import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Response } from "express";
import { env } from "../config.js";
import { prisma } from "./prisma.js";

const BCRYPT_ROUNDS = 12;
const ACCESS_ISSUER = "lost-and-found-api";
const ACCESS_AUDIENCE = "lost-and-found-web";

export async function hashPassword(password: string): Promise<string> {
  if (bcrypt.truncates(password)) throw new Error("Password is too long for bcrypt");
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (bcrypt.truncates(password)) return false;
  return bcrypt.compare(password, hash);
}

export function signAccessToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    issuer: ACCESS_ISSUER,
    audience: ACCESS_AUDIENCE,
    expiresIn: env.ACCESS_TOKEN_MINUTES * 60,
    algorithm: "HS256",
  });
}

export function verifyAccessToken(token: string): string {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    issuer: ACCESS_ISSUER,
    audience: ACCESS_AUDIENCE,
    algorithms: ["HS256"],
  }) as JwtPayload;

  if (!decoded.sub) throw new Error("Token subject missing");
  return decoded.sub;
}

export function newRefreshToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function refreshExpiry(): Date {
  return new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(env.COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: "/api/v1/auth",
    maxAge: env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(env.COOKIE_NAME, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: "/api/v1/auth",
  });
}

export async function createRefreshSession(userId: string): Promise<string> {
  const token = newRefreshToken();
  await prisma.refreshSession.create({
    data: {
      userId,
      tokenHash: hashRefreshToken(token),
      expiresAt: refreshExpiry(),
    },
  });
  return token;
}

export async function rotateRefreshSession(token: string): Promise<{ userId: string; newToken: string }> {
  const tokenHash = hashRefreshToken(token);

  return prisma.$transaction(async (tx) => {
    const session = await tx.refreshSession.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, revokedAt: true },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new Error("Invalid refresh session");
    }

    const revoked = await tx.refreshSession.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (revoked.count !== 1) throw new Error("Refresh session already rotated");

    const newToken = newRefreshToken();
    await tx.refreshSession.create({
      data: {
        userId: session.userId,
        tokenHash: hashRefreshToken(newToken),
        expiresAt: refreshExpiry(),
      },
    });

    return { userId: session.userId, newToken };
  });
}

export async function revokeRefreshSession(token: string | undefined): Promise<void> {
  if (!token) return;
  await prisma.refreshSession.updateMany({
    where: { tokenHash: hashRefreshToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
