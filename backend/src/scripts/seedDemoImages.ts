import { createHash } from "node:crypto";
import { prisma } from "../lib/prisma.js";

const MEDIA_PUBLIC_BASE = (
  process.env.DEMO_MEDIA_PUBLIC_BASE ??
  "https://lost-and-found-backend-y9rz.onrender.com/api/v1/uploads/media"
).replace(/\/+$/, "");

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 25_000;

function id(key: string): string {
  const hex = createHash("sha256").update(`lost-found-demo:${key}`).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

type ImageSpec = {
  kind: "lost" | "found";
  key: string;
  source: string;
};

function unsplash(path: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `https://images.unsplash.com/${path}${separator}auto=format&fit=crop&fm=jpg&q=78&w=900`;
}

const sources = {
  laptop: unsplash("photo-1575320854760-bfffc3550640"),
  phone: unsplash("photo-1657731739322-409509986567"),
  idCard: unsplash("photo-1783120947325-56ae2d32b98e"),
  backpack: unsplash("photo-1560892000-4a61808f1940"),
  airpods: unsplash("photo-1783890848515-c0dc28b25ef2"),
  calculator: unsplash("photo-1653074281018-c08f358059ab"),
  wallet: unsplash("photo-1658255307973-1a3aab57a539"),
  keys: unsplash("photo-1759428679273-11d914866394"),
  textbook: unsplash("3/alejandroescamilla-book.jpg"),
  hoodie: unsplash("photo-1499972777470-6a932ea55420"),
  umbrella: unsplash("photo-1612170482263-b7e393c4e87f"),
  flash: unsplash("photo-1785140629042-9591a9813246"),
  watch: unsplash("photo-1622299355484-f81b9f4fa5e8"),
  notebook: unsplash("photo-1523635050353-f5b60dafa07c"),
} as const;

const imageSpecs: ImageSpec[] = [
  { kind: "lost", key: "laptop", source: sources.laptop },
  { kind: "lost", key: "phone", source: sources.phone },
  { kind: "lost", key: "id-card", source: sources.idCard },
  { kind: "lost", key: "backpack", source: sources.backpack },
  { kind: "lost", key: "airpods", source: sources.airpods },
  { kind: "lost", key: "calculator", source: sources.calculator },
  { kind: "lost", key: "wallet", source: sources.wallet },
  { kind: "lost", key: "keys", source: sources.keys },
  { kind: "lost", key: "textbook", source: sources.textbook },
  { kind: "lost", key: "hoodie", source: sources.hoodie },
  { kind: "found", key: "laptop", source: sources.laptop },
  { kind: "found", key: "phone", source: sources.phone },
  { kind: "found", key: "id-card", source: sources.idCard },
  { kind: "found", key: "backpack", source: sources.backpack },
  { kind: "found", key: "airpods", source: sources.airpods },
  { kind: "found", key: "wallet", source: sources.wallet },
  { kind: "found", key: "umbrella", source: sources.umbrella },
  { kind: "found", key: "flash", source: sources.flash },
  { kind: "found", key: "watch", source: sources.watch },
  { kind: "found", key: "notebook", source: sources.notebook },
];

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
      headers: {
        "User-Agent": "CampusLostFoundDemoSeeder/1.0",
        Accept: "image/avif,image/webp,image/jpeg,image/png,*/*",
      },
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

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const result = await fetchImage(spec.source);
      return { ...result, source: spec.source };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(attempt * 1_000);
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
    if (index + 4 < imageSpecs.length) await sleep(400);
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
