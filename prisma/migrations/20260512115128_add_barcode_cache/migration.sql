-- CreateTable
CREATE TABLE "BarcodeCache" (
    "id" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "name" TEXT,
    "brand" TEXT,
    "dosage" TEXT,
    "imageUrl" TEXT,
    "costPrice" DOUBLE PRECISION,
    "colesUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BarcodeCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BarcodeCache_barcode_key" ON "BarcodeCache"("barcode");
