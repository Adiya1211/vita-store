import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrisma() {
  // Production: pooler (IPv4) ашиглана — Vercel serverless-д тохиромжтой
  const pool = process.env.DB_PASSWORD
    ? new Pool({
        host: "aws-1-ap-northeast-1.pooler.supabase.com",
        port: 6543,
        database: "postgres",
        user: "postgres.abesrquyigzaqqizmjrn",
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false },
        max: process.env.NODE_ENV === "production" ? 1 : 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      })
    : new Pool({
        connectionString: process.env.DATABASE_URL,
        max: process.env.NODE_ENV === "production" ? 1 : 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
