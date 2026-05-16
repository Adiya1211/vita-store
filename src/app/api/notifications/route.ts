import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - өөрийн мэдэгдлүүдийг авах
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, isRead: false },
  });

  return NextResponse.json({ notifications, unreadCount });
}

// PUT - бүгдийг уншсан болгох
export async function PUT() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ ok: true });
}

// POST - мэдэгдэл үүсгэх (зөвхөн дотооддоо ашиглана)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, title, body } = await req.json();
  const notification = await prisma.notification.create({
    data: { userId, title, body, id: crypto.randomUUID() },
  });

  return NextResponse.json(notification, { status: 201 });
}
