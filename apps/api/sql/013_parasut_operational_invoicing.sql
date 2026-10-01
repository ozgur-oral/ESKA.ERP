ALTER TABLE "commercialInvoice" ADD COLUMN IF NOT EXISTS "eDocumentType" TEXT NOT NULL DEFAULT 'AUTO';
ALTER TABLE "commercialInvoice" ADD COLUMN IF NOT EXISTS "eDocumentStatus" TEXT NOT NULL DEFAULT 'NOT_SENT';
ALTER TABLE "commercialInvoice" ADD COLUMN IF NOT EXISTS "scenario" TEXT NOT NULL DEFAULT 'COMMERCIAL';
ALTER TABLE "commercialInvoice" ADD COLUMN IF NOT EXISTS "recipientAlias" TEXT;
ALTER TABLE "commercialInvoice" ADD COLUMN IF NOT EXISTS "taxExemptionCode" TEXT;
ALTER TABLE "commercialInvoice" ADD COLUMN IF NOT EXISTS "taxExemptionReason" TEXT;
ALTER TABLE "commercialInvoice" ADD COLUMN IF NOT EXISTS "accountingReady" BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE "commercialInvoice" ADD CONSTRAINT "commercialInvoice_eDocumentType_check" CHECK ("eDocumentType" IN ('AUTO','E_INVOICE','E_ARCHIVE','PAPER'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "commercialInvoice" ADD CONSTRAINT "commercialInvoice_eDocumentStatus_check" CHECK ("eDocumentStatus" IN ('NOT_SENT','READY','SENT','ACCEPTED','REJECTED','CANCELLED','ERROR'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "parasutAccountMapping" (
  id SERIAL PRIMARY KEY,
  "financeAccountId" INTEGER NOT NULL UNIQUE REFERENCES "financeAccount"(id) ON DELETE CASCADE,
  "externalAccountId" TEXT NOT NULL,
  "externalAccountName" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "commercialInvoice_issueDate_idx" ON "commercialInvoice"("issueDate");
CREATE INDEX IF NOT EXISTS "commercialInvoice_source_idx" ON "commercialInvoice"("sourceType","sourceId");
