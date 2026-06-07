import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Гараар тохируулсан ханш байвал тэрийг ашиглана
  try {
    const manual = await prisma.setting.findUnique({ where: { key: "exchange_rate" } });
    if (manual) {
      return NextResponse.json({
        rate: Number(manual.value),
        date: manual.updatedAt.toISOString().split("T")[0],
        source: "manual",
      });
    }
  } catch { /* Setting хүснэгт байхгүй бол автомат ханш ашиглана */ }

  // Автомат ханш татах
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/AUD", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("fetch failed");
    const data = await res.json();
    return NextResponse.json({
      rate: Math.round(data.rates.MNT),
      date: data.date,
      source: "auto",
    });
  } catch {
    return NextResponse.json({ rate: 2554, date: null, source: "fallback" });
  }
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

  await prisma.setting.upsert({
    where: { key: "exchange_rate" },
    update: { value: String(rateNum) },
    create: { key: "exchange_rate", value: String(rateNum) },
  });

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
