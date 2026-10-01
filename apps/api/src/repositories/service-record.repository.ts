import { pool, query } from "../db/pool.js";

type ServiceRow = {
  id:number; serviceNo:string; customerId:number; deviceId:number|null; serialNumber:string|null; deviceName:string;
  problem:string; status:string; priority:string; assignedUserId:number|null; receivedAt:Date; completedAt:Date|null;
  notes:string|null; customerName:string; productName?:string|null; serviceType:string; warrantyCovered:boolean;
  diagnosis:string|null; resolution:string|null; laborTotal:string; partsTotal:string; grandTotal:string; paymentStatus:string;
};
export type ServiceInput = { customerId:number; deviceId?:number|null; serialNumber?:string|null; deviceName?:string; problem:string; status?:string; priority?:string; assignedUserId?:number|null; notes?:string|null; serviceType?:string; warrantyCovered?:boolean };
export type ServiceOperationInput = { type?:string; description:string; laborMinutes?:number; amount?:number };
export type ServicePartInput = { productId:number; quantity:number; unitPrice?:number };
export type ServiceBillingInput = { serviceType?:string; warrantyCovered?:boolean; diagnosis?:string|null; resolution?:string|null; paymentStatus?:string };

const SERVICE_SELECT=`SELECT s.*, c."name" AS "customerName", p."name" AS "productName" FROM "serviceRecord" s JOIN "customer" c ON c."id"=s."customerId" LEFT JOIN "inventoryDevice" d ON d.id=s."deviceId" LEFT JOIN "product" p ON p.id=d."productId"`;

export async function findServiceRecords(status?: string) {
  const values: unknown[] = [];
  const where = status ? `WHERE s."status" = $1` : "";
  if (status) values.push(status);
  const result = await query<ServiceRow>(`${SERVICE_SELECT} ${where} ORDER BY s."receivedAt" DESC LIMIT 200`, values);
  return result.rows;
}

export async function findServiceRecordById(id:number) {
  const r=await query<ServiceRow>(`${SERVICE_SELECT} WHERE s."id"=$1`,[id]);
  const record=r.rows[0];
  if(!record)return null;
  const [operations,parts,history]=await Promise.all([
    query<any>(`SELECT o.*, COALESCE(u."firstName" || ' ' || u."lastName", u.username) AS "performedByName" FROM "serviceOperation" o LEFT JOIN "user" u ON u.id=o."performedBy" WHERE o."serviceRecordId"=$1 ORDER BY o."createdAt" DESC`,[id]),
    query<any>(`SELECT sp.*, p.name AS "productName",p.sku FROM "servicePart" sp JOIN product p ON p.id=sp."productId" WHERE sp."serviceRecordId"=$1 ORDER BY sp."createdAt" DESC`,[id]),
    query<any>(`SELECT h.*, COALESCE(u."firstName" || ' ' || u."lastName", u.username) AS "changedByName" FROM "serviceStatusHistory" h LEFT JOIN "user" u ON u.id=h."changedBy" WHERE h."serviceRecordId"=$1 ORDER BY h."createdAt" DESC`,[id])
  ]);
  return {...record,operations:operations.rows,parts:parts.rows,statusHistory:history.rows};
}

