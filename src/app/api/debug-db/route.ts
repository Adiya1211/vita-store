import { NextResponse } from "next/server";
import { Pool } from "pg";
import dns from "dns/promises";

export const runtime = "nodejs";

export async function GET() {
  const results: Record<string, string> = {};

  // 1. DNS шалгах
  try {
    const addrs = await dns.resolve4("db.abesrquyigzaqqizmjrn.supabase.co");
    results.dns_prod = `OK: ${addrs.join(",")}`;
  } catch (e) { results.dns_prod = String(e); }

  try {
    const addrs = await dns.resolve4("google.com");
    results.dns_google = `OK: ${addrs[0]}`;
  } catch (e) { results.dns_google = String(e); }

  // 2. HTTP fetch шалгах
  try {
    const r = await fetch("https://httpbin.org/ip", { signal: AbortSignal.timeout(5000) });
    const data = await r.json();
    results.http_fetch = `OK: ${JSON.stringify(data)}`;
  } catch (e) { results.http_fetch = String(e); }

  // 3. Supabase REST API (HTTP) шалгах
  try {
    const r = await fetch("https://abesrquyigzaqqizmjrn.supabase.co/rest/v1/", {
      headers: { apikey: "anon" },
      signal: AbortSignal.timeout(5000),
    });
    results.supabase_http = `status: ${r.status}`;
  } catch (e) { results.supabase_http = String(e); }

  // 4. pg холболт
  try {
    const pool = new Pool({
      host: "db.abesrquyigzaqqizmjrn.supabase.co",
      port: 5432,
      database: "postgres",
      user: "postgres",
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 6000,
    });
    await pool.query("SELECT 1");
    await pool.end();
    results.pg = "OK";
  } catch (e) { results.pg = String(e); }

  return NextResponse.json(results);
}
