import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [user, products, sales] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    }),
    prisma.product.findMany({
      where: { assignedUserId: id },
      include: { shipment: { select: { id: true, name: true } } },
      orderBy: { sequenceNumber: "desc" },
    }),
    prisma.sale.findMany({
      where: { soldById: id },
      include: { product: { select: { id: true, brand: true, name: true, dosage: true } } },
      orderBy: { soldAt: "desc" },
    }),
  ]);

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const totalValue = products.reduce((s, p) => s + p.totalPrice, 0);
  const totalProfit = products.reduce((s, p) => {
    const cost = p.discountedPrice ?? p.costPrice;
    return s + (p.sellingPrice - cost) * p.quantity;
  }, 0);
  const pendingCount = products.filter((p) => p.status === "PENDING").length;
  const approvedCount = products.filter((p) => p.status === "APPROVED").length;
  const shippedCount = products.filter((p) => p.shipmentId).length;

  const salesRevenue = sales.reduce((s, sale) => s + sale.totalAmount, 0);
  const salesBonus = sales.reduce((s, sale) => s + (sale.bonus ?? 0), 0);
  const creditCount = sales.filter((s) => s.paymentType === "CREDIT").length;

  return NextResponse.json({
    user,
    products,
    sales,
    stats: {
      total: products.length, pendingCount, approvedCount, shippedCount, totalValue, totalProfit,
      salesCount: sales.length, salesRevenue, salesBonus, creditCount,
    },
  });
}
