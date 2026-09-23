import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(72, "Password must be 72 characters or fewer")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const itemCategorySchema = z.enum([
  "Electronics",
  "Clothing",
  "Accessories",
  "Documents",
  "Keys",
  "Bags",
  "Sports",
  "Books",
  "Food",
  "Other",
]);

export const lostStatusSchema = z.enum(["open", "matched", "recovered", "closed_unrecovered"]);
export const foundStatusSchema = z.enum(["open", "claimed", "verified", "closed"]);
export const claimStatusSchema = z.enum(["pending", "under_review", "approved", "rejected", "completed"]);

export const uuidSchema = z.string().uuid();
