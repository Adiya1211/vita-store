import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

export async function GET() {
  const pw = process.env.DB_PASSWORD ?? "";
  const POOLER = "aws-1-ap-northeast-1.pooler.supabase.com";
  const REF = "abesrquyigzaqqizmjrn";

  try {
    const pool = new Pool({
      host: POOLER,
      port: 6543,
      database: "postgres",
      user: `postgres.${REF}`,
      password: pw,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });
    const result = await pool.query('SELECT email, role FROM "User" LIMIT 3');
    await pool.end();
    return NextResponse.json({ ok: true, users: result.rows, pw: pw.slice(0, 4) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e), pw: pw.slice(0, 4) });
  }
}
