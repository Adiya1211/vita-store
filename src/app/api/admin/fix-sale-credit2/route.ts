import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Түр зориулалтын endpoint — тодорхой борлуулалтыг PAID → CREDIT болгох
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const where = {
    paymentType: "PAID" as const,
    totalAmount: 115000,
    product: { is: { barcode: "9314807086060" } },
  };

  const matches = await prisma.sale.findMany({
    where,
    select: {
      id: true, totalAmount: true, paymentType: true, soldAt: true,
      product: { select: { name: true, barcode: true } },
      soldBy: { select: { name: true } },
    },
  });

  if (matches.length === 0) {
    return NextResponse.json({ ok: false, message: "Тохирох борлуулалт олдсонгүй" });
  }

  const updated = await prisma.sale.updateMany({
    where,
    data: { paymentType: "CREDIT" },
  });

  return NextResponse.json({
    ok: true,
    updatedCount: updated.count,
    records: matches,
    message: `${updated.count} борлуулалт зээл болж өөрчлөгдлөө`,
  });
}
