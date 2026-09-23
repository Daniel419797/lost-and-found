import { env } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/security.js";
import { passwordSchema } from "../validation.js";

async function main() {
  const email = env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = env.ADMIN_BOOTSTRAP_PASSWORD;
  const displayName = env.ADMIN_BOOTSTRAP_NAME?.trim() || "System Administrator";

  if (!email || !password) {
    throw new Error(
      "ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD are required for admin bootstrap.",
    );
  }

  passwordSchema.parse(password);
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      displayName,
      passwordHash,
      role: "super_admin",
    },
    update: {
      displayName,
      passwordHash,
      role: "super_admin",
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
    },
  });

  console.log(`Super administrator ready: ${user.email} (${user.id})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
