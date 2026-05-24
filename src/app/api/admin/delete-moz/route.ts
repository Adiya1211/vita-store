import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const shipment = await prisma.shipment.findFirst({ where: { name: "MOZ" } });
  if (!shipment) {
    return NextResponse.json({ ok: true, message: "MOZ ачаа олдсонгүй — аль хэдийн устгагдсан байж болно" });
  }

  const { count } = await prisma.product.deleteMany({ where: { shipmentId: shipment.id } });
  await prisma.shipment.delete({ where: { id: shipment.id } });

  return NextResponse.json({ ok: true, deletedProducts: count, message: `MOZ ачаа болон ${count} бараа устгагдлаа` });
}