export async function createServiceRecord(input:ServiceInput,userId?:number) {
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    let device:any=null;
    if(input.deviceId){
      device=(await client.query<any>(`SELECT d.*,p.name AS "productName" FROM "inventoryDevice" d JOIN "product" p ON p.id=d."productId" WHERE d.id=$1 AND d."customerId"=$2 FOR UPDATE`,[input.deviceId,input.customerId])).rows[0];
      if(!device) throw new Error("Seçilen cihaz bu müşteriye ait değil.");
      if(device.status==='IN_SERVICE') throw new Error("Bu cihaz zaten serviste görünüyor.");
    }
    const no=`SRV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const deviceName=input.deviceName?.trim()||device?.productName;
    if(!deviceName) throw new Error("Cihaz bilgisi zorunludur.");
    const serial=input.serialNumber?.trim()||device?.serialNumber||null;
    let warrantyCovered=Boolean(input.warrantyCovered);
    let serviceType=input.serviceType??"PAID";
    if(device?.warrantyEndAt && new Date(device.warrantyEndAt).getTime()>=Date.now()){warrantyCovered=true;serviceType="WARRANTY";}
    const r=await client.query<ServiceRow>(`INSERT INTO "serviceRecord" ("serviceNo","customerId","deviceId","serialNumber","deviceName","problem","status","priority","assignedUserId","notes","serviceType","warrantyCovered") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *, ''::text AS "customerName"`,[no,input.customerId,input.deviceId??null,serial,deviceName,input.problem,input.status??"WAITING",input.priority??"NORMAL",input.assignedUserId??null,input.notes??null,serviceType,warrantyCovered]);
    await client.query(`INSERT INTO "serviceStatusHistory" ("serviceRecordId","fromStatus","toStatus","note","changedBy") VALUES ($1,NULL,$2,'Servis kaydı açıldı',$3)`,[r.rows[0].id,r.rows[0].status,userId??null]);
    if(device){
      await client.query(`UPDATE "inventoryDevice" SET status='IN_SERVICE',"updatedAt"=now() WHERE id=$1`,[device.id]);
      await client.query(`INSERT INTO "stockMovement" ("productId","deviceId","type","quantity","referenceType","referenceId","notes","createdBy") VALUES ($1,$2,'SERVICE_IN',1,'SERVICE_RECORD',$3,'Cihaz teknik servise kabul edildi',$4)`,[device.productId,device.id,r.rows[0].id,userId??null]);
    }
    await client.query("COMMIT");
    return r.rows[0];
  }catch(e){await client.query("ROLLBACK");throw e}finally{client.release()}
}


async function recalcTotals(
  client: any,
  id: number
) {
  const sums = (
    await client.query(
      `SELECT
        COALESCE(
          (
            SELECT SUM(amount)
            FROM "serviceOperation"
            WHERE "serviceRecordId" = $1
          ),
          0
        )::numeric AS labor,

        COALESCE(
          (
            SELECT SUM("lineTotal")
            FROM "servicePart"
            WHERE "serviceRecordId" = $1
          ),
          0
        )::numeric AS parts`,
      [id]
    )
  ).rows[0];

  const service = (
    await client.query(
      `SELECT
        "warrantyCovered",
        "serviceType"
       FROM "serviceRecord"
       WHERE id = $1`,
      [id]
    )
  ).rows[0];

  const grand =
    service?.warrantyCovered ||
    service?.serviceType === "WARRANTY" ||
    service?.serviceType === "GOODWILL"
      ? 0
      : Number(sums.labor) + Number(sums.parts);

  await client.query(
    `UPDATE "serviceRecord"
     SET
       "laborTotal" = $2,
       "partsTotal" = $3,
       "grandTotal" = $4,
       "paymentStatus" =
         CASE
           WHEN $4 = 0 THEN 'NO_CHARGE'
           WHEN "paymentStatus" = 'NO_CHARGE'
             THEN 'UNPAID'
           ELSE "paymentStatus"
         END,
       "updatedAt" = now()
     WHERE id = $1`,
    [
      id,
      sums.labor,
      sums.parts,
      grand,
    ]
  );
}

export async function addServiceOperation(id:number,input:ServiceOperationInput,userId?:number){
  const client=await pool.connect();
  try{await client.query("BEGIN");
    const exists=(await client.query(`SELECT id FROM "serviceRecord" WHERE id=$1`,[id])).rowCount;
    if(!exists)throw new Error("Servis kaydı bulunamadı.");
    const r=await client.query<any>(`INSERT INTO "serviceOperation" ("serviceRecordId","type","description","laborMinutes","amount","performedBy") VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,[id,input.type??'REPAIR',input.description,Math.max(0,Number(input.laborMinutes??0)),Math.max(0,Number(input.amount??0)),userId??null]);
    await recalcTotals(client,id);await client.query("COMMIT");return r.rows[0];
  }catch(e){await client.query("ROLLBACK");throw e}finally{client.release()}
}

