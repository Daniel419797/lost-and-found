import { createHash } from "node:crypto";
import { prisma } from "../lib/prisma.js";

const MEDIA_PUBLIC_BASE = (
  process.env.DEMO_MEDIA_PUBLIC_BASE ??
  "https://lost-and-found-backend-y9rz.onrender.com/api/v1/uploads/media"
).replace(/\/+$/, "");

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 20_000;

function id(key: string): string {
  const hex = createHash("sha256").update(`lost-found-demo:${key}`).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

type ImageSpec = {
  kind: "lost" | "found";
  key: string;
  keywords: string;
  lock: number;
};

const imageSpecs: ImageSpec[] = [
  { kind: "lost", key: "laptop", keywords: "laptop,dell", lock: 101 },
  { kind: "lost", key: "phone", keywords: "smartphone,samsung", lock: 102 },
  { kind: "lost", key: "id-card", keywords: "identity-card,badge", lock: 103 },
  { kind: "lost", key: "backpack", keywords: "backpack,bag", lock: 104 },
  { kind: "lost", key: "airpods", keywords: "earbuds,airpods", lock: 105 },
  { kind: "lost", key: "calculator", keywords: "calculator,casio", lock: 106 },
  { kind: "lost", key: "wallet", keywords: "leather-wallet,wallet", lock: 107 },
  { kind: "lost", key: "keys", keywords: "keys,keyring", lock: 108 },
  { kind: "lost", key: "textbook", keywords: "textbook,mathematics", lock: 109 },
  { kind: "lost", key: "hoodie", keywords: "black-hoodie,hoodie", lock: 110 },
  { kind: "found", key: "laptop", keywords: "dell-laptop,laptop", lock: 201 },
  { kind: "found", key: "phone", keywords: "samsung-phone,smartphone", lock: 202 },
  { kind: "found", key: "id-card", keywords: "student-id-card,badge", lock: 203 },
  { kind: "found", key: "backpack", keywords: "laptop-backpack,backpack", lock: 204 },
  { kind: "found", key: "airpods", keywords: "wireless-earbuds,earbuds", lock: 205 },
  { kind: "found", key: "wallet", keywords: "black-wallet,wallet", lock: 206 },
  { kind: "found", key: "umbrella", keywords: "red-umbrella,umbrella", lock: 207 },
  { kind: "found", key: "flash", keywords: "usb-drive,usb", lock: 208 },
  { kind: "found", key: "watch", keywords: "digital-watch,wristwatch", lock: 209 },
  { kind: "found", key: "notebook", keywords: "spiral-notebook,notebook", lock: 210 },
];

function photoUrl(keywords: string, lock: number): string {
  const encodedKeywords = keywords
    .split(",")
    .map((part) => encodeURIComponent(part))
    .join(",");
  return `https://loremflickr.com/640/480/${encodedKeywords}?lock=${lock}`;
}

function sourceUrls(spec: ImageSpec): string[] {
  const parts = spec.keywords.split(",").map((part) => part.trim()).filter(Boolean);
  const simpleKeyword = parts.at(-1) ?? spec.key;
  const label = `${spec.kind} ${spec.key}`.replace(/-/g, " ");

  return [
    photoUrl(spec.keywords, spec.lock),
    photoUrl(simpleKeyword, spec.lock + 1_000),
    `https://placehold.co/640x480/png?text=${encodeURIComponent(label)}`,
  ];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchImage(url: string): Promise<{ contentType: string; data: Uint8Array<ArrayBuffer> }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "CampusLostFoundDemoSeeder/1.0" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const rawType = response.headers.get("content-type") ?? "";
    const contentType = rawType.split(";")[0]?.trim().toLowerCase() ?? "";
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      throw new Error(`Unsupported content type: ${rawType || "missing"}`);
    }

    const downloaded = new Uint8Array(await response.arrayBuffer());
    const data = new Uint8Array(downloaded.byteLength);
    data.set(downloaded);

    if (data.byteLength === 0) throw new Error("Downloaded image is empty");
    if (data.byteLength > MAX_IMAGE_BYTES) {
      throw new Error(`Image is too large: ${data.byteLength} bytes`);
    }

    return { contentType, data };
  } finally {
    clearTimeout(timeout);
  }
}

async function downloadImage(
  spec: ImageSpec,
): Promise<{ contentType: string; data: Uint8Array<ArrayBuffer>; source: string }> {
  let lastError: unknown;

  for (const url of sourceUrls(spec)) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const result = await fetchImage(url);
        return { ...result, source: url };
      } catch (error) {
        lastError = error;
        if (attempt < 2) await sleep(800);
      }
    }
  }

  throw new Error(
    `Failed to download ${spec.kind}:${spec.key}: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

async function seedImage(spec: ImageSpec): Promise<void> {
  const reportId = id(`${spec.kind}:${spec.key}`);
  const mediaId = id(`media:${spec.kind}:${spec.key}`);

  const ownerUserId =
    spec.kind === "lost"
      ? (
          await prisma.lostReport.findUnique({
            where: { id: reportId },
            select: { reporterUserId: true },
          })
        )?.reporterUserId
      : (
          await prisma.foundReport.findUnique({
            where: { id: reportId },
            select: { finderUserId: true },
          })
        )?.finderUserId;

  if (!ownerUserId) throw new Error(`Seeded ${spec.kind} report not found: ${spec.key}`);

  const { contentType, data, source } = await downloadImage(spec);
  await prisma.mediaObject.upsert({
    where: { id: mediaId },
    create: {
      id: mediaId,
      ownerUserId,
      contentType,
      size: data.byteLength,
      data,
    },
    update: {
      ownerUserId,
      contentType,
      size: data.byteLength,
      data,
    },
  });

  const imageUrl = `${MEDIA_PUBLIC_BASE}/${mediaId}`;
  if (spec.kind === "lost") {
    await prisma.lostReport.update({ where: { id: reportId }, data: { imageUrls: [imageUrl] } });
  } else {
    await prisma.foundReport.update({ where: { id: reportId }, data: { imageUrls: [imageUrl] } });
  }

  console.log(`IMAGE_SEEDED ${spec.kind}:${spec.key} ${contentType} ${data.byteLength}B source=${source}`);
}

async function main(): Promise<void> {
  for (let index = 0; index < imageSpecs.length; index += 4) {
    await Promise.all(imageSpecs.slice(index, index + 4).map(seedImage));
    if (index + 4 < imageSpecs.length) await sleep(500);
  }

  const [lostWithImages, foundWithImages, mediaObjects] = await Promise.all([
    prisma.lostReport.count({ where: { imageUrls: { isEmpty: false } } }),
    prisma.foundReport.count({ where: { imageUrls: { isEmpty: false } } }),
    prisma.mediaObject.count(),
  ]);

  console.log(
    `DEMO_IMAGES_SEEDED=${imageSpecs.length} LOST_WITH_IMAGES=${lostWithImages} FOUND_WITH_IMAGES=${foundWithImages} MEDIA_OBJECTS=${mediaObjects}`,
  );
}

main()
  .catch((error) => {
    console.error("DEMO_IMAGE_SEED_FAILED", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
