import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { action, rejectionNote } = await req.json(); // action: "approve" | "reject"

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { fromUser: { select: { id: true, name: true } } },
  });
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.payment.update({
    where: { id },
    data: {
      status: action === "approve" ? "APPROVED" : "REJECTED",
      rejectionNote: action === "reject" ? (rejectionNote || null) : null,
    },
  });

  // Send notification to staff
  const notifTitle =
    action === "approve" ? "Шилжүүлэлт зөвшөөрөгдлөө" : "Шилжүүлэлт татгаалагдлаа";
  const notifBody =
    action === "approve"
      ? `Таны ₮${payment.amount.toLocaleString()} шилжүүлэлт зөвшөөрөгдлөө`
      : `Таны ₮${payment.amount.toLocaleString()} шилжүүлэлт татгаалагдлаа${rejectionNote ? `: ${rejectionNote}` : ""}`;

  await prisma.notification.create({
    data: {
      id: crypto.randomUUID(),
      userId: payment.fromUserId,
      title: notifTitle,
      body: notifBody,
    },
  });

  return NextResponse.json(updated);
}
