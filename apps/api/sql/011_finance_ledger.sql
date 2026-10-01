
CREATE TABLE IF NOT EXISTS "financeAccount" (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('CASH','BANK')),
  currency TEXT NOT NULL DEFAULT 'TRY',
  "openingBalance" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "financeDocument" (
  id SERIAL PRIMARY KEY,
  "documentNo" TEXT NOT NULL UNIQUE,
  "partyType" TEXT NOT NULL CHECK ("partyType" IN ('CUSTOMER','SUPPLIER')),
  "customerId" INTEGER REFERENCES "customer"(id),
  "supplierId" INTEGER REFERENCES "supplier"(id),
  direction TEXT NOT NULL CHECK (direction IN ('RECEIVABLE','PAYABLE')),
  "sourceType" TEXT NOT NULL,
  "sourceId" INTEGER NOT NULL,
  description TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TRY',
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  "paidAmount" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "dueDate" DATE,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','PARTIAL','PAID','CANCELLED')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("sourceType","sourceId")
);
CREATE INDEX IF NOT EXISTS "financeDocument_customer_idx" ON "financeDocument"("customerId");
CREATE INDEX IF NOT EXISTS "financeDocument_supplier_idx" ON "financeDocument"("supplierId");
CREATE INDEX IF NOT EXISTS "financeDocument_status_idx" ON "financeDocument"(status);

CREATE TABLE IF NOT EXISTS "financeTransaction" (
  id SERIAL PRIMARY KEY,
  "transactionNo" TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('RECEIPT','PAYMENT','ADJUSTMENT')),
  "accountId" INTEGER NOT NULL REFERENCES "financeAccount"(id),
  "partyType" TEXT CHECK ("partyType" IN ('CUSTOMER','SUPPLIER')),
  "customerId" INTEGER REFERENCES "customer"(id),
  "supplierId" INTEGER REFERENCES "supplier"(id),
  currency TEXT NOT NULL DEFAULT 'TRY',
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  "transactionDate" DATE NOT NULL DEFAULT CURRENT_DATE,
  "createdBy" INTEGER,
  "createdByName" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "financeAllocation" (
  id SERIAL PRIMARY KEY,
  "transactionId" INTEGER NOT NULL REFERENCES "financeTransaction"(id) ON DELETE CASCADE,
  "documentId" INTEGER NOT NULL REFERENCES "financeDocument"(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("transactionId","documentId")
);

INSERT INTO "financeAccount"(code,name,type,currency) VALUES
('KASA-TRY','Merkez Kasa','CASH','TRY'),
('BANKA-TRY','Ana Banka Hesabı','BANK','TRY')
ON CONFLICT (code) DO NOTHING;
