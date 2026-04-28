import { z } from "zod";

export const PASSWORD_POLICY_HINT =
  "Use at least 12 characters with uppercase, lowercase, number, and special character.";

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const newPasswordSchema = z
  .string()
  .min(12, "New password must be at least 12 characters")
  .regex(/[a-z]/, "New password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "New password must contain at least one uppercase letter")
  .regex(/\d/, "New password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "New password must contain at least one special character");
