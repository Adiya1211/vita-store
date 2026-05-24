import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shipments = await prisma.shipment.findMany({
    where: { NOT: { name: "MOZ" } },
    orderBy: { sentAt: "desc" },
    include: {
      products: {
        include: { assignedTo: { select: { id: true, name: true } } },
        orderBy: { sequenceNumber: "asc" },
      },
    },
  });

  return NextResponse.json(shipments);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, sentAt, note, productIds } = await req.json();
  if (!name || !sentAt) return NextResponse.json({ error: "Нэр, огноо заавал байна" }, { status: 400 });

  const shipment = await prisma.shipment.create({
    data: {
      name,
      sentAt: new Date(sentAt),
      note: note || null,
      products: productIds?.length
        ? { connect: productIds.map((id: string) => ({ id })) }
        : undefined,
    },
    include: {
      products: {
        include: { assignedTo: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json(shipment, { status: 201 });
}
