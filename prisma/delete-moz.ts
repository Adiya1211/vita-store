import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({
  host: "aws-1-ap-northeast-1.pooler.supabase.com",
  port: 6543,
  database: "postgres",
  user: "postgres.abesrquyigzaqqizmjrn",
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const shipment = await prisma.shipment.findFirst({ where: { name: "MOZ" } });
  if (!shipment) {
    console.log("MOZ ачаа олдсонгүй.");
    return;
  }

  const products = await prisma.product.findMany({ where: { shipmentId: shipment.id } });
  console.log(`MOZ ачаанд ${products.length} бараа байна — устгаж байна...`);

  await prisma.product.deleteMany({ where: { shipmentId: shipment.id } });
  console.log(`✓ ${products.length} бараа устгагдлаа`);

  await prisma.shipment.delete({ where: { id: shipment.id } });
  console.log(`✓ MOZ ачаа устгагдлаа`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
