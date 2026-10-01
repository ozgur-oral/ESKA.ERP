ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "stockQuantity" NUMERIC(12,3) NOT NULL DEFAULT 0;
ALTER TABLE "inventoryDevice" ADD COLUMN IF NOT EXISTS "soldAt" TIMESTAMPTZ;
ALTER TABLE "inventoryDevice" ADD COLUMN IF NOT EXISTS "salesOrderId" INTEGER;

CREATE TABLE IF NOT EXISTS "salesOrder" (
  "id" SERIAL PRIMARY KEY,
  "orderNo" TEXT NOT NULL UNIQUE,
  "quoteId" INTEGER UNIQUE REFERENCES "quote"("id"),
  "customerId" INTEGER NOT NULL REFERENCES "customer"("id"),
  "status" TEXT NOT NULL DEFAULT 'OPEN' CHECK ("status" IN ('OPEN','PREPARING','DELIVERED','CANCELLED')),
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "subtotal" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "vatTotal" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "grandTotal" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "createdBy" INTEGER REFERENCES "user"("id"),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "salesOrder_customer_idx" ON "salesOrder" ("customerId");

DO $$ BEGIN
  ALTER TABLE "inventoryDevice" ADD CONSTRAINT "inventoryDevice_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "salesOrder"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "salesOrderItem" (
  "id" SERIAL PRIMARY KEY,
  "salesOrderId" INTEGER NOT NULL REFERENCES "salesOrder"("id") ON DELETE CASCADE,
  "productId" INTEGER REFERENCES "product"("id"),
  "description" TEXT NOT NULL,
  "quantity" NUMERIC(12,3) NOT NULL DEFAULT 1,
  "unitPrice" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "vatRate" NUMERIC(5,2) NOT NULL DEFAULT 20,
  "lineTotal" NUMERIC(14,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "salesOrderItem_order_idx" ON "salesOrderItem" ("salesOrderId");

CREATE TABLE IF NOT EXISTS "stockMovement" (
  "id" SERIAL PRIMARY KEY,
  "productId" INTEGER NOT NULL REFERENCES "product"("id"),
  "deviceId" INTEGER REFERENCES "inventoryDevice"("id"),
  "type" TEXT NOT NULL CHECK ("type" IN ('IN','OUT','TRANSFER','ADJUSTMENT','SERVICE_IN','SERVICE_OUT')),
  "quantity" NUMERIC(12,3) NOT NULL DEFAULT 1,
  "referenceType" TEXT,
  "referenceId" INTEGER,
  "notes" TEXT,
  "createdBy" INTEGER REFERENCES "user"("id"),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "stockMovement_product_idx" ON "stockMovement" ("productId");
CREATE INDEX IF NOT EXISTS "stockMovement_created_idx" ON "stockMovement" ("createdAt");
