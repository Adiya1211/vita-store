import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

async function test(label: string, config: object) {
  try {
    const pool = new Pool({ ...config, connectionTimeoutMillis: 8000 } as any);
    await pool.query("SELECT 1");
    await pool.end();
    return "OK";
  } catch (e) { return String(e); }
}

export async function GET() {
  const pw = process.env.DB_PASSWORD ?? "";
  const POOLER = "aws-0-ap-northeast-1.pooler.supabase.com";
  const REF = "abesrquyigzaqqizmjrn";

  const results = {
    // Transaction mode (6543)
    t1: await test("t1", { host: POOLER, port: 6543, database: "postgres", user: `postgres.${REF}`, password: pw, ssl: { rejectUnauthorized: false } }),
    t2: await test("t2", { host: POOLER, port: 6543, database: "postgres", user: `postgres.${REF}`, password: pw, ssl: true }),
    t3: await test("t3", { host: POOLER, port: 6543, database: "postgres", user: "postgres", password: pw, ssl: { rejectUnauthorized: false } }),
    // Session mode (5432)
    s1: await test("s1", { host: POOLER, port: 5432, database: "postgres", user: `postgres.${REF}`, password: pw, ssl: { rejectUnauthorized: false } }),
    s2: await test("s2", { host: POOLER, port: 5432, database: "postgres", user: "postgres", password: pw, ssl: { rejectUnauthorized: false } }),
  };

  return NextResponse.json({ pw: pw.slice(0, 4), results });
}
