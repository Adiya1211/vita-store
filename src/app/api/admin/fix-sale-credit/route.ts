import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Түр зориулалтын endpoint — тодорхой борлуулалтын төлбөрийн статусыг CREDIT болгох
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Note-д "Л.Түмээ" агуулсан, одоо PAID төлөвтэй борлуулалтыг олох
  const matches = await prisma.sale.findMany({
    where: { note: { contains: "Л.Түмээ" }, paymentType: "PAID" },
    select: { id: true, note: true, totalAmount: true, paymentType: true },
  });

  if (matches.length === 0) {
    return NextResponse.json({ ok: false, message: "Тохирох борлуулалт олдсонгүй" });
  }

  const updated = await prisma.sale.updateMany({
    where: { note: { contains: "Л.Түмээ" }, paymentType: "PAID" },
    data: { paymentType: "CREDIT" },
  });

  return NextResponse.json({
    ok: true,
    updatedCount: updated.count,
    records: matches,
    message: `${updated.count} борлуулалт зээл болж өөрчлөгдлөө`,
  });
}
