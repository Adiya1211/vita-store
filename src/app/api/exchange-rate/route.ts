import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "exchange_rate" } });
    if (setting) {
      return NextResponse.json({
        rate: Number(setting.value),
        date: setting.updatedAt.toISOString().split("T")[0],
        source: "manual",
      });
    }
  } catch { /* Setting хүснэгт байхгүй */ }

  // Тохируулаагүй бол 0 буцаана
  return NextResponse.json({ rate: 0, date: null, source: "none" });
}

async function ensureSettingTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Setting" (
      "key" TEXT NOT NULL,
      "value" TEXT NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
    );
  `);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { rate } = await req.json();
  const rateNum = Number(rate);
  if (!rateNum || rateNum <= 0) {
    return NextResponse.json({ error: "Буруу утга" }, { status: 400 });
  }

  try {
    await prisma.setting.upsert({
      where: { key: "exchange_rate" },
      update: { value: String(rateNum) },
      create: { key: "exchange_rate", value: String(rateNum) },
    });
  } catch {
    // Хүснэгт байхгүй бол автоматаар үүсгэж дахин оролдоно
    await ensureSettingTable();
    await prisma.setting.upsert({
      where: { key: "exchange_rate" },
      update: { value: String(rateNum) },
      create: { key: "exchange_rate", value: String(rateNum) },
    });
  }

  return NextResponse.json({ ok: true, rate: rateNum });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.setting.deleteMany({ where: { key: "exchange_rate" } });
  return NextResponse.json({ ok: true });
}
