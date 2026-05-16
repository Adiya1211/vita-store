import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [users, sales, payments] = await Promise.all([
    prisma.user.findMany({ where: { role: "STAFF", isActive: true }, select: { id: true, name: true } }),
    prisma.sale.findMany({ where: { paymentType: "PAID" }, select: { soldById: true, totalAmount: true } }),
    prisma.payment.findMany({ select: { fromUserId: true, amount: true, paidAt: true, status: true } }),
  ]);

  const summary = users.map((u) => {
    const collected = sales.filter((s) => s.soldById === u.id).reduce((sum, s) => sum + s.totalAmount, 0);
    const uPayments = payments.filter((p) => p.fromUserId === u.id);
    const transferred = uPayments.filter((p) => p.status === "APPROVED").reduce((sum, p) => sum + p.amount, 0);
    const pending = uPayments.filter((p) => p.status === "PENDING").reduce((sum, p) => sum + p.amount, 0);
    const lastPayment = uPayments
      .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())[0];
    return {
      userId: u.id,
      name: u.name,
      collected,
      transferred,
      pending,
      outstanding: collected - transferred,
      lastPaymentAt: lastPayment?.paidAt ?? null,
    };
  });

  return NextResponse.json(summary);
}
