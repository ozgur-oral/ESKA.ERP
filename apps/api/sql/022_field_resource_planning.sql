
CREATE TABLE IF NOT EXISTS "fieldResource" (
 id SERIAL PRIMARY KEY,code VARCHAR(50) NOT NULL UNIQUE,name VARCHAR(180) NOT NULL,
 type VARCHAR(30) NOT NULL CHECK(type IN ('VEHICLE','GNSS','TOTAL_STATION','DRONE','CONTROLLER','ACCESSORY','OTHER')),
 "inventoryDeviceId" INTEGER NULL REFERENCES "inventoryDevice"(id) ON DELETE SET NULL,
 "companyId" INTEGER NULL REFERENCES "groupCompany"(id),brand VARCHAR(100) NULL,model VARCHAR(100) NULL,
 "plateNo" VARCHAR(30) NULL,"serialNumber" VARCHAR(120) NULL,
 status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE' CHECK(status IN ('AVAILABLE','IN_USE','MAINTENANCE','OUT_OF_SERVICE')),
 notes TEXT NULL,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "fieldOperationResource" (
 id SERIAL PRIMARY KEY,"operationId" INTEGER NOT NULL REFERENCES "fieldOperation"(id) ON DELETE CASCADE,
 "resourceId" INTEGER NOT NULL REFERENCES "fieldResource"(id),
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE("operationId","resourceId")
);
CREATE INDEX IF NOT EXISTS field_resource_type_status_idx ON "fieldResource"(type,status);
CREATE INDEX IF NOT EXISTS field_operation_resource_idx ON "fieldOperationResource"("resourceId","operationId");
