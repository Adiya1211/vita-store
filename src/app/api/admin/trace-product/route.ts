import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Түр зориулалтын endpoint — тодорхой бар кодтой барааны бүх бичлэг, лог, борлуулалтыг харах
const BARCODE = "9300807320143";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Тухайн бар кодтой бүх бараа бичлэг
  const products = await prisma.product.findMany({
    where: { barcode: BARCODE },
    include: { assignedTo: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const productIds = products.map((p) => p.id);

  // Холбогдох үйл ажиллагааны лог
  const logs = await prisma.activityLog.findMany({
    where: { productId: { in: productIds } },
    orderBy: { createdAt: "asc" },
  });

  // Холбогдох борлуулалт
  const sales = await prisma.sale.findMany({
    where: { productId: { in: productIds } },
    include: { soldBy: { select: { name: true } } },
    orderBy: { soldAt: "asc" },
  });

  return NextResponse.json({
    barcode: BARCODE,
    totalRecords: products.length,
    totalQuantityNow: products.reduce((s, p) => s + p.quantity, 0),
    records: products.map((p) => ({
      id: p.id,
      quantity: p.quantity,
      status: p.status,
      assignedTo: p.assignedTo?.name ?? "— (хуваарилаагүй)",
      createdAt: p.createdAt,
      registeredAt: p.registeredAt,
      extraData: p.extraData,
    })),
    activityLogs: logs.map((l) => ({
      action: l.action,
      description: l.description,
      by: l.userName,
      at: l.createdAt,
    })),
    sales: sales.map((s) => ({
      quantity: s.quantity,
      soldBy: s.soldBy?.name,
      paymentType: s.paymentType,
      soldAt: s.soldAt,
    })),
  });
}
