CREATE TABLE IF NOT EXISTS "integrationSyncJob" (
 id BIGSERIAL PRIMARY KEY,
 provider TEXT NOT NULL DEFAULT 'PARASUT',
 action TEXT NOT NULL,
 "entityType" TEXT NOT NULL,
 "localId" INTEGER NOT NULL,
 payload JSONB NOT NULL DEFAULT '{}'::jsonb,
 status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','PROCESSING','RETRY','SUCCESS','FAILED','CANCELLED')),
 attempts INTEGER NOT NULL DEFAULT 0,
 "maxAttempts" INTEGER NOT NULL DEFAULT 5,
 "nextAttemptAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
 "lockedAt" TIMESTAMPTZ,
 "lastError" TEXT,
 "externalId" TEXT,
 "createdBy" INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
 "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(provider,action,"entityType","localId")
);
CREATE INDEX IF NOT EXISTS integration_sync_job_due_idx ON "integrationSyncJob"(provider,status,"nextAttemptAt");
