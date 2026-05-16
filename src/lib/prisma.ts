import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrisma() {
  // DATABASE_URL дотор & зэрэг тусгай тэмдэгт байвал password-г тусад нь авна
  const rawUrl = process.env.DATABASE_URL ?? "";
  let poolConfig: ConstructorParameters<typeof Pool>[0];

  try {
    const url = new URL(rawUrl);
    poolConfig = {
      host: url.hostname,
      port: Number(url.port) || 5432,
      database: url.pathname.replace(/^\//, ""),
      user: url.username,
      password: decodeURIComponent(url.password),
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    };
  } catch {
    poolConfig = { connectionString: rawUrl };
  }

  const pool = new Pool({
    ...poolConfig,
    max: process.env.NODE_ENV === "production" ? 1 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
