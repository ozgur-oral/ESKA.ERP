ALTER TABLE "salesOrder" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMPTZ;
ALTER TABLE "salesOrder" ADD COLUMN IF NOT EXISTS "deliveryNote" TEXT;

ALTER TABLE "inventoryDevice" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMPTZ;
ALTER TABLE "inventoryDevice" ADD COLUMN IF NOT EXISTS "warrantyStartAt" TIMESTAMPTZ;
ALTER TABLE "inventoryDevice" ADD COLUMN IF NOT EXISTS "warrantyEndAt" TIMESTAMPTZ;
ALTER TABLE "inventoryDevice" ADD COLUMN IF NOT EXISTS "warrantyMonths" INTEGER NOT NULL DEFAULT 24;

CREATE INDEX IF NOT EXISTS "inventoryDevice_customer_status_idx" ON "inventoryDevice" ("customerId", "status");
CREATE INDEX IF NOT EXISTS "inventoryDevice_warranty_idx" ON "inventoryDevice" ("warrantyEndAt");
