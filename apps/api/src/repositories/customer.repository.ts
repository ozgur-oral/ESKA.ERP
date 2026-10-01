import { query } from "../db/pool.js";

export type CustomerRow = {
  id: number; code: string; type: "COMPANY" | "PERSON"; name: string; taxOffice: string | null; taxNumber: string | null;
  contactName: string | null; email: string | null; phone: string | null; city: string | null; district: string | null;
  address: string | null; status: "ACTIVE" | "PASSIVE"; notes: string | null; creditLimit: string; riskPolicy: "WARN" | "BLOCK"; paymentTermDays: number; riskNotes: string | null; createdAt: Date; updatedAt: Date;
};

export type CustomerInput = Partial<Omit<CustomerRow, "id" | "createdAt" | "updatedAt">> & { name: string };

export async function findCustomers(search?: string) {
  const q = search?.trim();
  const result = q
    ? await query<CustomerRow>(`SELECT * FROM "customer" WHERE "name" ILIKE $1 OR COALESCE("contactName", '') ILIKE $1 OR COALESCE("phone", '') ILIKE $1 OR COALESCE("city", '') ILIKE $1 ORDER BY "id" DESC LIMIT 200`, [`%${q}%`])
    : await query<CustomerRow>(`SELECT * FROM "customer" ORDER BY "id" DESC LIMIT 200`);
  return result.rows;
}

export async function findCustomerById(id: number) {
  const result = await query<CustomerRow>(`SELECT * FROM "customer" WHERE "id" = $1 LIMIT 1`, [id]);
  return result.rows[0] ?? null;
}

export async function createCustomer(input: CustomerInput) {
  const code = input.code?.trim() || `MUS-${Date.now().toString().slice(-8)}`;
  const values = [code, input.type ?? "COMPANY", input.name.trim(), input.taxOffice ?? null, input.taxNumber ?? null, input.contactName ?? null, input.email ?? null, input.phone ?? null, input.city ?? null, input.district ?? null, input.address ?? null, input.status ?? "ACTIVE", input.notes ?? null, Number(input.creditLimit ?? 0), input.riskPolicy ?? "WARN", Number(input.paymentTermDays ?? 30), input.riskNotes ?? null];
  const result = await query<CustomerRow>(`INSERT INTO "customer" ("code","type","name","taxOffice","taxNumber","contactName","email","phone","city","district","address","status","notes","creditLimit","riskPolicy","paymentTermDays","riskNotes") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`, values);
  return result.rows[0];
}

export async function updateCustomer(id: number, input: Partial<CustomerInput>) {
  const current = await findCustomerById(id);
  if (!current) return null;
  const merged = { ...current, ...input };
  const result = await query<CustomerRow>(`UPDATE "customer" SET "type"=$2,"name"=$3,"taxOffice"=$4,"taxNumber"=$5,"contactName"=$6,"email"=$7,"phone"=$8,"city"=$9,"district"=$10,"address"=$11,"status"=$12,"notes"=$13,"creditLimit"=$14,"riskPolicy"=$15,"paymentTermDays"=$16,"riskNotes"=$17,"updatedAt"=now() WHERE "id"=$1 RETURNING *`, [id, merged.type, merged.name, merged.taxOffice, merged.taxNumber, merged.contactName, merged.email, merged.phone, merged.city, merged.district, merged.address, merged.status, merged.notes, Number(merged.creditLimit ?? 0), merged.riskPolicy ?? "WARN", Number(merged.paymentTermDays ?? 30), merged.riskNotes ?? null]);
  return result.rows[0] ?? null;
}
