import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.role === "ADMIN";
  const where = isAdmin ? {} : { soldById: session.user.id };

  const sales = await prisma.sale.findMany({
    where,
    include: {
      product: { select: { id: true, brand: true, name: true, dosage: true, barcode: true } },
      soldBy: { select: { id: true, name: true } },
    },
    orderBy: { soldAt: "desc" },
  });

  return NextResponse.json(sales);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, paymentType } = await req.json();
  if (!id || !paymentType) return NextResponse.json({ error: "Мэдээлэл дутуу" }, { status: 400 });

  const sale = await prisma.sale.update({
    where: { id },
    data: { paymentType },
  });

  return NextResponse.json(sale);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { productId, productIds, quantity, sellingPrice, actualPrice, bonus, paymentType, note, customerName, soldAt } = body;

  if (!productId || !quantity || !sellingPrice) {
    return NextResponse.json({ error: "Мэдээлэл дутуу байна" }, { status: 400 });
  }

  // Бүлэглэсэн бараа — ижил бар кодтой олон бичлэгээс зарж болно
  const ids: string[] = Array.isArray(productIds) && productIds.length ? productIds : [productId];
  const groupProducts = await prisma.product.findMany({ where: { id: { in: ids } } });
  if (!groupProducts.length) return NextResponse.json({ error: "Бараа олдсонгүй" }, { status: 404 });

  // Sale-д холбогдох төлөөлөл бичлэг (илгээгдсэн productId эсвэл эхнийх)
  const product = groupProducts.find((p) => p.id === productId) ?? groupProducts[0];

  const totalAvailable = groupProducts.reduce((sum, p) => sum + p.quantity, 0);
  const qty = Number(quantity);
  if (qty > totalAvailable) {
    return NextResponse.json({ error: `Зарах тоо барааны тооноос (${totalAvailable}) их байна` }, { status: 400 });
  }

  const resolvedActualPrice = actualPrice ? Number(actualPrice) : Number(sellingPrice);
  const totalAmount = resolvedActualPrice * qty;

  // Борлуулалт бүртгэж, барааны тоог бичлэгүүд дундуур хасах (бага үлдэгдэлтэйг эхэлж)
  const sorted = [...groupProducts].sort((a, b) => a.quantity - b.quantity);
  const ops: ReturnType<typeof prisma.product.update>[] = [];
  let remaining = qty;
  for (const p of sorted) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, p.quantity);
    const newQty = p.quantity - take;
    ops.push(
      prisma.product.update({
        where: { id: p.id },
        data: { quantity: newQty, totalPrice: p.costPrice * newQty },
      })
    );
    remaining -= take;
  }

  const [sale] = await prisma.$transaction([
    prisma.sale.create({
      data: {
        id: crypto.randomUUID(),
        productId: product.id,
        soldById: session.user.id,
        quantity: qty,
        sellingPrice: Number(sellingPrice),
        actualPrice: resolvedActualPrice,
        totalAmount,
        bonus: bonus ? Number(bonus) : null,
        paymentType: paymentType === "CREDIT" ? "CREDIT" : "PAID",
        note: note || null,
        customerName: customerName || null,
        soldAt: soldAt ? new Date(soldAt) : new Date(),
      },
    }),
    ...ops,
  ]);

  await logActivity({
    action: "SOLD",
    description: `"${product.brand} ${product.name}" ${quantity}ш зарагдлаа${customerName ? ` — ${customerName}` : ""}`,
    userId: session.user.id,
    userName: session.user.name ?? "Хэрэглэгч",
    productId,
    productName: `${product.brand} ${product.name}`,
  });

  // Бага үлдэгдэл мэдэгдэл — админд илгээх
  const remainingQty = totalAvailable - qty;
  const LOW_STOCK = 5;

  if (remainingQty <= LOW_STOCK) {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    const seller = session.user.name ?? "Борлуулагч";
    const productLabel = `${product.brand} ${product.name}`;
    const message = remainingQty === 0
      ? `⚠️ ${seller}: "${productLabel}" бараа дууслаа (0 ш үлдсэн)`
      : `📦 ${seller}: "${productLabel}" бараа бага байна — ${remainingQty}ш үлдлээ`;

    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        id: crypto.randomUUID(),
        userId: admin.id,
        title: remainingQty === 0 ? "Бараа дууслаа" : "Бараа бага байна",
        body: message,
        isRead: false,
      })),
    });
  }

  return NextResponse.json(sale, { status: 201 });
}
