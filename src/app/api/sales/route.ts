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
  const { productId, quantity, sellingPrice, actualPrice, bonus, paymentType, note, customerName, soldAt } = body;

  if (!productId || !quantity || !sellingPrice) {
    return NextResponse.json({ error: "Мэдээлэл дутуу байна" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "Бараа олдсонгүй" }, { status: 404 });

  if (quantity > product.quantity) {
    return NextResponse.json({ error: `Зарах тоо барааны тооноос (${product.quantity}) их байна` }, { status: 400 });
  }

  const resolvedActualPrice = actualPrice ? Number(actualPrice) : Number(sellingPrice);
  const totalAmount = resolvedActualPrice * Number(quantity);

  // Борлуулалт бүртгэж, барааны тоог хасах
  const [sale] = await prisma.$transaction([
    prisma.sale.create({
      data: {
        id: crypto.randomUUID(),
        productId,
        soldById: session.user.id,
        quantity: Number(quantity),
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
    prisma.product.update({
      where: { id: productId },
      data: {
        quantity: product.quantity - Number(quantity),
        totalPrice: product.costPrice * (product.quantity - Number(quantity)),
      },
    }),
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
  const remainingQty = product.quantity - Number(quantity);
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
