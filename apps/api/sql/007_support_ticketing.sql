CREATE TABLE IF NOT EXISTS "supportTicket" (
  "id" SERIAL PRIMARY KEY,
  "ticketNo" TEXT NOT NULL UNIQUE,
  "customerId" INTEGER NOT NULL REFERENCES "customer"("id"),
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "module" TEXT NOT NULL DEFAULT 'GENERAL',
  "channel" TEXT NOT NULL DEFAULT 'PHONE' CHECK ("channel" IN ('PHONE','EMAIL','WHATSAPP','WEB','INTERNAL')),
  "priority" TEXT NOT NULL DEFAULT 'NORMAL' CHECK ("priority" IN ('LOW','NORMAL','HIGH','URGENT')),
  "status" TEXT NOT NULL DEFAULT 'OPEN' CHECK ("status" IN ('OPEN','ASSIGNED','IN_PROGRESS','WAITING_CUSTOMER','RESOLVED','CLOSED')),
  "department" TEXT,
  "assignedUserId" INTEGER,
  "serviceRecordId" INTEGER REFERENCES "serviceRecord"("id") ON DELETE SET NULL,
  "deviceId" INTEGER REFERENCES "inventoryDevice"("id") ON DELETE SET NULL,
  "corsSubscriptionId" INTEGER REFERENCES "corsSubscription"("id") ON DELETE SET NULL,
  "slaFirstResponseDueAt" TIMESTAMPTZ NOT NULL,
  "slaResolutionDueAt" TIMESTAMPTZ NOT NULL,
  "firstRespondedAt" TIMESTAMPTZ,
  "resolvedAt" TIMESTAMPTZ,
  "closedAt" TIMESTAMPTZ,
  "resolution" TEXT,
  "createdBy" INTEGER,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "supportTicket_customer_idx" ON "supportTicket" ("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "supportTicket_status_idx" ON "supportTicket" ("status", "priority");
CREATE INDEX IF NOT EXISTS "supportTicket_assignee_idx" ON "supportTicket" ("assignedUserId", "status");
CREATE INDEX IF NOT EXISTS "supportTicket_sla_idx" ON "supportTicket" ("slaResolutionDueAt") WHERE "status" NOT IN ('RESOLVED','CLOSED');

CREATE TABLE IF NOT EXISTS "supportTicketComment" (
  "id" SERIAL PRIMARY KEY,
  "ticketId" INTEGER NOT NULL REFERENCES "supportTicket"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL DEFAULT 'COMMENT' CHECK ("type" IN ('COMMENT','INTERNAL_NOTE','STATUS_CHANGE','ASSIGNMENT')),
  "visibility" TEXT NOT NULL DEFAULT 'INTERNAL' CHECK ("visibility" IN ('INTERNAL','CUSTOMER')),
  "body" TEXT NOT NULL,
  "createdBy" INTEGER,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "supportTicketComment_ticket_idx" ON "supportTicketComment" ("ticketId", "createdAt");
