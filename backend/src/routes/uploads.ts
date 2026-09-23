import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Router } from "express";
import multer from "multer";
import { env, storageConfigured } from "../config.js";
import { authenticatedUserId, requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errors.js";

export const uploadsRouter = Router();
uploadsRouter.use(requireAuth);

const accepted = new Set(["image/jpeg", "image/png", "image/webp"]);
const extensionByType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!accepted.has(file.mimetype)) {
      callback(new AppError(400, "Only JPEG, PNG, and WebP images are allowed."));
      return;
    }
    callback(null, true);
  },
});

function storageClient(): S3Client {
  if (!storageConfigured) throw new AppError(503, "Image storage is not configured.");
  return new S3Client({
    endpoint: env.STORAGE_ENDPOINT,
    region: env.STORAGE_REGION,
    credentials: {
      accessKeyId: env.STORAGE_ACCESS_KEY_ID!,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY!,
    },
  });
}

uploadsRouter.post("/item-photo", upload.single("file"), async (req, res) => {
  if (!req.file) throw new AppError(400, "Image file is required.");
  if (!storageConfigured) throw new AppError(503, "Image storage is not configured.");

  const userId = authenticatedUserId(req);
  const extension = extensionByType[req.file.mimetype] ?? "bin";
  const key = `lost-and-found/${userId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;

  await storageClient().send(
    new PutObjectCommand({
      Bucket: env.STORAGE_BUCKET!,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  const base = env.STORAGE_PUBLIC_BASE_URL!.replace(/\/+$/, "");
  res.status(201).json({
    data: {
      url: `${base}/${key}`,
      fileName: key,
      contentType: req.file.mimetype,
      size: req.file.size,
    },
  });
});
