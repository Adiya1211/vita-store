import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join } from "path";

// Shell-д dotenvx байвал ANTHROPIC_API_KEY-г хоослодог тул .env-с шууд унших
function getAnthropicKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (key && key.length > 10) return key;
  try {
    const content = readFileSync(join(process.cwd(), ".env"), "utf8");
    const match = content.match(/^ANTHROPIC_API_KEY="?([^"\n\r]+)"?\s*$/m);
    return match?.[1] ?? "";
  } catch {
    return "";
  }
}

function productKey(brand: string, name: string, dosage?: string | null) {
  return `${brand}||${name}||${dosage ?? ""}`.toLowerCase();
}

// GET — кэш байгаа бол буцаах
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const brand  = searchParams.get("brand")  ?? "";
    const name   = searchParams.get("name")   ?? "";
    const dosage = searchParams.get("dosage") ?? "";

    const key = productKey(brand, name, dosage);
    const cached = await prisma.productBrochure.findUnique({ where: { productKey: key } });

    if (cached) return NextResponse.json(cached);
    return NextResponse.json({ notFound: true });
  } catch (err) {
    console.error("Brochure GET error:", err);
    return NextResponse.json({ error: "Серверийн алдаа" }, { status: 500 });
  }
}

// POST — Claude AI-аар үүсгэж хадгалах
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { brand, name, dosage, regenerate } = body;

    if (!brand || !name) return NextResponse.json({ error: "brand, name шаардлагатай" }, { status: 400 });

    const key = productKey(brand, name, dosage);

    // Кэш байвал, regenerate биш бол буцаах
    if (!regenerate) {
      const cached = await prisma.productBrochure.findUnique({ where: { productKey: key } });
      if (cached) return NextResponse.json(cached);
    }

    // Claude AI дуудах
    const apiKey = getAnthropicKey();
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY тохируулагдаагүй байна" }, { status: 500 });
    }
    const client = new Anthropic({ apiKey });

    const prompt = `Та витаминий мэргэжилтэн байна. Дараах витаминий талаар монгол хэлээр мэдээлэл бичнэ үү.

Бүтээгдэхүүн: ${brand} ${name}${dosage ? ` (${dosage})` : ""}

Дараах форматаар JSON буцаана уу (өөр юм бичихгүй, зөвхөн JSON):
{
  "description": "2-3 өгүүлбэрийн товч тайлбар",
  "benefits": [
    "Ашиг тус 1",
    "Ашиг тус 2",
    "Ашиг тус 3",
    "Ашиг тус 4"
  ],
  "usage": "Хэрэглэх заавар — хэн хэрэглэх, хэдэн ширхэг, хэзээ уух"
}

Монгол хэлээр, товч тодорхой бичнэ үү.`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (message.content[0] as { type: string; text: string }).text.trim();

    // JSON parse
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "AI хариу буруу форматтай" }, { status: 500 });

    const parsed = JSON.parse(jsonMatch[0]);

    // DB-д хадгалах (upsert)
    const brochure = await prisma.productBrochure.upsert({
      where: { productKey: key },
      update: {
        benefits: parsed.benefits,
        usage: parsed.usage,
        description: parsed.description,
      },
      create: {
        id: crypto.randomUUID(),
        productKey: key,
        brand,
        name,
        dosage: dosage || null,
        benefits: parsed.benefits,
        usage: parsed.usage,
        description: parsed.description,
      },
    });

    return NextResponse.json(brochure);
  } catch (err) {
    console.error("Brochure POST error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
