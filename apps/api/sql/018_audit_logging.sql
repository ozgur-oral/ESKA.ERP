
CREATE TABLE IF NOT EXISTS "auditLog" (
  id BIGSERIAL PRIMARY KEY,
  "userId" INTEGER NULL,
  "userRole" VARCHAR(50) NULL,
  action VARCHAR(50) NOT NULL,
  module VARCHAR(80) NOT NULL,
  "entityType" VARCHAR(100) NULL,
  "entityId" VARCHAR(100) NULL,
  "entityLabel" VARCHAR(255) NULL,
  "requestMethod" VARCHAR(12) NULL,
  "requestPath" TEXT NULL,
  "ipAddress" VARCHAR(100) NULL,
  "userAgent" TEXT NULL,
  "requestId" VARCHAR(80) NULL,
  "oldValues" JSONB NULL,
  "newValues" JSONB NULL,
  metadata JSONB NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "auditLog_createdAt_idx" ON "auditLog" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "auditLog_userId_idx" ON "auditLog" ("userId");
CREATE INDEX IF NOT EXISTS "auditLog_entity_idx" ON "auditLog" ("entityType","entityId");
CREATE INDEX IF NOT EXISTS "auditLog_module_action_idx" ON "auditLog" (module,action);
