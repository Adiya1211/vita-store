import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const COLES_IMAGE_BASE = "https://cdn.productimages.coles.com.au/productimages";

function extractColesId(url: string): string | null {
  // https://cdn.productimages.coles.com.au/productimages/3/3788087.jpg
  const cdnMatch = url.match(/productimages\/\d\/(\d+)\.jpg/);
  if (cdnMatch) return cdnMatch[1];
  // https://www.coles.com.au/product/some-slug-3788087
  const pageMatch = url.match(/coles\.com\.au\/product\/[^?#]+-(\d+)/);
  if (pageMatch) return pageMatch[1];
  return null;
}

async function probeColesImages(productId: string): Promise<string[]> {
  const base = `${COLES_IMAGE_BASE}/${productId[0]}`;

  // Coles зурагнуудын нэршлийн хэв маяг: {id}.jpg, {id}-2.jpg, {id}-3.jpg ...
  const candidates = [
    `${base}/${productId}.jpg`,
    `${base}/${productId}-2.jpg`,
    `${base}/${productId}-3.jpg`,
    `${base}/${productId}-4.jpg`,
    `${base}/${productId}-5.jpg`,
    `${base}/${productId}-6.jpg`,
  ];

  const checks = await Promise.allSettled(
    candidates.map((url) =>
      fetch(url, { method: "HEAD", signal: AbortSignal.timeout(4000) })
        .then((r) => (r.ok ? url : null))
        .catch(() => null)
    )
  );

  return checks
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter(Boolean) as string[];
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const imageUrl = req.nextUrl.searchParams.get("imageUrl");
  const colesUrl = req.nextUrl.searchParams.get("colesUrl");

  const sourceUrl = colesUrl || imageUrl;
  if (!sourceUrl) return NextResponse.json([]);

  const productId = extractColesId(sourceUrl);

  // Coles бүтээгдэхүүн биш бол зургийг нь шууд буцаана
  if (!productId) return NextResponse.json(imageUrl ? [imageUrl] : []);

  const images = await probeColesImages(productId);
  return NextResponse.json(
    images.length > 0
      ? images
      : [`${COLES_IMAGE_BASE}/${productId[0]}/${productId}.jpg`]
  );
}
