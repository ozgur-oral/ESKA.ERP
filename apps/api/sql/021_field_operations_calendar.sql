
CREATE TABLE IF NOT EXISTS "fieldOperation" (
 id SERIAL PRIMARY KEY,"operationNo" VARCHAR(40) NOT NULL UNIQUE,
 type VARCHAR(30) NOT NULL CHECK(type IN ('PROJECT','SERVICE_VISIT','CORS_MAINTENANCE','SURVEY','DELIVERY','INSTALLATION','OTHER')),
 status VARCHAR(30) NOT NULL DEFAULT 'PLANNED' CHECK(status IN ('PLANNED','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED')),
 title VARCHAR(200) NOT NULL,description TEXT NULL,"companyId" INTEGER NULL REFERENCES "groupCompany"(id),
 "customerId" INTEGER NULL REFERENCES customer(id),"projectId" INTEGER NULL REFERENCES project(id),
 "serviceRecordId" INTEGER NULL REFERENCES "serviceRecord"(id),"corsMaintenanceId" INTEGER NULL REFERENCES "corsStationMaintenance"(id),
 "startAt" TIMESTAMPTZ NOT NULL,"endAt" TIMESTAMPTZ NOT NULL,city VARCHAR(100) NULL,district VARCHAR(100) NULL,address TEXT NULL,
 latitude NUMERIC(10,7) NULL,longitude NUMERIC(10,7) NULL,priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL' CHECK(priority IN ('LOW','NORMAL','HIGH','URGENT')),
 notes TEXT NULL,"createdBy" INTEGER NULL REFERENCES "user"(id),"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK("endAt">"startAt")
);
CREATE TABLE IF NOT EXISTS "fieldOperationEmployee" (
 id SERIAL PRIMARY KEY,"operationId" INTEGER NOT NULL REFERENCES "fieldOperation"(id) ON DELETE CASCADE,
 "employeeId" INTEGER NOT NULL REFERENCES employee(id),role VARCHAR(100) NULL,"isLead" BOOLEAN NOT NULL DEFAULT FALSE,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE("operationId","employeeId")
);
CREATE INDEX IF NOT EXISTS field_operation_dates_idx ON "fieldOperation"("startAt","endAt",status);
CREATE INDEX IF NOT EXISTS field_operation_employee_idx ON "fieldOperationEmployee"("employeeId","operationId");