export async function addServicePart(id:number,input:ServicePartInput,userId?:number){
  const client=await pool.connect();
  try{await client.query("BEGIN");
    const service=(await client.query<any>(`SELECT id FROM "serviceRecord" WHERE id=$1 FOR UPDATE`,[id])).rows[0];if(!service)throw new Error("Servis kaydı bulunamadı.");
    const product=(await client.query<any>(`SELECT * FROM product WHERE id=$1 FOR UPDATE`,[input.productId])).rows[0];if(!product)throw new Error("Ürün bulunamadı.");
    if(product.isSerialized)throw new Error("Seri takipli cihaz yedek parça olarak kullanılamaz.");
    const qty=Number(input.quantity);if(!Number.isFinite(qty)||qty<=0)throw new Error("Miktar sıfırdan büyük olmalıdır.");
    if(Number(product.stockQuantity)<qty)throw new Error(`Yetersiz stok. Mevcut: ${product.stockQuantity} ${product.unit}`);
    const unitPrice=Number(input.unitPrice??product.salePrice??0);const lineTotal=qty*unitPrice;
    const r=await client.query<any>(`INSERT INTO "servicePart" ("serviceRecordId","productId","quantity","unitPrice","lineTotal","addedBy") VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,[id,input.productId,qty,unitPrice,lineTotal,userId??null]);
    await client.query(`UPDATE product SET "stockQuantity"="stockQuantity"-$2,"updatedAt"=now() WHERE id=$1`,[input.productId,qty]);
    await client.query(`INSERT INTO "stockMovement" ("productId","type","quantity","referenceType","referenceId","notes","createdBy") VALUES ($1,'OUT',$2,'SERVICE_RECORD',$3,'Teknik serviste yedek parça kullanımı',$4)`,[input.productId,qty,id,userId??null]);
    await recalcTotals(client,id);await client.query("COMMIT");return r.rows[0];
  }catch(e){await client.query("ROLLBACK");throw e}finally{client.release()}
}

export async function updateServiceBilling(id:number,input:ServiceBillingInput){
  const r=await query<ServiceRow>(`UPDATE "serviceRecord" SET "serviceType"=COALESCE($2,"serviceType"),"warrantyCovered"=COALESCE($3,"warrantyCovered"),"diagnosis"=COALESCE($4,"diagnosis"),"resolution"=COALESCE($5,"resolution"),"paymentStatus"=COALESCE($6,"paymentStatus"),"updatedAt"=now() WHERE id=$1 RETURNING *,''::text AS "customerName"`,[id,input.serviceType??null,input.warrantyCovered??null,input.diagnosis??null,input.resolution??null,input.paymentStatus??null]);
  if(!r.rows[0])return null;
  const client=await pool.connect();try{await client.query("BEGIN");await recalcTotals(client,id);await client.query("COMMIT");}catch(e){await client.query("ROLLBACK");throw e}finally{client.release()}
  return findServiceRecordById(id);
}

export async function updateServiceRecordStatus(id:number,status:string,userId?:number,note?:string){
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const current=(await client.query<any>(`SELECT * FROM "serviceRecord" WHERE id=$1 FOR UPDATE`,[id])).rows[0];
    if(!current){await client.query("ROLLBACK");return null}
    const r=await client.query<ServiceRow>(`UPDATE "serviceRecord" SET "status"=$2,"completedAt"=CASE WHEN $2 IN ('READY','DELIVERED') THEN COALESCE("completedAt",now()) ELSE "completedAt" END,"updatedAt"=now() WHERE "id"=$1 RETURNING *, ''::text AS "customerName"`,[id,status]);
    if(current.status!==status)await client.query(`INSERT INTO "serviceStatusHistory" ("serviceRecordId","fromStatus","toStatus","note","changedBy") VALUES ($1,$2,$3,$4,$5)`,[id,current.status,status,note??null,userId??null]);
    if(current.deviceId && status==='DELIVERED'){
      const device=(await client.query<any>(`UPDATE "inventoryDevice" SET status='AT_CUSTOMER',"updatedAt"=now() WHERE id=$1 RETURNING *`,[current.deviceId])).rows[0];
      if(device) await client.query(`INSERT INTO "stockMovement" ("productId","deviceId","type","quantity","referenceType","referenceId","notes","createdBy") VALUES ($1,$2,'SERVICE_OUT',1,'SERVICE_RECORD',$3,'Cihaz servisten müşteriye teslim edildi',$4)`,[device.productId,device.id,id,userId??null]);
    } else if(current.deviceId && status==='CANCELLED'){
      await client.query(`UPDATE "inventoryDevice" SET status='AT_CUSTOMER',"updatedAt"=now() WHERE id=$1`,[current.deviceId]);
    }
    await client.query("COMMIT");
    return r.rows[0]??null;
  }catch(e){await client.query("ROLLBACK");throw e}finally{client.release()}
}
