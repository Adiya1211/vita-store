import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// postgresql://user:password@host:port/db — & тэмдэгтийг зөв задална
function parseDbUrl(url: string) {
  const schemeEnd = url.indexOf("://") + 3;
  const atIdx = url.lastIndexOf("@");
  const userPass = url.slice(schemeEnd, atIdx);
  const hostDb = url.slice(atIdx + 1);
  const colonIdx = userPass.indexOf(":");
  const user = userPass.slice(0, colonIdx);
  const password = userPass.slice(colonIdx + 1);
  const slashIdx = hostDb.indexOf("/");
  const hostPort = hostDb.slice(0, slashIdx);
  const database = hostDb.slice(slashIdx + 1).split("?")[0];
  const hpColon = hostPort.lastIndexOf(":");
  const host = hpColon >= 0 ? hostPort.slice(0, hpColon) : hostPort;
  const port = hpColon >= 0 ? parseInt(hostPort.slice(hpColon + 1)) : 5432;
  return { user, password, host, port, database };
}

function createPrisma() {
  const rawUrl = process.env.DATABASE_URL ?? "";
  const parsed = parseDbUrl(rawUrl);

  const pool = new Pool({
    host: parsed.host,
    port: parsed.port,
    database: parsed.database,
    user: parsed.user,
    password: parsed.password,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    max: process.env.NODE_ENV === "production" ? 1 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
