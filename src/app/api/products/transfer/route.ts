import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { productId, productIds, toUserId, quantity, note } = await req.json();

    // Бүлэглэсэн бараа — олон бичлэгийн id ирж болно. Нэг id ирвэл нэг элементтэй массив.
    const ids: string[] = Array.isArray(productIds) && productIds.length
      ? productIds
      : productId ? [productId] : [];

    if (!ids.length || !quantity || quantity < 1) {
      return NextResponse.json({ error: "Мэдээлэл дутуу байна" }, { status: 400 });
    }

    const products = await prisma.product.findMany({ where: { id: { in: ids } } });
    if (!products.length) {
      return NextResponse.json({ error: "Бүтээгдэхүүн олдсонгүй" }, { status: 404 });
    }

    const totalAvailable = products.reduce((sum, p) => sum + p.quantity, 0);
    if (quantity > totalAvailable) {
      return NextResponse.json({ error: "Шилжүүлэх тоо нийт тооноос их байна" }, { status: 400 });
    }

    const assignedUserId = toUserId && toUserId !== "none" ? toUserId : null;
    const transferNote = note?.trim() || null;

    // Бага үлдэгдэлтэй мөрийг эхэлж бүтнээр нь шилжүүлж, хуваахыг багасгана
    const sorted = [...products].sort((a, b) => a.quantity - b.quantity);

    const ops: Prisma.PrismaPromise<unknown>[] = [];
    let remaining = quantity;

    for (const p of sorted) {
      if (remaining <= 0) break;
      const extra = {
        ...(typeof p.extraData === "object" && p.extraData !== null ? p.extraData : {}),
        transferNote,
      };

      if (remaining >= p.quantity) {
        // Мөрийг бүтнээр нь борлуулагч руу шилжүүлнэ
        ops.push(
          prisma.product.update({
            where: { id: p.id },
            data: { assignedUserId, status: "PENDING", extraData: extra },
          })
        );
        remaining -= p.quantity;
      } else {
        // Хэсэгчилсэн: эх мөрийг багасгаж, шилжүүлэх хэсгийг шинэ мөр болгож үүсгэнэ
        const keep = p.quantity - remaining;
        ops.push(
          prisma.product.update({
            where: { id: p.id },
            data: { quantity: keep, totalPrice: p.costPrice * keep },
          })
        );
        ops.push(
          prisma.product.create({
            data: {
              store: p.store,
              brand: p.brand,
              name: p.name,
              dosage: p.dosage,
              quantity: remaining,
              costPrice: p.costPrice,
              discountedPrice: p.discountedPrice,
              totalPrice: p.costPrice * remaining,
              sellingPrice: p.sellingPrice,
              barcode: p.barcode,
              imageUrl: p.imageUrl,
              colesUrl: p.colesUrl,
              registeredAt: p.registeredAt,
              assignedUserId,
              status: "PENDING",
              extraData: { ...extra, transferredFrom: p.id },
            },
          })
        );
        remaining = 0;
      }
    }

    await prisma.$transaction(ops);

    return NextResponse.json({ ok: true, transferred: quantity });
  } catch (err) {
    console.error("[transfer] error:", err);
    return NextResponse.json({ error: "Серверийн алдаа гарлаа" }, { status: 500 });
  }
}
