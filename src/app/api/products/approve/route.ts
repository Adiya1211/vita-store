import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: "Бүтээгдэхүүн олдсонгүй" }, { status: 404 });

  if (product.status !== "PENDING") {
    return NextResponse.json({ error: "Зөвхөн PENDING статустай бүтээгдэхүүнийг зөвшөөрч болно" }, { status: 400 });
  }

  // Зөвхөн хуваарилагдсан борлуулагч эсвэл admin зөвшөөрч болно
  const isAdmin = session.user.role === "ADMIN";
  const isAssigned = product.assignedUserId === session.user.id;

  if (!isAdmin && !isAssigned) {
    return NextResponse.json({ error: "Зөвшөөрөл хүрэлцэхгүй байна" }, { status: 403 });
  }

  const updated = await prisma.product.update({
    where: { id },
    data: { status: "APPROVED" },
  });

  await logActivity({
    action: "APPROVED",
    description: `"${product.brand} ${product.name}" бараа зөвшөөрөгдлөө`,
    userId: session.user.id,
    userName: session.user.name ?? "Хэрэглэгч",
    productId: id,
    productName: `${product.brand} ${product.name}`,
  });

  return NextResponse.json(updated);
}
