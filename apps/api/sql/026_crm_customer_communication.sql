
CREATE TABLE IF NOT EXISTS "crmActivity" (
  id SERIAL PRIMARY KEY,
  "customerId" INTEGER NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  "contactName" VARCHAR(180) NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('CALL','MEETING','EMAIL','WHATSAPP','NOTE','VISIT','FOLLOW_UP','OTHER')),
  direction VARCHAR(20) NULL CHECK (direction IN ('INBOUND','OUTBOUND')),
  subject VARCHAR(240) NOT NULL,
  description TEXT NULL,
  outcome TEXT NULL,
  "activityAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "followUpAt" TIMESTAMPTZ NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PLANNED','COMPLETED','CANCELLED')),
  "assignedUserId" INTEGER NULL REFERENCES "user"(id) ON DELETE SET NULL,
  "createdBy" INTEGER NULL REFERENCES "user"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS crm_activity_customer_idx ON "crmActivity"("customerId","activityAt" DESC);
CREATE INDEX IF NOT EXISTS crm_activity_followup_idx ON "crmActivity"("followUpAt") WHERE status='PLANNED';

CREATE TABLE IF NOT EXISTS "crmCustomerNote" (
  id SERIAL PRIMARY KEY,
  "customerId" INTEGER NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  "isPinned" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdBy" INTEGER NULL REFERENCES "user"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS crm_note_customer_idx ON "crmCustomerNote"("customerId","isPinned" DESC,"createdAt" DESC);
