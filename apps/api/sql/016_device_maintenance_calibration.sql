ALTER TABLE "inventoryDevice"
  ADD COLUMN IF NOT EXISTS "lastMaintenanceAt" DATE,
  ADD COLUMN IF NOT EXISTS "nextMaintenanceAt" DATE,
  ADD COLUMN IF NOT EXISTS "lastCalibrationAt" DATE,
  ADD COLUMN IF NOT EXISTS "nextCalibrationAt" DATE,
  ADD COLUMN IF NOT EXISTS "maintenanceIntervalMonths" INTEGER,
  ADD COLUMN IF NOT EXISTS "calibrationIntervalMonths" INTEGER;

CREATE TABLE IF NOT EXISTS "deviceMaintenanceRecord" (
  "id" SERIAL PRIMARY KEY,
  "maintenanceNo" TEXT NOT NULL UNIQUE,
  "deviceId" INTEGER NOT NULL REFERENCES "inventoryDevice"("id"),
  "type" TEXT NOT NULL DEFAULT 'PERIODIC' CHECK ("type" IN ('PERIODIC','CORRECTIVE','INSPECTION','RENTAL_RETURN','SERVICE_FOLLOWUP','OTHER')),
  "status" TEXT NOT NULL DEFAULT 'PLANNED' CHECK ("status" IN ('PLANNED','IN_PROGRESS','COMPLETED','CANCELLED')),
  "scheduledDate" DATE,
  "startedAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "provider" TEXT,
  "technician" TEXT,
  "description" TEXT,
  "result" TEXT,
  "cost" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "nextDueDate" DATE,
  "serviceRecordId" INTEGER REFERENCES "serviceRecord"("id"),
  "rentalId" INTEGER REFERENCES "rentalAgreement"("id"),
  "createdBy" INTEGER REFERENCES "user"("id"),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "deviceMaintenanceRecord_device_idx" ON "deviceMaintenanceRecord" ("deviceId","createdAt");
CREATE INDEX IF NOT EXISTS "deviceMaintenanceRecord_due_idx" ON "deviceMaintenanceRecord" ("scheduledDate","status");

CREATE TABLE IF NOT EXISTS "deviceCalibrationRecord" (
  "id" SERIAL PRIMARY KEY,
  "calibrationNo" TEXT NOT NULL UNIQUE,
  "deviceId" INTEGER NOT NULL REFERENCES "inventoryDevice"("id"),
  "status" TEXT NOT NULL DEFAULT 'PLANNED' CHECK ("status" IN ('PLANNED','IN_PROGRESS','PASSED','FAILED','CANCELLED')),
  "scheduledDate" DATE,
  "calibratedAt" DATE,
  "validUntil" DATE,
  "provider" TEXT,
  "technician" TEXT,
  "standardReference" TEXT,
  "result" TEXT,
  "notes" TEXT,
  "cost" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "createdBy" INTEGER REFERENCES "user"("id"),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "deviceCalibrationRecord_device_idx" ON "deviceCalibrationRecord" ("deviceId","createdAt");
CREATE INDEX IF NOT EXISTS "deviceCalibrationRecord_valid_idx" ON "deviceCalibrationRecord" ("validUntil","status");

CREATE TABLE IF NOT EXISTS "deviceCertificate" (
  "id" SERIAL PRIMARY KEY,
  "deviceId" INTEGER NOT NULL REFERENCES "inventoryDevice"("id"),
  "calibrationId" INTEGER REFERENCES "deviceCalibrationRecord"("id") ON DELETE SET NULL,
  "type" TEXT NOT NULL DEFAULT 'CALIBRATION' CHECK ("type" IN ('CALIBRATION','MAINTENANCE','TEST','CONFORMITY','WARRANTY','OTHER')),
  "certificateNo" TEXT NOT NULL,
  "issuer" TEXT,
  "issuedAt" DATE,
  "validUntil" DATE,
  "fileName" TEXT,
  "fileUrl" TEXT,
  "notes" TEXT,
  "createdBy" INTEGER REFERENCES "user"("id"),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("deviceId","certificateNo")
);
CREATE INDEX IF NOT EXISTS "deviceCertificate_device_idx" ON "deviceCertificate" ("deviceId","createdAt");
CREATE INDEX IF NOT EXISTS "deviceCertificate_valid_idx" ON "deviceCertificate" ("validUntil");
