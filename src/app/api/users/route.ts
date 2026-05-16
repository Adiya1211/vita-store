import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, email, password, role } = await req.json();

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return NextResponse.json({ error: "Бүх талбарыг бөглөнө үү" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Энэ имэйл бүртгэлтэй байна" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashed,
      role: role === "ADMIN" ? "ADMIN" : "STAFF",
    },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  return NextResponse.json(user, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, isActive } = await req.json();
  if (!id) return NextResponse.json({ error: "id шаардлагатай" }, { status: 400 });

  const user = await prisma.user.update({
    where: { id },
    data: { isActive },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  return NextResponse.json(user);
}
