import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { productId, toUserId, quantity, note } = await req.json();

    if (!productId || !quantity || quantity < 1) {
      return NextResponse.json({ error: "Мэдээлэл дутуу байна" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ error: "Бүтээгдэхүүн олдсонгүй" }, { status: 404 });

    if (quantity > product.quantity) {
      return NextResponse.json({ error: "Шилжүүлэх тоо нийт тооноос их байна" }, { status: 400 });
    }

    const assignedUserId = toUserId && toUserId !== "none" ? toUserId : null;
    const transferNote = note?.trim() || null;

    if (quantity === product.quantity) {
      const updated = await prisma.product.update({
        where: { id: productId },
        data: {
          assignedUserId,
          status: "PENDING",
          extraData: {
            ...(typeof product.extraData === "object" && product.extraData !== null ? product.extraData : {}),
            transferNote,
          },
        },
        include: { assignedTo: { select: { id: true, name: true } } },
      });
      return NextResponse.json({ type: "full", product: updated });
    } else {
      const remaining = product.quantity - quantity;
      const unitCost = product.costPrice;
      const unitSelling = product.sellingPrice;
      const unitDiscounted = product.discountedPrice;

      const [original, transferred] = await prisma.$transaction([
        prisma.product.update({
          where: { id: productId },
          data: {
            quantity: remaining,
            totalPrice: unitCost * remaining,
          },
        }),
        prisma.product.create({
          data: {
            store: product.store,
            brand: product.brand,
            name: product.name,
            dosage: product.dosage,
            quantity,
            costPrice: unitCost,
            discountedPrice: unitDiscounted,
            totalPrice: unitCost * quantity,
            sellingPrice: unitSelling,
            barcode: product.barcode,
            imageUrl: product.imageUrl,
            colesUrl: product.colesUrl,
            registeredAt: product.registeredAt,
            assignedUserId,
            status: "PENDING",
            extraData: {
              ...(typeof product.extraData === "object" && product.extraData !== null ? product.extraData : {}),
              transferNote,
              transferredFrom: productId,
            },
          },
          include: { assignedTo: { select: { id: true, name: true } } },
        }),
      ]);

      return NextResponse.json({ type: "partial", original, transferred });
    }
  } catch (err) {
    console.error("[transfer] error:", err);
    return NextResponse.json({ error: "Серверийн алдаа гарлаа" }, { status: 500 });
  }
}
