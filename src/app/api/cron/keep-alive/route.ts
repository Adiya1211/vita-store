import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Supabase pause болохоос сэргийлэх keep-alive.
// Vercel Cron өдөр бүр дуудаж, DB рүү жижиг query илгээж идэвхтэй байлгана.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Хамгийн хялбар query — DB-г "сэрүүн" байлгахад хангалттай
    const userCount = await prisma.user.count();
    return NextResponse.json({
      ok: true,
      pingedAt: new Date().toISOString(),
      users: userCount,
    });
  } catch (err) {
    console.error("[keep-alive] DB error:", err);
    return NextResponse.json({ ok: false, error: "DB unreachable" }, { status: 500 });
  }
}
