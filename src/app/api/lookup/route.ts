import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const COLES_IMAGE_BASE = "https://cdn.productimages.coles.com.au/productimages";
const COLES_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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

interface ColesProduct {
  name: string | null;
  brand: string | null;
  dosage: string | null;
  imageUrl: string | null;
  costPrice: number | null;
  colesUrl: string | null;
}

function parseColesHtml(html: string): ColesProduct | null {
  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );
  if (!nextDataMatch) return null;

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(nextDataMatch[1]);
  } catch {
    return null;
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
  if (!results || results.length === 0) return null;

  const p = results[0];
  const name = (p.name as string) || null;
  const brand = (p.brand as string) || null;
  const size = (p.size as string) || null;
  const id = p.id as string | number;
  const pricing = p.pricing as Record<string, unknown> | undefined;
  const costPrice = pricing?.now ? Number(pricing.now) : null;

  // Зургийн URL: id-н эхний тэмдэгт нь директор болдог
  const imageUrl = id
    ? `${COLES_IMAGE_BASE}/${String(id)[0]}/${id}.jpg`
    : null;

  // Бүтээгдэхүүний URL
  const slugParts = [
    name?.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    String(id),
  ].filter(Boolean);
  const colesUrl = id ? `https://www.coles.com.au/product/${slugParts.join("-")}` : null;

  return { name, brand, dosage: size, imageUrl, costPrice, colesUrl };
}

async function searchColes(query: string): Promise<ColesProduct | null> {
  try {
    const url = `https://www.coles.com.au/search?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: COLES_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return parseColesHtml(html);
  } catch {
    return null;
  }
}

interface OFFResult {
  name: string | null;
  brand: string | null;
  dosage: string | null;
  imageUrl: string | null;
}

async function fetchFromOpenFoodFacts(barcode: string): Promise<OFFResult | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    return {
      name: p.product_name_en || p.product_name || null,
      brand: p.brands?.split(",")[0]?.trim() || null,
      dosage: p.quantity || null,
      imageUrl: p.image_url || null,
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const barcode = req.nextUrl.searchParams.get("barcode");
  if (!barcode?.trim()) {
    return NextResponse.json({ error: "Barcode шаардлагатай" }, { status: 400 });
  }

  // Алхам 0: Кэшээс хайх
  const cached = await prisma.barcodeCache.findUnique({ where: { barcode } });
  if (cached && (cached.name || cached.brand)) {
    return NextResponse.json({
      found: true,
      barcode,
      name: cached.name,
      brand: cached.brand,
      dosage: cached.dosage,
      imageUrl: cached.imageUrl,
      costPrice: cached.costPrice,
      colesUrl: cached.colesUrl,
      source: "cache",
    });
  }

  // Алхам 1: Barcode-аар Coles-с хайх
  let colesResult = await searchColes(barcode);

  // Алхам 2: Хэрэв Coles хоосон буцаасан → Open Food Facts-аас нэр авах
  let offResult: OFFResult | null = null;
  if (!colesResult?.name) {
    offResult = await fetchFromOpenFoodFacts(barcode);

    // Алхам 3: OFF-с нэр авсан бол тэр нэрээр Coles-с дахин хайх
    if (offResult?.name) {
      const searchTerm = [offResult.brand, offResult.name].filter(Boolean).join(" ");
      colesResult = await searchColes(searchTerm);
    }
  }

  // Эцсийн үр дүн нэгтгэх — Coles-д priority
  const name = colesResult?.name || offResult?.name || null;
  const brand = colesResult?.brand || offResult?.brand || null;
  const dosage = colesResult?.dosage || offResult?.dosage || null;
  const imageUrl = colesResult?.imageUrl || offResult?.imageUrl || null;
  const costPrice = colesResult?.costPrice ?? null;
  const colesUrl = colesResult?.colesUrl ?? null;

  const source = colesResult?.name
    ? "coles"
    : offResult?.name
    ? "openfoodfacts"
    : "not_found";

  if (!name && !brand) {
    return NextResponse.json({ found: false, barcode });
  }

  return NextResponse.json({
    found: true,
    barcode,
    name,
    brand,
    dosage,
    imageUrl,
    costPrice,
    colesUrl,
    source,
  });
}
