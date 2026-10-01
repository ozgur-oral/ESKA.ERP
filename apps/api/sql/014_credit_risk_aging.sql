BEGIN;

ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "creditLimit" NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "riskPolicy" TEXT NOT NULL DEFAULT 'WARN' CHECK ("riskPolicy" IN ('WARN','BLOCK'));
ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "paymentTermDays" INTEGER NOT NULL DEFAULT 30 CHECK ("paymentTermDays" BETWEEN 0 AND 365);
ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "riskNotes" TEXT;

CREATE INDEX IF NOT EXISTS "financeDocument_customer_due_idx" ON "financeDocument"("customerId","dueDate") WHERE "partyType"='CUSTOMER';
CREATE INDEX IF NOT EXISTS "financeDocument_open_receivable_idx" ON "financeDocument"("direction","status","dueDate") WHERE "direction"='RECEIVABLE' AND "status" IN ('OPEN','PARTIAL');

COMMIT;
