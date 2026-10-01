
CREATE TABLE IF NOT EXISTS department (
 id SERIAL PRIMARY KEY, code VARCHAR(50) NOT NULL UNIQUE, name VARCHAR(120) NOT NULL,
 "companyId" INTEGER NULL REFERENCES "groupCompany"(id), "managerEmployeeId" INTEGER NULL,
 "isActive" BOOLEAN NOT NULL DEFAULT TRUE, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS employee (
 id SERIAL PRIMARY KEY, "employeeNo" VARCHAR(40) NOT NULL UNIQUE, "userId" INTEGER NULL REFERENCES "user"(id),
 "companyId" INTEGER NOT NULL REFERENCES "groupCompany"(id), "departmentId" INTEGER NULL REFERENCES department(id),
 "managerId" INTEGER NULL REFERENCES employee(id), "firstName" VARCHAR(100) NOT NULL, "lastName" VARCHAR(100) NOT NULL,
 title VARCHAR(150) NULL, email VARCHAR(180) NULL, phone VARCHAR(50) NULL,
 "employmentType" VARCHAR(30) NOT NULL DEFAULT 'FULL_TIME' CHECK ("employmentType" IN ('FULL_TIME','PART_TIME','CONTRACTOR','INTERN')),
 status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','ON_LEAVE','PASSIVE')),
 "hireDate" DATE NULL, "terminationDate" DATE NULL, skills TEXT[] NOT NULL DEFAULT '{}', notes TEXT NULL,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DO $$ BEGIN ALTER TABLE department ADD CONSTRAINT "department_manager_fk" FOREIGN KEY ("managerEmployeeId") REFERENCES employee(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS "employeeAssignment" (
 id SERIAL PRIMARY KEY, "employeeId" INTEGER NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
 "homeCompanyId" INTEGER NOT NULL REFERENCES "groupCompany"(id), "assignedCompanyId" INTEGER NOT NULL REFERENCES "groupCompany"(id),
 "projectId" INTEGER NULL REFERENCES project(id) ON DELETE SET NULL,
 type VARCHAR(30) NOT NULL DEFAULT 'PROJECT' CHECK(type IN ('PROJECT','TEMPORARY','SUPPORT','FIELD','OTHER')),
 title VARCHAR(180) NOT NULL, description TEXT NULL, "startDate" DATE NOT NULL, "endDate" DATE NULL,
 status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('PLANNED','ACTIVE','COMPLETED','CANCELLED')),
 "createdBy" INTEGER NULL REFERENCES "user"(id), "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS employee_company_idx ON employee("companyId",status);
CREATE INDEX IF NOT EXISTS employee_department_idx ON employee("departmentId",status);
CREATE INDEX IF NOT EXISTS employee_assignment_idx ON "employeeAssignment"("employeeId",status,"startDate");
INSERT INTO department(code,name) VALUES
('MANAGEMENT','Yönetim'),('SALES','Satış'),('TECH_SUPPORT','Teknik Destek'),('TECH_SERVICE','Teknik Servis'),
('PROJECT','Proje'),('RD','Yazılım / Ar-Ge'),('FINANCE','Finans / Muhasebe'),('PURCHASING','Satın Alma'),
('FIELD','Saha Operasyonları'),('MARKETING','Pazarlama') ON CONFLICT(code) DO NOTHING;
