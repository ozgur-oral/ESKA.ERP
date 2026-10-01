BEGIN;
CREATE TABLE IF NOT EXISTS "corsPackage" (
  "id" SERIAL PRIMARY KEY,
  "code" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "durationMonths" integer NOT NULL DEFAULT 12,
  "price" numeric(14,2) NOT NULL DEFAULT 0,
  "currency" text NOT NULL DEFAULT 'TRY',
  "maxDevices" integer NOT NULL DEFAULT 1,
  "description" text,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "corsSubscription" (
  "id" SERIAL PRIMARY KEY,
  "subscriptionNo" text NOT NULL UNIQUE,
  "customerId" integer NOT NULL REFERENCES "customer"("id"),
  "packageId" integer NOT NULL REFERENCES "corsPackage"("id"),
  "stationId" integer REFERENCES "corsStation"("id"),
  "username" text NOT NULL UNIQUE,
  "status" text NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('DRAFT','ACTIVE','SUSPENDED','EXPIRED','CANCELLED')),
  "paymentStatus" text NOT NULL DEFAULT 'PENDING' CHECK ("paymentStatus" IN ('PENDING','PAID','PARTIAL','OVERDUE','CANCELLED')),
  "startDate" date NOT NULL,
  "endDate" date NOT NULL,
  "amount" numeric(14,2) NOT NULL DEFAULT 0,
  "currency" text NOT NULL DEFAULT 'TRY',
  "notes" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "corsSubscriptionRenewal" (
  "id" SERIAL PRIMARY KEY,
  "subscriptionId" integer NOT NULL REFERENCES "corsSubscription"("id") ON DELETE CASCADE,
  "previousEndDate" date NOT NULL,
  "newEndDate" date NOT NULL,
  "amount" numeric(14,2) NOT NULL DEFAULT 0,
  "paymentStatus" text NOT NULL DEFAULT 'PENDING',
  "note" text,
  "renewedBy" integer,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "corsSubscription_customerId_idx" ON "corsSubscription"("customerId");
CREATE INDEX IF NOT EXISTS "corsSubscription_endDate_idx" ON "corsSubscription"("endDate");
CREATE INDEX IF NOT EXISTS "corsSubscription_status_idx" ON "corsSubscription"("status");
CREATE INDEX IF NOT EXISTS "corsSubscriptionRenewal_subscriptionId_idx" ON "corsSubscriptionRenewal"("subscriptionId");
INSERT INTO "corsPackage" ("code","name","durationMonths","price","currency","maxDevices","description") VALUES
('CORS-1M','KAYA CORS 1 Ay',1,1500,'TRY',1,'1 aylık standart CORS erişimi'),
('CORS-12M','KAYA CORS 12 Ay',12,12000,'TRY',1,'12 aylık standart CORS erişimi')
ON CONFLICT ("code") DO NOTHING;
COMMIT;
