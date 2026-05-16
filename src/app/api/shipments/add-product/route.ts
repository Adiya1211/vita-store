import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { productId, quantity, toUserId, shipmentId, shipmentName, shipmentDate } = await req.json();

    if (!productId || !quantity || quantity < 1) {
      return NextResponse.json({ error: "Мэдээлэл дутуу байна" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ error: "Бүтээгдэхүүн олдсонгүй" }, { status: 404 });

    if (quantity > product.quantity) {
      return NextResponse.json({ error: "Явуулах тоо нийт тооноос их байна" }, { status: 400 });
    }

    // Ачаа олох эсвэл үүсгэх
    let targetShipmentId = shipmentId;
    if (!targetShipmentId) {
      if (!shipmentName) return NextResponse.json({ error: "Ачааны нэр заавал байна" }, { status: 400 });
      const newShipment = await prisma.shipment.create({
        data: {
          name: shipmentName,
          sentAt: shipmentDate ? new Date(shipmentDate) : new Date(),
        },
      });
      targetShipmentId = newShipment.id;
    }

    const assignedUserId = toUserId || null;

    if (quantity === product.quantity) {
      // Бүгдийг илгээх — борлуулагч хуваарилж PENDING болгох
      await prisma.product.update({
        where: { id: productId },
        data: {
          shipmentId: targetShipmentId,
          assignedUserId,
          status: "PENDING",
        },
      });
    } else {
      // Хэсэгчилж илгээх — шинэ бүртгэл үүсгэж shipment-д нэм
      const remaining = product.quantity - quantity;
      await prisma.$transaction([
        prisma.product.update({
          where: { id: productId },
          data: { quantity: remaining, totalPrice: product.costPrice * remaining },
        }),
        prisma.product.create({
          data: {
            store: product.store,
            brand: product.brand,
            name: product.name,
            dosage: product.dosage,
            quantity,
            costPrice: product.costPrice,
            discountedPrice: product.discountedPrice,
            totalPrice: product.costPrice * quantity,
            sellingPrice: product.sellingPrice,
            barcode: product.barcode,
            imageUrl: product.imageUrl,
            colesUrl: product.colesUrl,
            registeredAt: product.registeredAt,
            assignedUserId,
            status: "PENDING",
            shipmentId: targetShipmentId,
          },
        }),
      ]);
    }

    await logActivity({
      action: "SHIPPED",
      description: `"${product.brand} ${product.name}" ${quantity}ш Монгол руу илгээгдлээ`,
      userId: session.user.id,
      userName: session.user.name ?? "Хэрэглэгч",
      productId,
      productName: `${product.brand} ${product.name}`,
    });

    return NextResponse.json({ ok: true, shipmentId: targetShipmentId });
  } catch (err) {
    console.error("[add-product]", err);
    return NextResponse.json({ error: "Серверийн алдаа гарлаа" }, { status: 500 });
  }
}
