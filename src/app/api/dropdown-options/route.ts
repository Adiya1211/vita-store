import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");
  if (!category) {
    return NextResponse.json({ error: "category шаардлагатай" }, { status: 400 });
  }

  const options = await prisma.dropdownOption.findMany({
    where: { category },
    orderBy: { value: "asc" },
  });

  return NextResponse.json(options);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { category, value } = await req.json();
  if (!category || !value?.trim()) {
    return NextResponse.json({ error: "category болон value шаардлагатай" }, { status: 400 });
  }

  const option = await prisma.dropdownOption.upsert({
    where: { category_value: { category, value: value.trim() } },
    update: {},
    create: { category, value: value.trim() },
  });

  return NextResponse.json(option, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id шаардлагатай" }, { status: 400 });

  await prisma.dropdownOption.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
