import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.role === "ADMIN";
  const where = isAdmin ? {} : { assignedUserId: session.user.id };

  // Зөвхөн гараар тохируулсан ханш ашиглана
  let audToMnt = 0;
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "exchange_rate" } });
    if (setting) audToMnt = Number(setting.value);
  } catch { /* Setting хүснэгт байхгүй бол 0 */ }

  // Сүүлийн 30 хоногийн борлуулалт (chart-д ашиглах)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

  const [products, shipments, users, sales, recentSales] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        status: true,
        totalPrice: true,
        sellingPrice: true,
        costPrice: true,
        discountedPrice: true,
        quantity: true,
        assignedUserId: true,
        assignedTo: { select: { id: true, name: true } },
        shipmentId: true,
        createdAt: true,
        barcode: true,
        brand: true,
        name: true,
        dosage: true,
      },
    }),
    isAdmin ? prisma.shipment.findMany({ select: { id: true, name: true, sentAt: true }, orderBy: { sentAt: "desc" } }) : Promise.resolve([]),
    isAdmin ? prisma.user.findMany({ where: { role: "STAFF", isActive: true }, select: { id: true, name: true } }) : Promise.resolve([]),
    isAdmin
      ? prisma.sale.findMany({ select: { soldById: true, totalAmount: true, bonus: true, paymentType: true, quantity: true } })
      : prisma.sale.findMany({ where: { soldById: session.user.id }, select: { soldById: true, totalAmount: true, bonus: true, paymentType: true, quantity: true } }),
    isAdmin
      ? prisma.sale.findMany({
          where: { soldAt: { gte: thirtyDaysAgo } },
          select: { soldAt: true, totalAmount: true, soldById: true },
          orderBy: { soldAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  type ProductItem = typeof products[number];
  type SaleItem = typeof sales[number];
  type UserItem = typeof users[number];

  // Бүтээгдэхүүний хуудастай ижил бүлэглэх логик
  const groupKey = (p: { barcode: string | null; brand: string; name: string; dosage: string | null }) =>
    p.barcode ? p.barcode : `${p.brand}||${p.name}||${p.dosage ?? ""}`;

  const uniqueKeys = new Set(products.map(groupKey));
  const pendingKeys = new Set(products.filter((p: ProductItem) => p.status === "PENDING").map(groupKey));
  const approvedKeys = new Set(products.filter((p: ProductItem) => p.status === "APPROVED").map(groupKey));

  const totalProducts = uniqueKeys.size;
  const totalQuantity = products.reduce((sum: number, p: ProductItem) => sum + p.quantity, 0);
  const pendingCount = pendingKeys.size;
  const approvedCount = approvedKeys.size;

  // Нийт өртөг = хямдарсан үнэ × тоо (A$)
  const totalValue = products.reduce((sum: number, p: ProductItem) => {
    const costAUD = p.discountedPrice ?? p.costPrice;
    return sum + costAUD * p.quantity;
  }, 0);

  // Нийт ашиг = (зарах үнэ ₮ − хямдарсан үнэ A$ × ханш) × тоо
  const totalProfit = audToMnt > 0
    ? products.reduce((sum: number, p: ProductItem) => {
        const effectiveCostAUD = p.discountedPrice ?? p.costPrice;
        return sum + (p.sellingPrice - effectiveCostAUD * audToMnt) * p.quantity;
      }, 0)
    : 0;

  // Нийт борлуулалтын статистик
  const totalSalesCount = sales.length;
  const totalRevenue = sales.reduce((s: number, sale: SaleItem) => s + sale.totalAmount, 0);
  const totalBonus = sales.reduce((s: number, sale: SaleItem) => s + (sale.bonus ?? 0), 0);
  const creditSales = sales.filter((s: SaleItem) => s.paymentType === "CREDIT");
  const creditCount = creditSales.length;
  const creditAmount = creditSales.reduce((s: number, sale: SaleItem) => s + sale.totalAmount, 0);

  // Борлуулагч тус бүрийн статистик
  const userStats = users.map((u: UserItem) => {
    const uProducts = products.filter((p: ProductItem) => p.assignedUserId === u.id);
    const uValue = uProducts.reduce((sum: number, p: ProductItem) =>
      sum + (p.discountedPrice ?? p.costPrice) * p.quantity, 0);
    const uProfit = audToMnt > 0
      ? uProducts.reduce((sum: number, p: ProductItem) => {
          const effectiveCostAUD = p.discountedPrice ?? p.costPrice;
          return sum + (p.sellingPrice - effectiveCostAUD * audToMnt) * p.quantity;
        }, 0)
      : 0;
    const uSales = sales.filter((s: SaleItem) => s.soldById === u.id);
    const uRevenue = uSales.reduce((sum: number, s: SaleItem) => sum + s.totalAmount, 0);
    const uBonus = uSales.reduce((sum: number, s: SaleItem) => sum + (s.bonus ?? 0), 0);

    // Тоогоор (ширхэгээр) тооцно
    const uQuantity = uProducts.reduce((sum: number, p: ProductItem) => sum + p.quantity, 0);
    const uPending = uProducts
      .filter((p: ProductItem) => p.status === "PENDING")
      .reduce((sum: number, p: ProductItem) => sum + p.quantity, 0);
    const uApproved = uProducts
      .filter((p: ProductItem) => p.status === "APPROVED")
      .reduce((sum: number, p: ProductItem) => sum + p.quantity, 0);

    return {
      id: u.id,
      name: u.name,
      total: uQuantity,
      pending: uPending,
      approved: uApproved,
      totalValue: uValue,
      totalProfit: uProfit,
      salesCount: uSales.length,
      salesRevenue: uRevenue,
      salesBonus: uBonus,
    };
  });

  // Footer нийлбэр — userStats-аас бодно (таарсан байхын тулд)
  const statsTotalQty     = userStats.reduce((s, u) => s + u.total, 0);
  const statsTotalPending = userStats.reduce((s, u) => s + u.pending, 0);
  const statsTotalApproved= userStats.reduce((s, u) => s + u.approved, 0);
  const statsTotalValue   = userStats.reduce((s, u) => s + u.totalValue, 0);
  const statsTotalProfit  = userStats.reduce((s, u) => s + u.totalProfit, 0);
  const statsTotalSales   = userStats.reduce((s, u) => s + u.salesCount, 0);
  const statsTotalRevenue = userStats.reduce((s, u) => s + u.salesRevenue, 0);

  // Хуваарилаагүй бараа
  const unassigned = new Set(products.filter((p: ProductItem) => !p.assignedUserId).map(groupKey)).size;

  // Сүүлийн 30 хоногийн өдөр тус бүрийн борлуулалт
  const dailySalesMap: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dailySalesMap[d.toISOString().split("T")[0]] = 0;
  }
  for (const s of recentSales) {
    const key = new Date(s.soldAt).toISOString().split("T")[0];
    if (key in dailySalesMap) dailySalesMap[key] += s.totalAmount;
  }
  const dailySales = Object.entries(dailySalesMap).map(([date, amount]) => ({
    date,
    amount: Math.round(amount),
  }));

  return NextResponse.json({
    totalProducts,
    totalQuantity,
    pendingCount,
    approvedCount,
    unassigned,
    totalValue,
    totalProfit,
    totalSalesCount,
    totalRevenue,
    totalBonus,
    creditCount,
    creditAmount,
    userStats,
    // Footer нийлбэрүүд
    statsTotalQty,
    statsTotalPending,
    statsTotalApproved,
    statsTotalValue,
    statsTotalProfit,
    statsTotalSales,
    statsTotalRevenue,
    shipments,
    shipmentsCount: shipments.length,
    audToMnt,
    dailySales,
  });
}
