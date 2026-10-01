CREATE TABLE IF NOT EXISTS "workTask" (
  id SERIAL PRIMARY KEY,
  "taskNo" TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  "sourceType" TEXT NOT NULL DEFAULT 'GENERAL' CHECK ("sourceType" IN ('GENERAL','PROJECT','SUPPORT','SERVICE','CORS','SALES','MANAGEMENT')),
  "sourceId" INTEGER,
  "sourceLabel" TEXT,
  status TEXT NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO','IN_PROGRESS','WAITING','BLOCKED','DONE','CANCELLED')),
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
  "assignedUserId" INTEGER,
  "assignedUserName" TEXT,
  department TEXT,
  "companyId" INTEGER REFERENCES "groupCompany"(id) ON DELETE SET NULL,
  "companyName" TEXT,
  "createdBy" INTEGER,
  "createdByName" TEXT,
  "startAt" TIMESTAMPTZ,
  "dueAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  notes TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "workTask_assignee_status_idx" ON "workTask"("assignedUserId",status);
CREATE INDEX IF NOT EXISTS "workTask_due_idx" ON "workTask"("dueAt") WHERE status NOT IN ('DONE','CANCELLED');
CREATE INDEX IF NOT EXISTS "workTask_source_idx" ON "workTask"("sourceType","sourceId");
