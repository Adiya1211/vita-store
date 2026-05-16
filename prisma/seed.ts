import { PrismaClient, FieldType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Admin хэрэглэгч үүсгэх
  const hashedPassword = await bcrypt.hash("Admin@1234", 10);

  await prisma.user.upsert({
    where: { email: "admin@vitastore.mn" },
    update: {},
    create: {
      name: "Админ",
      email: "admin@vitastore.mn",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("✓ Admin хэрэглэгч үүслээ: admin@vitastore.mn / Admin@1234");

  // Default талбарууд — visibleToStaff=false: үнийн мэдээлэл борлуулагчаас нуусан байна
  const defaultFields = [
    { fieldKey: "registeredAt", label: "Огноо", fieldType: FieldType.DATE, isRequired: true, sortOrder: 1, visibleToStaff: true },
    { fieldKey: "store", label: "Дэлгүүр", fieldType: FieldType.TEXT, isRequired: false, sortOrder: 2, visibleToStaff: true },
    { fieldKey: "brand", label: "Брэнд", fieldType: FieldType.TEXT, isRequired: true, sortOrder: 3, visibleToStaff: true },
    { fieldKey: "name", label: "Бүтээгдэхүүний нэр", fieldType: FieldType.TEXT, isRequired: true, sortOrder: 4, visibleToStaff: true },
    { fieldKey: "dosage", label: "Тун / Хэмжээ", fieldType: FieldType.TEXT, isRequired: false, sortOrder: 5, visibleToStaff: true },
    { fieldKey: "quantity", label: "Тоо ширхэг", fieldType: FieldType.NUMBER, isRequired: true, sortOrder: 6, visibleToStaff: true },
    { fieldKey: "costPrice", label: "Үндсэн үнэ (AUD)", fieldType: FieldType.NUMBER, isRequired: true, sortOrder: 7, visibleToStaff: false },
    { fieldKey: "discountedPrice", label: "Хямдарсан үнэ (AUD)", fieldType: FieldType.NUMBER, isRequired: false, sortOrder: 8, visibleToStaff: false },
    { fieldKey: "totalPrice", label: "Нийт үнэ (AUD)", fieldType: FieldType.NUMBER, isRequired: false, sortOrder: 9, visibleToStaff: false },
    { fieldKey: "sellingPrice", label: "Зарах үнэ (₮)", fieldType: FieldType.NUMBER, isRequired: true, sortOrder: 10, visibleToStaff: true },
    { fieldKey: "profit", label: "Ашиг (₮)", fieldType: FieldType.NUMBER, isRequired: false, sortOrder: 11, visibleToStaff: false },
    { fieldKey: "assignedUserId", label: "Борлуулагч", fieldType: FieldType.USER_SELECT, isRequired: false, sortOrder: 12, visibleToStaff: true },
    { fieldKey: "barcode", label: "Бар код", fieldType: FieldType.TEXT, isRequired: false, sortOrder: 13, visibleToStaff: true },
    { fieldKey: "imageUrl", label: "Зургийн URL", fieldType: FieldType.TEXT, isRequired: false, sortOrder: 14, visibleToStaff: true },
  ];

  for (const field of defaultFields) {
    await prisma.fieldConfig.upsert({
      where: { fieldKey: field.fieldKey },
      update: { visibleToStaff: field.visibleToStaff },
      create: { ...field, isVisible: true, isCustom: false },
    });
  }

  console.log("✓ Default талбарууд үүслээ");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
