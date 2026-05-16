import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  // Бүтээгдэхүүнүүдийн shipmentId-г null болгох
  await prisma.product.updateMany({ where: { shipmentId: id }, data: { shipmentId: null } });
  await prisma.shipment.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { addProductIds, removeProductIds, name, sentAt, note, shippingFee } = await req.json();

  const shipment = await prisma.shipment.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(sentAt && { sentAt: new Date(sentAt) }),
      ...(note !== undefined && { note: note || null }),
      ...(shippingFee !== undefined && { shippingFee: shippingFee !== "" && shippingFee !== null ? Number(shippingFee) : null }),
      ...(addProductIds?.length && { products: { connect: addProductIds.map((pid: string) => ({ id: pid })) } }),
      ...(removeProductIds?.length && { products: { disconnect: removeProductIds.map((pid: string) => ({ id: pid })) } }),
    },
    include: {
      products: {
        include: { assignedTo: { select: { id: true, name: true } } },
        orderBy: { sequenceNumber: "asc" },
      },
    },
  });

  return NextResponse.json(shipment);
}
