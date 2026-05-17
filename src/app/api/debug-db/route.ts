import { NextResponse } from "next/server";
import { Pool } from "pg";

async function testConn(host: string, port: number, user: string, password: string) {
  try {
    const pool = new Pool({
      host, port, database: "postgres", user, password,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 6000,
    });
    await pool.query("SELECT 1");
    await pool.end();
    return "OK";
  } catch (err) {
    return String(err);
  }
}

export async function GET() {
  const pw1 = process.env.DB_PASSWORD ?? "";           // VitaStore2026
  const pw2 = "B&T_0812!!Supabase";                   // хуучин нууц үг

  const results = {
    // vita-store-production (abesrquyigzaqqizmjrn)
    prod_direct:   await testConn("db.abesrquyigzaqqizmjrn.supabase.co",  5432, "postgres", pw1),
    prod_pooler:   await testConn("aws-0-ap-northeast-1.pooler.supabase.com", 6543, "postgres.abesrquyigzaqqizmjrn", pw1),
    // vitamin-store (yipquvzjesnqrrvrsghg)
    dev_direct:    await testConn("db.yipquvzjesnqrrvrsghg.supabase.co",  5432, "postgres", pw2),
    dev_pooler:    await testConn("aws-0-ap-south-1.pooler.supabase.com", 6543, "postgres.yipquvzjesnqrrvrsghg", pw2),
  };

  return NextResponse.json({ pw1Len: pw1.length, results });
}
