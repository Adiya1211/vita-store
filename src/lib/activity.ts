import { prisma } from "@/lib/prisma";

export async function logActivity({
  action,
  description,
  userId,
  userName,
  productId,
  productName,
}: {
  action: string;
  description: string;
  userId: string;
  userName: string;
  productId?: string;
  productName?: string;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        id: crypto.randomUUID(),
        action,
        description,
        userId,
        userName,
        productId: productId ?? null,
        productName: productName ?? null,
      },
    });
  } catch {
    // Лог бичихэд алдаа гарсан ч үндсэн үйлдлийг зогсоохгүй
  }
}
