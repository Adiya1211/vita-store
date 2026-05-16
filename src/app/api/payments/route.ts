import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: admin gets all payments with user info, staff gets own
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.role === "ADMIN";
  const where = isAdmin ? {} : { fromUserId: session.user.id };

  const payments = await prisma.payment.findMany({
    where,
    include: { fromUser: { select: { id: true, name: true } } },
    orderBy: { paidAt: "desc" },
  });

  return NextResponse.json(payments);
}

// POST: admin or staff can create a payment. Staff submits PENDING, admin submits APPROVED directly.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const { fromUserId, amount, note, paidAt } = await req.json();

  // Staff can only submit for themselves; admin must provide fromUserId
  const targetUserId = isAdmin ? fromUserId : session.user.id;
  if (!targetUserId || !amount) {
    return NextResponse.json({ error: "Мэдээлэл дутуу" }, { status: 400 });
  }

  const payment = await prisma.payment.create({
    data: {
      id: crypto.randomUUID(),
      fromUserId: targetUserId,
      amount: Number(amount),
      note: note || null,
      paidAt: paidAt ? new Date(paidAt) : new Date(),
      status: isAdmin ? "APPROVED" : "PENDING",
    },
    include: { fromUser: { select: { id: true, name: true } } },
  });

  return NextResponse.json(payment, { status: 201 });
}
