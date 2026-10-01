CREATE TABLE IF NOT EXISTS "customer" (
  "id" SERIAL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "type" TEXT NOT NULL DEFAULT 'COMPANY' CHECK ("type" IN ('COMPANY','PERSON')),
  "name" TEXT NOT NULL,
  "taxOffice" TEXT,
  "taxNumber" TEXT,
  "contactName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "city" TEXT,
  "district" TEXT,
  "address" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE','PASSIVE')),
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "customer_name_idx" ON "customer" ("name");
CREATE INDEX IF NOT EXISTS "customer_city_idx" ON "customer" ("city");

CREATE TABLE IF NOT EXISTS "product" (
  "id" SERIAL PRIMARY KEY,
  "sku" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "brand" TEXT,
  "category" TEXT,
  "unit" TEXT NOT NULL DEFAULT 'ADET',
  "salePrice" NUMERIC(14,2),
  "vatRate" NUMERIC(5,2) NOT NULL DEFAULT 20,
  "criticalStock" INTEGER NOT NULL DEFAULT 0,
  "isSerialized" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE','PASSIVE')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "inventoryDevice" (
  "id" SERIAL PRIMARY KEY,
  "productId" INTEGER NOT NULL REFERENCES "product"("id"),
  "serialNumber" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'IN_STOCK' CHECK ("status" IN ('IN_STOCK','SOLD','AT_CUSTOMER','IN_SERVICE','MAINTENANCE','RENTED','SCRAP')),
  "customerId" INTEGER REFERENCES "customer"("id"),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "inventoryDevice_product_idx" ON "inventoryDevice" ("productId");
CREATE INDEX IF NOT EXISTS "inventoryDevice_customer_idx" ON "inventoryDevice" ("customerId");

CREATE TABLE IF NOT EXISTS "quote" (
  "id" SERIAL PRIMARY KEY,
  "quoteNo" TEXT NOT NULL UNIQUE,
  "customerId" INTEGER NOT NULL REFERENCES "customer"("id"),
  "status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK ("status" IN ('DRAFT','SENT','APPROVED','REJECTED','EXPIRED','CANCELLED')),
  "validUntil" DATE,
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "subtotal" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "vatTotal" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "grandTotal" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdBy" INTEGER REFERENCES "user"("id"),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "quote_customer_idx" ON "quote" ("customerId");

CREATE TABLE IF NOT EXISTS "quoteItem" (
  "id" SERIAL PRIMARY KEY,
  "quoteId" INTEGER NOT NULL REFERENCES "quote"("id") ON DELETE CASCADE,
  "productId" INTEGER REFERENCES "product"("id"),
  "description" TEXT NOT NULL,
  "quantity" NUMERIC(12,3) NOT NULL DEFAULT 1,
  "unitPrice" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "vatRate" NUMERIC(5,2) NOT NULL DEFAULT 20,
  "lineTotal" NUMERIC(14,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "quoteItem_quote_idx" ON "quoteItem" ("quoteId");

CREATE TABLE IF NOT EXISTS "serviceRecord" (
  "id" SERIAL PRIMARY KEY,
  "serviceNo" TEXT NOT NULL UNIQUE,
  "customerId" INTEGER NOT NULL REFERENCES "customer"("id"),
  "deviceId" INTEGER REFERENCES "inventoryDevice"("id"),
  "serialNumber" TEXT,
  "deviceName" TEXT NOT NULL,
  "problem" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'WAITING' CHECK ("status" IN ('WAITING','EXAMINING','WAITING_PART','REPAIRING','TESTING','READY','DELIVERED','CANCELLED')),
  "priority" TEXT NOT NULL DEFAULT 'NORMAL' CHECK ("priority" IN ('LOW','NORMAL','HIGH','URGENT')),
  "assignedUserId" INTEGER REFERENCES "user"("id"),
  "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "completedAt" TIMESTAMPTZ,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "serviceRecord_customer_idx" ON "serviceRecord" ("customerId");
CREATE INDEX IF NOT EXISTS "serviceRecord_status_idx" ON "serviceRecord" ("status");

CREATE TABLE IF NOT EXISTS "corsStation" (
  "id" SERIAL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "city" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "ipAddress" TEXT,
  "port" INTEGER,
  "mountpoint" TEXT,
  "rtcmFormat" TEXT,
  "firmware" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE','WARNING','OFFLINE','MAINTENANCE')),
  "lastSeenAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "corsStation_status_idx" ON "corsStation" ("status");
