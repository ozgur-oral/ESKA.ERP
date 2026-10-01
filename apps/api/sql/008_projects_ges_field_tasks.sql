CREATE TABLE IF NOT EXISTS "groupCompany" (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO "groupCompany" (code,name) VALUES
  ('KAYA_HARITA','Kaya Harita'),
  ('ESKA_GRUP','ESKA Grup')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS "project" (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  "customerId" INTEGER REFERENCES "customer"(id) ON DELETE SET NULL,
  "ownerCompanyId" INTEGER REFERENCES "groupCompany"(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'SURVEY' CHECK (type IN ('SURVEY','GES','CORS','SOFTWARE','OTHER')),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PLANNING' CHECK (status IN ('PLANNING','ACTIVE','ON_HOLD','COMPLETED','CANCELLED')),
  stage TEXT NOT NULL DEFAULT 'PLANLAMA',
  city TEXT,
  district TEXT,
  address TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  "acPowerMw" NUMERIC(12,3),
  "dcPowerMwp" NUMERIC(12,3),
  "startDate" DATE,
  "targetEndDate" DATE,
  "completedAt" TIMESTAMPTZ,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  description TEXT,
  "createdBy" INTEGER,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "project_customer_idx" ON "project"("customerId");
CREATE INDEX IF NOT EXISTS "project_status_idx" ON "project"(status);
CREATE INDEX IF NOT EXISTS "project_type_idx" ON "project"(type);

CREATE TABLE IF NOT EXISTS "projectAssignment" (
  id SERIAL PRIMARY KEY,
  "projectId" INTEGER NOT NULL REFERENCES "project"(id) ON DELETE CASCADE,
  "userId" INTEGER,
  "employeeName" TEXT NOT NULL,
  department TEXT,
  role TEXT NOT NULL DEFAULT 'TEAM_MEMBER',
  "homeCompanyId" INTEGER REFERENCES "groupCompany"(id) ON DELETE SET NULL,
  "assignedCompanyId" INTEGER REFERENCES "groupCompany"(id) ON DELETE SET NULL,
  "startDate" DATE,
  "endDate" DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PLANNED','ACTIVE','COMPLETED','CANCELLED')),
  notes TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "project_assignment_project_idx" ON "projectAssignment"("projectId");

CREATE TABLE IF NOT EXISTS "projectTask" (
  id SERIAL PRIMARY KEY,
  "projectId" INTEGER NOT NULL REFERENCES "project"(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'GENERAL' CHECK (category IN ('GENERAL','FIELD_SURVEY','GNSS','TOTAL_STATION','MAPPING','APPLICATION','DOCUMENTATION','DESIGN','ELECTRICAL','CIVIL')),
  status TEXT NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO','IN_PROGRESS','BLOCKED','DONE','CANCELLED')),
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
  "assignedUserId" INTEGER,
  "assignedPerson" TEXT,
  "plannedStartAt" TIMESTAMPTZ,
  "dueAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  location TEXT,
  notes TEXT,
  "createdBy" INTEGER,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("projectId",code)
);
CREATE INDEX IF NOT EXISTS "project_task_project_idx" ON "projectTask"("projectId");
CREATE INDEX IF NOT EXISTS "project_task_due_idx" ON "projectTask"("dueAt");

CREATE TABLE IF NOT EXISTS "projectMilestone" (
  id SERIAL PRIMARY KEY,
  "projectId" INTEGER NOT NULL REFERENCES "project"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED','DELAYED')),
  "targetDate" DATE,
  "completedAt" TIMESTAMPTZ,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "project_milestone_project_idx" ON "projectMilestone"("projectId");
