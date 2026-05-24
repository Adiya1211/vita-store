import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // "MOZ" ачааны бараануудыг харуулахгүй (буруу data — устгахгүй, нуух)
  const hiddenShipmentFilter = { NOT: { shipment: { name: "MOZ" } } };

  const where = session.user.role === "STAFF"
    ? { assignedUserId: session.user.id, ...hiddenShipmentFilter }
    : hiddenShipmentFilter;

  const products = await prisma.product.findMany({
    where,
    include: {
      assignedTo: { select: { id: true, name: true } },
      shipment: { select: { id: true, name: true } },
    },
    orderBy: { sequenceNumber: "desc" },
  });

  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const barcode = body.barcode || null;

  const product = await prisma.product.create({
    data: {
      store: body.store || null,
      brand: body.brand,
      name: body.name,
      dosage: body.dosage || null,
      quantity: Number(body.quantity) || 1,
      costPrice: Number(body.costPrice),
      discountedPrice: body.discountedPrice ? Number(body.discountedPrice) : null,
      totalPrice: Number(body.totalPrice),
      sellingPrice: Number(body.sellingPrice),
      barcode,
      imageUrl: body.imageUrl || null,
      colesUrl: body.colesUrl || null,
      extraData: body.extraData || null,
      registeredAt: body.registeredAt ? new Date(body.registeredAt) : new Date(),
      assignedUserId: body.assignedUserId || null,
      status: body.status || "PENDING",
    },
  });

  if (barcode) {
    await prisma.barcodeCache.upsert({
      where: { barcode },
      update: {
        name: body.name || null,
        brand: body.brand || null,
        dosage: body.dosage || null,
        imageUrl: body.imageUrl || null,
        costPrice: body.costPrice ? Number(body.costPrice) : null,
        colesUrl: body.colesUrl || null,
      },
      create: {
        barcode,
        name: body.name || null,
        brand: body.brand || null,
        dosage: body.dosage || null,
        imageUrl: body.imageUrl || null,
        costPrice: body.costPrice ? Number(body.costPrice) : null,
        colesUrl: body.colesUrl || null,
      },
    });
  }

  await logActivity({
    action: "CREATED",
    description: `"${body.brand} ${body.name}" бараа бүртгэгдлээ`,
    userId: session.user.id,
    userName: session.user.name ?? "Хэрэглэгч",
    productId: product.id,
    productName: `${body.brand} ${body.name}`,
  });

  return NextResponse.json(product, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const barcode = rest.barcode || null;

  // Өмнөх assignedUserId-г авах
  const existing = await prisma.product.findUnique({ where: { id }, select: { assignedUserId: true, name: true, brand: true } });

  const product = await prisma.product.update({
    where: { id },
    data: {
      store: rest.store || null,
      brand: rest.brand,
      name: rest.name,
      dosage: rest.dosage || null,
      quantity: Number(rest.quantity) || 1,
      costPrice: Number(rest.costPrice),
      discountedPrice: rest.discountedPrice ? Number(rest.discountedPrice) : null,
      totalPrice: Number(rest.totalPrice),
      sellingPrice: Number(rest.sellingPrice),
      barcode,
      imageUrl: rest.imageUrl || null,
      colesUrl: rest.colesUrl || null,
      extraData: rest.extraData || null,
      status: rest.status || undefined,
      registeredAt: rest.registeredAt ? new Date(rest.registeredAt) : undefined,
      assignedUserId: rest.assignedUserId || null,
    },
  });

  // Шинэ борлуулагчид хуваарилагдсан бол мэдэгдэл илгээх
  const newAssignedId = rest.assignedUserId || null;
  if (newAssignedId && newAssignedId !== existing?.assignedUserId) {
    await prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        userId: newAssignedId,
        title: "Шинэ бараа хуваарилагдлаа",
        body: `"${existing?.brand ?? ""} ${existing?.name ?? ""}" бараа танд хуваарилагдлаа.`,
      },
    });
  }

  if (barcode) {
    await prisma.barcodeCache.upsert({
      where: { barcode },
      update: {
        name: rest.name || null,
        brand: rest.brand || null,
        dosage: rest.dosage || null,
        imageUrl: rest.imageUrl || null,
        costPrice: rest.costPrice ? Number(rest.costPrice) : null,
        colesUrl: rest.colesUrl || null,
      },
      create: {
        barcode,
        name: rest.name || null,
        brand: rest.brand || null,
        dosage: rest.dosage || null,
        imageUrl: rest.imageUrl || null,
        costPrice: rest.costPrice ? Number(rest.costPrice) : null,
        colesUrl: rest.colesUrl || null,
      },
    });
  }

  await logActivity({
    action: "UPDATED",
    description: `"${rest.brand} ${rest.name}" бараа засварлагдлаа`,
    userId: session.user.id,
    userName: session.user.name ?? "Хэрэглэгч",
    productId: id,
    productName: `${rest.brand} ${rest.name}`,
  });

  return NextResponse.json(product);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { id }, select: { brand: true, name: true } });
  await prisma.product.delete({ where: { id } });

  await logActivity({
    action: "DELETED",
    description: `"${product?.brand} ${product?.name}" бараа устгагдлаа`,
    userId: session.user.id,
    userName: session.user.name ?? "Хэрэглэгч",
    productId: id,
    productName: `${product?.brand} ${product?.name}`,
  });

  return NextResponse.json({ ok: true });
}
