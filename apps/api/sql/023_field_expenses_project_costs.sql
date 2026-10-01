
CREATE TABLE IF NOT EXISTS "fieldExpense" (
 id SERIAL PRIMARY KEY,"expenseNo" VARCHAR(40) NOT NULL UNIQUE,"operationId" INTEGER NULL REFERENCES "fieldOperation"(id) ON DELETE SET NULL,
 "projectId" INTEGER NULL REFERENCES project(id) ON DELETE SET NULL,"employeeId" INTEGER NULL REFERENCES employee(id) ON DELETE SET NULL,
 "companyId" INTEGER NULL REFERENCES "groupCompany"(id),
 category VARCHAR(30) NOT NULL CHECK(category IN ('FUEL','ACCOMMODATION','MEAL','TOLL','TRANSPORT','PARKING','PER_DIEM','MATERIAL','OTHER')),
 "expenseDate" DATE NOT NULL DEFAULT CURRENT_DATE,description TEXT NOT NULL,amount NUMERIC(14,2) NOT NULL CHECK(amount>=0),
 currency VARCHAR(3) NOT NULL DEFAULT 'TRY',status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','PAID')),
 "receiptDocumentId" INTEGER NULL REFERENCES document(id) ON DELETE SET NULL,"submittedBy" INTEGER NULL REFERENCES "user"(id),
 "approvedBy" INTEGER NULL REFERENCES "user"(id),"approvedAt" TIMESTAMPTZ NULL,"paidAt" TIMESTAMPTZ NULL,notes TEXT NULL,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS field_expense_project_idx ON "fieldExpense"("projectId","expenseDate");
CREATE INDEX IF NOT EXISTS field_expense_operation_idx ON "fieldExpense"("operationId","expenseDate");
CREATE INDEX IF NOT EXISTS field_expense_status_idx ON "fieldExpense"(status,"expenseDate");
