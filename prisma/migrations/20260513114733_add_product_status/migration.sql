-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('STOCK', 'SHIPPED', 'SOLD');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "status" "ProductStatus" NOT NULL DEFAULT 'STOCK';
