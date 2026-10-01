CREATE TABLE IF NOT EXISTS "loginSecurity"(identifier VARCHAR(320) PRIMARY KEY,"failedCount" INTEGER NOT NULL DEFAULT 0,"lockedUntil" TIMESTAMPTZ NULL,"lastFailedAt" TIMESTAMPTZ NULL,"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS customer_name_search_idx ON customer (lower(name));
CREATE INDEX IF NOT EXISTS inventory_device_serial_idx ON "inventoryDevice" ("serialNumber");
CREATE INDEX IF NOT EXISTS service_customer_status_idx ON "serviceRecord" ("customerId",status,"createdAt" DESC);
CREATE INDEX IF NOT EXISTS support_customer_status_idx ON "supportTicket" ("customerId",status,"createdAt" DESC);
CREATE INDEX IF NOT EXISTS cors_subscription_customer_end_idx ON "corsSubscription" ("customerId","endDate",status);
CREATE INDEX IF NOT EXISTS finance_document_due_status_idx ON "financeDocument" ("dueDate",status,direction);
CREATE INDEX IF NOT EXISTS crm_activity_assignee_followup_idx ON "crmActivity" ("assignedUserId","followUpAt",status);