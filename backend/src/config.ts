import "dotenv/config";
import { z } from "zod";

const booleanString = z.enum(["true", "false"]).transform((value) => value === "true");
const optionalUrl = z.string().trim().url().optional().or(z.literal("").transform(() => undefined));
const optionalText = z.string().trim().min(1).optional().or(z.literal("").transform(() => undefined));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(64),
  ACCESS_TOKEN_MINUTES: z.coerce.number().int().min(1).max(60).default(15),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  CORS_ORIGIN: z.string().min(1),
  COOKIE_NAME: z.string().min(1).default("lost_found_refresh"),
  COOKIE_SECURE: booleanString.default(false),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  TRUST_PROXY: booleanString.default(false),
  BOOTSTRAP_SUPER_ADMIN_EMAIL: optionalText,
  STORAGE_ENDPOINT: optionalUrl,
  STORAGE_REGION: z.string().trim().min(1).default("auto"),
  STORAGE_BUCKET: optionalText,
  STORAGE_ACCESS_KEY_ID: optionalText,
  STORAGE_SECRET_ACCESS_KEY: optionalText,
  STORAGE_PUBLIC_BASE_URL: optionalUrl,
});

export const env = envSchema.parse(process.env);

export const allowedOrigins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

export const storageConfigured = Boolean(
  env.STORAGE_ENDPOINT &&
    env.STORAGE_BUCKET &&
    env.STORAGE_ACCESS_KEY_ID &&
    env.STORAGE_SECRET_ACCESS_KEY &&
    env.STORAGE_PUBLIC_BASE_URL,
);
