import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const fields = await prisma.fieldConfig.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(fields);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const field = await prisma.fieldConfig.create({
    data: {
      fieldKey: body.fieldKey,
      label: body.label,
      fieldType: body.fieldType,
      isVisible: body.isVisible ?? true,
      isRequired: body.isRequired ?? false,
      sortOrder: body.sortOrder ?? 99,
      isCustom: true,
    },
  });

  return NextResponse.json(field, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const field = await prisma.fieldConfig.update({
    where: { id: body.id },
    data: {
      label: body.label,
      isVisible: body.isVisible,
      isRequired: body.isRequired,
      sortOrder: body.sortOrder,
      ...(body.visibleToStaff !== undefined && { visibleToStaff: body.visibleToStaff }),
    },
  });

  return NextResponse.json(field);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const field = await prisma.fieldConfig.findUnique({ where: { id } });
  if (!field?.isCustom) {
    return NextResponse.json({ error: "Суурь талбарыг устгах боломжгүй" }, { status: 400 });
  }

  await prisma.fieldConfig.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
