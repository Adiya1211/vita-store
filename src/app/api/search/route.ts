import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const COLES_IMAGE_BASE = "https://cdn.productimages.coles.com.au/productimages";
const COLES_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-AU,en;q=0.9",
  "Accept-Encoding": "identity",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-User": "?1",
  "Sec-Fetch-Dest": "document",
  "Upgrade-Insecure-Requests": "1",
};

export interface SearchResult {
  id: string;
  name: string;
  brand: string | null;
  dosage: string | null;
  imageUrl: string | null;
  costPrice: number | null;
  colesUrl: string | null;
}

function parseColesResults(html: string): SearchResult[] {
  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );
  if (!nextDataMatch) return [];

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(nextDataMatch[1]);
  } catch {
    return [];
  }

  function findResults(obj: unknown, depth = 0): Record<string, unknown>[] | null {
    if (depth > 10) return null;
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      const o = obj as Record<string, unknown>;
      if (Array.isArray(o.results) && o.results.length > 0) return o.results as Record<string, unknown>[];
      for (const v of Object.values(o)) {
        const r = findResults(v, depth + 1);
        if (r) return r;
      }
    } else if (Array.isArray(obj)) {
      for (const item of obj) {
        const r = findResults(item, depth + 1);
        if (r) return r;
      }
    }
    return null;
  }

  const results = findResults(data);
  if (!results || results.length === 0) return [];

  return results.slice(0, 12).map((p) => {
    const name = (p.name as string) || "";
    const brand = (p.brand as string) || null;
    const size = (p.size as string) || null;
    const id = p.id as string | number;
    const pricing = p.pricing as Record<string, unknown> | undefined;
    const costPrice = pricing?.now ? Number(pricing.now) : null;

    const imageUrl = id
      ? `${COLES_IMAGE_BASE}/${String(id)[0]}/${id}.jpg`
      : null;

    const slugParts = [
      name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      String(id),
    ].filter(Boolean);
    const colesUrl = id ? `https://www.coles.com.au/product/${slugParts.join("-")}` : null;

    return { id: String(id), name, brand, dosage: size, imageUrl, costPrice, colesUrl };
  }).filter((r) => r.name);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  try {
    const url = `https://www.coles.com.au/search?q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: COLES_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return NextResponse.json([]);
    const html = await res.text();
    const results = parseColesResults(html);
    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
