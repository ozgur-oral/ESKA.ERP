CREATE TABLE IF NOT EXISTS "commercialInvoice" (
  id SERIAL PRIMARY KEY,
  "invoiceNo" TEXT NOT NULL UNIQUE,
  direction TEXT NOT NULL CHECK (direction IN ('SALE','PURCHASE')),
  "customerId" INTEGER REFERENCES "customer"(id),
  "supplierId" INTEGER REFERENCES "supplier"(id),
  "sourceType" TEXT NOT NULL,
  "sourceId" INTEGER NOT NULL,
  "issueDate" DATE NOT NULL DEFAULT CURRENT_DATE,
  "dueDate" DATE,
  currency TEXT NOT NULL DEFAULT 'TRY',
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  "vatTotal" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "grandTotal" NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','READY','SYNCED','CANCELLED','ERROR')),
  "externalProvider" TEXT,
  "externalId" TEXT,
  "externalNo" TEXT,
  "lastSyncAt" TIMESTAMPTZ,
  "syncError" TEXT,
  notes TEXT,
  "createdBy" INTEGER,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (direction,"sourceType","sourceId")
);

CREATE TABLE IF NOT EXISTS "commercialInvoiceItem" (
  id SERIAL PRIMARY KEY,
  "invoiceId" INTEGER NOT NULL REFERENCES "commercialInvoice"(id) ON DELETE CASCADE,
  "productId" INTEGER REFERENCES "product"(id),
  description TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
  "unitPrice" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "vatRate" NUMERIC(5,2) NOT NULL DEFAULT 20,
  "lineTotal" NUMERIC(14,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "integrationLink" (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "localId" INTEGER NOT NULL,
  "externalId" TEXT NOT NULL,
  "externalCode" TEXT,
  "lastSyncAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(provider,"entityType","localId"),
  UNIQUE(provider,"entityType","externalId")
);

CREATE TABLE IF NOT EXISTS "integrationSyncLog" (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  action TEXT NOT NULL,
  "entityType" TEXT,
  "localId" INTEGER,
  "externalId" TEXT,
  status TEXT NOT NULL CHECK (status IN ('SUCCESS','ERROR','SKIPPED')),
  message TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "commercialInvoice_status_idx" ON "commercialInvoice"(status);
CREATE INDEX IF NOT EXISTS "commercialInvoice_customer_idx" ON "commercialInvoice"("customerId");
CREATE INDEX IF NOT EXISTS "commercialInvoice_supplier_idx" ON "commercialInvoice"("supplierId");
CREATE INDEX IF NOT EXISTS "integrationSyncLog_provider_idx" ON "integrationSyncLog"(provider,"createdAt");
