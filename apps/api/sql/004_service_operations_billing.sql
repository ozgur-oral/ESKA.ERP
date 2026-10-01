ALTER TABLE "serviceRecord" ADD COLUMN IF NOT EXISTS "serviceType" TEXT NOT NULL DEFAULT 'PAID';
ALTER TABLE "serviceRecord" ADD COLUMN IF NOT EXISTS "warrantyCovered" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "serviceRecord" ADD COLUMN IF NOT EXISTS "diagnosis" TEXT;
ALTER TABLE "serviceRecord" ADD COLUMN IF NOT EXISTS "resolution" TEXT;
ALTER TABLE "serviceRecord" ADD COLUMN IF NOT EXISTS "laborTotal" NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "serviceRecord" ADD COLUMN IF NOT EXISTS "partsTotal" NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "serviceRecord" ADD COLUMN IF NOT EXISTS "grandTotal" NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "serviceRecord" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID';

DO $$ BEGIN
  ALTER TABLE "serviceRecord" ADD CONSTRAINT "serviceRecord_serviceType_check" CHECK ("serviceType" IN ('WARRANTY','PAID','GOODWILL'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "serviceRecord" ADD CONSTRAINT "serviceRecord_paymentStatus_check" CHECK ("paymentStatus" IN ('UNPAID','PAID','NO_CHARGE'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "serviceOperation" (
  "id" SERIAL PRIMARY KEY,
  "serviceRecordId" INTEGER NOT NULL REFERENCES "serviceRecord"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL DEFAULT 'REPAIR' CHECK ("type" IN ('DIAGNOSTIC','REPAIR','TEST','NOTE','LABOR')),
  "description" TEXT NOT NULL,
  "laborMinutes" INTEGER NOT NULL DEFAULT 0,
  "amount" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "performedBy" INTEGER REFERENCES "user"("id"),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "serviceOperation_record_idx" ON "serviceOperation" ("serviceRecordId", "createdAt");

CREATE TABLE IF NOT EXISTS "servicePart" (
  "id" SERIAL PRIMARY KEY,
  "serviceRecordId" INTEGER NOT NULL REFERENCES "serviceRecord"("id") ON DELETE CASCADE,
  "productId" INTEGER NOT NULL REFERENCES "product"("id"),
  "quantity" NUMERIC(12,3) NOT NULL DEFAULT 1 CHECK ("quantity" > 0),
  "unitPrice" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "lineTotal" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "addedBy" INTEGER REFERENCES "user"("id"),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "servicePart_record_idx" ON "servicePart" ("serviceRecordId", "createdAt");

CREATE TABLE IF NOT EXISTS "serviceStatusHistory" (
  "id" SERIAL PRIMARY KEY,
  "serviceRecordId" INTEGER NOT NULL REFERENCES "serviceRecord"("id") ON DELETE CASCADE,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "note" TEXT,
  "changedBy" INTEGER REFERENCES "user"("id"),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "serviceStatusHistory_record_idx" ON "serviceStatusHistory" ("serviceRecordId", "createdAt");
