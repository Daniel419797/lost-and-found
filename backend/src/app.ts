import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import multer from "multer";
import { allowedOrigins, env } from "./config.js";
import { prisma } from "./lib/prisma.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { claimsRouter, handoversRouter } from "./routes/claims.js";
import { notificationsRouter } from "./routes/notifications.js";
import { foundReportsRouter, lostReportsRouter } from "./routes/reports.js";
import { uploadsRouter } from "./routes/uploads.js";

export const app = express();

if (env.TRUST_PROXY) app.set("trust proxy", 1);

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ""))) return callback(null, true);
      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "64kb" }));
app.use(cookieParser());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "lost-and-found-api" });
});

app.get("/ready", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: "ready" });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/lost-reports", lostReportsRouter);
app.use("/api/v1/found-reports", foundReportsRouter);
app.use("/api/v1/claims", claimsRouter);
app.use("/api/v1/handovers", handoversRouter);
app.use("/api/v1/notifications", notificationsRouter);
app.use("/api/v1/uploads", uploadsRouter);
app.use("/api/v1/admin", adminRouter);

app.use(notFound);

app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ message: error.message });
    return;
  }
  errorHandler(error, req, res, next);
});
