import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrisma() {
  // DB_PASSWORD тусад нь байвал ашиглана (& зэрэг тусгай тэмдэгтийг зөв дамжуулна)
  const pool = process.env.DB_PASSWORD
    ? new Pool({
        host: "db.abesrquyigzaqqizmjrn.supabase.co",
        port: 5432,
        database: "postgres",
        user: "postgres",
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
