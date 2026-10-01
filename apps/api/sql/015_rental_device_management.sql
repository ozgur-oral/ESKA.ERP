DO $$ BEGIN
  ALTER TABLE "inventoryDevice" DROP CONSTRAINT IF EXISTS "inventoryDevice_status_check";
EXCEPTION WHEN undefined_object THEN NULL; END $$;
ALTER TABLE "inventoryDevice" ADD CONSTRAINT "inventoryDevice_status_check" CHECK ("status" IN ('IN_STOCK','SOLD','AT_CUSTOMER','IN_SERVICE','MAINTENANCE','RENTAL_RESERVED','RENTED','SCRAP'));

DO $$ BEGIN
  ALTER TABLE "stockMovement" DROP CONSTRAINT IF EXISTS "stockMovement_type_check";
EXCEPTION WHEN undefined_object THEN NULL; END $$;
ALTER TABLE "stockMovement" ADD CONSTRAINT "stockMovement_type_check" CHECK ("type" IN ('IN','OUT','TRANSFER','ADJUSTMENT','SERVICE_IN','SERVICE_OUT','RENTAL_OUT','RENTAL_RETURN'));

CREATE TABLE IF NOT EXISTS "rentalAgreement" (
  "id" SERIAL PRIMARY KEY,
  "rentalNo" TEXT NOT NULL UNIQUE,
  "customerId" INTEGER NOT NULL REFERENCES "customer"("id"),
  "type" TEXT NOT NULL DEFAULT 'RENTAL' CHECK ("type" IN ('RENTAL','DEMO','LOAN')),
  "status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK ("status" IN ('DRAFT','RESERVED','ACTIVE','OVERDUE','RETURNED','CANCELLED')),
  "billingPeriod" TEXT NOT NULL DEFAULT 'DAILY' CHECK ("billingPeriod" IN ('DAILY','MONTHLY','FIXED','FREE')),
  "startDate" DATE NOT NULL,
  "plannedReturnDate" DATE,
  "actualReturnDate" DATE,
  "dailyRate" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "monthlyRate" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "fixedAmount" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "depositAmount" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "depositStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED' CHECK ("depositStatus" IN ('NOT_REQUIRED','PENDING','RECEIVED','RETURNED','HELD')),
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "deliveryAddress" TEXT,
  "contactName" TEXT,
  "contactPhone" TEXT,
  "notes" TEXT,
  "createdBy" INTEGER REFERENCES "user"("id"),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "rentalAgreement_customer_idx" ON "rentalAgreement" ("customerId");
CREATE INDEX IF NOT EXISTS "rentalAgreement_status_idx" ON "rentalAgreement" ("status");
CREATE INDEX IF NOT EXISTS "rentalAgreement_return_idx" ON "rentalAgreement" ("plannedReturnDate");

CREATE TABLE IF NOT EXISTS "rentalItem" (
  "id" SERIAL PRIMARY KEY,
  "rentalId" INTEGER NOT NULL REFERENCES "rentalAgreement"("id") ON DELETE CASCADE,
  "deviceId" INTEGER NOT NULL REFERENCES "inventoryDevice"("id"),
  "checkoutCondition" TEXT,
  "returnCondition" TEXT,
  "checkoutAccessories" TEXT,
  "returnAccessories" TEXT,
  "deliveredAt" TIMESTAMPTZ,
  "returnedAt" TIMESTAMPTZ,
  "damageCharge" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  UNIQUE ("rentalId","deviceId")
);
CREATE INDEX IF NOT EXISTS "rentalItem_device_idx" ON "rentalItem" ("deviceId");

CREATE TABLE IF NOT EXISTS "rentalStatusHistory" (
  "id" SERIAL PRIMARY KEY,
  "rentalId" INTEGER NOT NULL REFERENCES "rentalAgreement"("id") ON DELETE CASCADE,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "note" TEXT,
  "changedBy" INTEGER REFERENCES "user"("id"),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "rentalStatusHistory_rental_idx" ON "rentalStatusHistory" ("rentalId","createdAt");
