
CREATE TABLE IF NOT EXISTS "employeeLeave" (
 id SERIAL PRIMARY KEY,"employeeId" INTEGER NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
 type VARCHAR(30) NOT NULL CHECK(type IN ('ANNUAL','SICK','EXCUSE','UNPAID','OTHER')),
 status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
 "startDate" DATE NOT NULL,"endDate" DATE NOT NULL,reason TEXT NULL,"approvedBy" INTEGER NULL REFERENCES "user"(id),
 "createdBy" INTEGER NULL REFERENCES "user"(id),"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK("endDate">="startDate")
);
CREATE TABLE IF NOT EXISTS "employeeCertification" (
 id SERIAL PRIMARY KEY,"employeeId" INTEGER NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
 name VARCHAR(180) NOT NULL,issuer VARCHAR(180) NULL,"certificateNo" VARCHAR(100) NULL,
 "issuedAt" DATE NULL,"validUntil" DATE NULL,status VARCHAR(30) NOT NULL DEFAULT 'VALID' CHECK(status IN ('VALID','EXPIRED','SUSPENDED')),
 "documentId" INTEGER NULL REFERENCES document(id) ON DELETE SET NULL,notes TEXT NULL,"createdBy" INTEGER NULL REFERENCES "user"(id),"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "employeeTraining" (
 id SERIAL PRIMARY KEY,"employeeId" INTEGER NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
 title VARCHAR(180) NOT NULL,provider VARCHAR(180) NULL,status VARCHAR(30) NOT NULL DEFAULT 'PLANNED' CHECK(status IN ('PLANNED','IN_PROGRESS','COMPLETED','CANCELLED')),
 "startDate" DATE NULL,"endDate" DATE NULL,"completedAt" DATE NULL,score NUMERIC(5,2) NULL,notes TEXT NULL,"createdBy" INTEGER NULL REFERENCES "user"(id),"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS employee_leave_dates_idx ON "employeeLeave"("employeeId","startDate","endDate",status);
CREATE INDEX IF NOT EXISTS employee_cert_valid_idx ON "employeeCertification"("employeeId","validUntil",status);
CREATE INDEX IF NOT EXISTS employee_training_idx ON "employeeTraining"("employeeId",status);
