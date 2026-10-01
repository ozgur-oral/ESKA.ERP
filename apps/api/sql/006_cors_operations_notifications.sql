BEGIN;

CREATE TABLE IF NOT EXISTS "corsStationEvent" (
  "id" SERIAL PRIMARY KEY,
  "stationId" integer NOT NULL REFERENCES "corsStation"("id") ON DELETE CASCADE,
  "type" text NOT NULL CHECK ("type" IN ('ONLINE','OFFLINE','WARNING','MAINTENANCE_START','MAINTENANCE_END')),
  "status" text,
  "message" text,
  "occurredAt" timestamptz NOT NULL DEFAULT now(),
  "resolvedAt" timestamptz
);

CREATE TABLE IF NOT EXISTS "corsStationMaintenance" (
  "id" SERIAL PRIMARY KEY,
  "stationId" integer NOT NULL REFERENCES "corsStation"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text,
  "status" text NOT NULL DEFAULT 'PLANNED' CHECK ("status" IN ('PLANNED','IN_PROGRESS','COMPLETED','CANCELLED')),
  "scheduledAt" timestamptz NOT NULL,
  "completedAt" timestamptz,
  "createdBy" integer,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "notification" (
  "id" SERIAL PRIMARY KEY,
  "type" text NOT NULL,
  "severity" text NOT NULL DEFAULT 'INFO' CHECK ("severity" IN ('INFO','SUCCESS','WARNING','CRITICAL')),
  "title" text NOT NULL,
  "message" text NOT NULL,
  "entityType" text,
  "entityId" integer,
  "actionUrl" text,
  "dedupeKey" text UNIQUE,
  "isRead" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "readAt" timestamptz
);

CREATE INDEX IF NOT EXISTS "corsStationEvent_station_time_idx" ON "corsStationEvent"("stationId","occurredAt" DESC);
CREATE INDEX IF NOT EXISTS "corsStationMaintenance_station_idx" ON "corsStationMaintenance"("stationId");
CREATE INDEX IF NOT EXISTS "notification_read_created_idx" ON "notification"("isRead","createdAt" DESC);

COMMIT;
