import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const products = await prisma.product.findMany({
    where: { NOT: { shipment: { name: "MOZ" } } },
    include: {
      assignedTo: { select: { name: true } },
      shipment: { select: { name: true } },
    },
    orderBy: { sequenceNumber: "asc" },
  });

  const rows = products.map((p, idx) => ({
    "№": idx + 1,
    "Огноо": new Date(p.registeredAt).toLocaleDateString("mn-MN"),
    "Дэлгүүр": p.store ?? "",
    "Брэнд": p.brand,
    "Бүтээгдэхүүний нэр": p.name,
    "Тун / Хэмжээ": p.dosage ?? "",
    "Тоо ширхэг": p.quantity,
    "Үндсэн үнэ (A$)": p.costPrice,
    "Хямдарсан үнэ (A$)": p.discountedPrice ?? "",
    "Нийт үнэ (A$)": p.totalPrice,
    "Зарах үнэ (₮)": p.sellingPrice,
    "Бар код": p.barcode ?? "",
    "Борлуулагч": p.assignedTo?.name ?? "",
    "Ачаа": p.shipment?.name ?? "",
    "Статус": p.status === "APPROVED" ? "Зөвшөөрсөн" : "Хүлээгдэж байна",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Баганын өргөн тохируулах
  ws["!cols"] = [
    { wch: 5 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 28 },
    { wch: 16 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
    { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Бараа");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const today = new Date().toISOString().split("T")[0];

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="products-${today}.xlsx"`,
    },
  });
}
