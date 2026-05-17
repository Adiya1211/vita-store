import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET() {
  const dbPassword = process.env.DB_PASSWORD ?? "";
  const dbUrl = process.env.DATABASE_URL ?? "";

  try {
    const pool = new Pool({
      host: "db.abesrquyigzaqqizmjrn.supabase.co",
      port: 5432,
      database: "postgres",
      user: "postgres",
      password: dbPassword,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });
    const result = await pool.query('SELECT email, "isActive", role FROM "User" LIMIT 5');
    await pool.end();
    return NextResponse.json({
      ok: true,
      users: result.rows,
      pwLen: dbPassword.length,
      urlLen: dbUrl.length,
      pwFirst3: dbPassword.slice(0, 3),
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: String(err),
      pwLen: dbPassword.length,
      urlLen: dbUrl.length,
      pwFirst3: dbPassword.slice(0, 3),
    });
  }
}
