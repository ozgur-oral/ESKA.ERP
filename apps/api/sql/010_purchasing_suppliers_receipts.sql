CREATE TABLE IF NOT EXISTS "supplier" (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  "taxOffice" TEXT,
  "taxNumber" TEXT,
  "contactName" TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PASSIVE')),
  notes TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "purchaseRequest" (
  id SERIAL PRIMARY KEY,
  "requestNo" TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','ORDERED','CANCELLED')),
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
  "requestedBy" INTEGER,
  "requestedByName" TEXT,
  "neededBy" DATE,
  notes TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "purchaseRequestItem" (
  id SERIAL PRIMARY KEY,
  "requestId" INTEGER NOT NULL REFERENCES "purchaseRequest"(id) ON DELETE CASCADE,
  "productId" INTEGER NOT NULL REFERENCES "product"(id),
  quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  note TEXT
);

CREATE TABLE IF NOT EXISTS "supplierQuote" (
  id SERIAL PRIMARY KEY,
  "quoteNo" TEXT NOT NULL UNIQUE,
  "supplierId" INTEGER NOT NULL REFERENCES "supplier"(id),
  "requestId" INTEGER REFERENCES "purchaseRequest"(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED','SELECTED','REJECTED')),
  currency TEXT NOT NULL DEFAULT 'TRY',
  "validUntil" DATE,
  "grandTotal" NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "supplierQuoteItem" (
  id SERIAL PRIMARY KEY,
  "supplierQuoteId" INTEGER NOT NULL REFERENCES "supplierQuote"(id) ON DELETE CASCADE,
  "productId" INTEGER NOT NULL REFERENCES "product"(id),
  quantity NUMERIC(12,3) NOT NULL,
  "unitPrice" NUMERIC(14,2) NOT NULL,
  "lineTotal" NUMERIC(14,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS "purchaseOrder" (
  id SERIAL PRIMARY KEY,
  "orderNo" TEXT NOT NULL UNIQUE,
  "supplierId" INTEGER NOT NULL REFERENCES "supplier"(id),
  "requestId" INTEGER REFERENCES "purchaseRequest"(id) ON DELETE SET NULL,
  "supplierQuoteId" INTEGER REFERENCES "supplierQuote"(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','PARTIAL','RECEIVED','CANCELLED')),
  currency TEXT NOT NULL DEFAULT 'TRY',
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  "vatTotal" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "grandTotal" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "expectedAt" DATE,
  notes TEXT,
  "createdBy" INTEGER,
  "createdByName" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "purchaseOrderItem" (
  id SERIAL PRIMARY KEY,
  "orderId" INTEGER NOT NULL REFERENCES "purchaseOrder"(id) ON DELETE CASCADE,
  "productId" INTEGER NOT NULL REFERENCES "product"(id),
  description TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  "receivedQuantity" NUMERIC(12,3) NOT NULL DEFAULT 0,
  "unitPrice" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "vatRate" NUMERIC(5,2) NOT NULL DEFAULT 20,
  "lineTotal" NUMERIC(14,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "goodsReceipt" (
  id SERIAL PRIMARY KEY,
  "receiptNo" TEXT NOT NULL UNIQUE,
  "orderId" INTEGER NOT NULL REFERENCES "purchaseOrder"(id),
  "supplierId" INTEGER NOT NULL REFERENCES "supplier"(id),
  "deliveryNoteNo" TEXT,
  "receivedBy" INTEGER,
  "receivedByName" TEXT,
  notes TEXT,
  "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "goodsReceiptItem" (
  id SERIAL PRIMARY KEY,
  "receiptId" INTEGER NOT NULL REFERENCES "goodsReceipt"(id) ON DELETE CASCADE,
  "orderItemId" INTEGER NOT NULL REFERENCES "purchaseOrderItem"(id),
  "productId" INTEGER NOT NULL REFERENCES "product"(id),
  quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  "serialNumbers" JSONB NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS "purchaseRequest_status_idx" ON "purchaseRequest"(status);
CREATE INDEX IF NOT EXISTS "purchaseOrder_status_idx" ON "purchaseOrder"(status);
CREATE INDEX IF NOT EXISTS "purchaseOrder_supplier_idx" ON "purchaseOrder"("supplierId");
CREATE INDEX IF NOT EXISTS "goodsReceipt_order_idx" ON "goodsReceipt"("orderId");
