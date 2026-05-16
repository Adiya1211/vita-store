/*
  Warnings:

  - You are about to drop the column `costAUD` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `priceAUD` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `priceMNT` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the `Order` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrderItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Sale` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SaleItem` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `costPrice` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellingPrice` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalPrice` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'IMAGE', 'SELECT', 'USER_SELECT');

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "Sale" DROP CONSTRAINT "Sale_userId_fkey";

-- DropForeignKey
ALTER TABLE "SaleItem" DROP CONSTRAINT "SaleItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "SaleItem" DROP CONSTRAINT "SaleItem_saleId_fkey";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "costAUD",
DROP COLUMN "description",
DROP COLUMN "priceAUD",
DROP COLUMN "priceMNT",
DROP COLUMN "stock",
DROP COLUMN "unit",
ADD COLUMN     "assignedUserId" TEXT,
ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "costPrice" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "discountedPrice" DOUBLE PRECISION,
ADD COLUMN     "dosage" TEXT,
ADD COLUMN     "extraData" JSONB,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "sellingPrice" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "sequenceNumber" SERIAL NOT NULL,
ADD COLUMN     "store" TEXT,
ADD COLUMN     "totalPrice" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "password" TEXT NOT NULL;

-- DropTable
DROP TABLE "Order";

-- DropTable
DROP TABLE "OrderItem";

-- DropTable
DROP TABLE "Sale";

-- DropTable
DROP TABLE "SaleItem";

-- DropEnum
DROP TYPE "OrderStatus";

-- CreateTable
CREATE TABLE "FieldConfig" (
    "id" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" "FieldType" NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FieldConfig_fieldKey_key" ON "FieldConfig"("fieldKey");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
