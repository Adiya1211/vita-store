import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET() {
  const dbPassword = process.env.DB_PASSWORD ?? "";

  // Pooler холболт туршина (Vercel serverless-д тохиромжтой)
  const results: Record<string, string> = {};

  // 1. Direct connection
  try {
    const pool = new Pool({
      host: "db.abesrquyigzaqqizmjrn.supabase.co",
      port: 5432,
      database: "postgres",
      user: "postgres",
      password: dbPassword,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 6000,
    });
    await pool.query("SELECT 1");
    await pool.end();
    results.direct = "OK";
  } catch (err) {
    results.direct = String(err);
  }

  // 2. Pooler connection (Transaction mode - port 6543)
  try {
    const pool = new Pool({
      host: "aws-0-ap-northeast-1.pooler.supabase.com",
      port: 6543,
      database: "postgres",
      user: `postgres.abesrquyigzaqqizmjrn`,
      password: dbPassword,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 6000,
    });
    await pool.query("SELECT 1");
    await pool.end();
    results.pooler = "OK";
  } catch (err) {
    results.pooler = String(err);
  }

  return NextResponse.json({ pwLen: dbPassword.length, pwFirst3: dbPassword.slice(0, 3), results });
}
