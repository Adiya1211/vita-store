import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Гараар тохируулсан ханш татах
  let audToMnt = 0;
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "exchange_rate" } });
    if (setting) audToMnt = Number(setting.value);
  } catch { /* Setting хүснэгт байхгүй */ }

  if (!audToMnt || audToMnt <= 0) {
    return NextResponse.json({ error: "Ханш тохируулаагүй байна. Эхлээд ханш оруулна уу." }, { status: 400 });
  }

  // Бүх бараа татах
  const products = await prisma.product.findMany({
    select: { id: true, costPrice: true, discountedPrice: true },
  });

  // Зарах үнэ = (хямдарсан үнэ × 2 + 15) × ханш
  const updates = products.map((p) => {
    const dp = p.discountedPrice ?? p.costPrice / 2;
    const newSellingPrice = Math.round((dp * 2 + 15) * audToMnt);
    return prisma.product.update({
      where: { id: p.id },
      data: { sellingPrice: newSellingPrice },
    });
  });

  await prisma.$transaction(updates);

  return NextResponse.json({ updated: products.length, rate: audToMnt });
}
