import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ids } = await req.json();
  // Бүлэглэсэн бараа — олон id ирж болно
  const targetIds: string[] = Array.isArray(ids) && ids.length ? ids : id ? [id] : [];
  if (!targetIds.length) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const products = await prisma.product.findMany({ where: { id: { in: targetIds } } });
  if (!products.length) return NextResponse.json({ error: "Бүтээгдэхүүн олдсонгүй" }, { status: 404 });

  const isAdmin = session.user.role === "ADMIN";

  // Зөвхөн PENDING, зөвшөөрөх эрхтэй (admin эсвэл хуваарилагдсан) бичлэгүүд
  const approvable = products.filter(
    (p) => p.status === "PENDING" && (isAdmin || p.assignedUserId === session.user.id)
  );

  if (!approvable.length) {
    return NextResponse.json({ error: "Зөвшөөрөх боломжтой бараа алга" }, { status: 400 });
  }

  await prisma.product.updateMany({
    where: { id: { in: approvable.map((p) => p.id) } },
    data: { status: "APPROVED" },
  });

  const first = approvable[0];
  await logActivity({
    action: "APPROVED",
    description: `"${first.brand} ${first.name}" бараа зөвшөөрөгдлөө (${approvable.length}ш бичлэг)`,
    userId: session.user.id,
    userName: session.user.name ?? "Хэрэглэгч",
    productId: first.id,
    productName: `${first.brand} ${first.name}`,
  });

  return NextResponse.json({ ok: true, approvedCount: approvable.length });
}
