import { pool, query } from "../db/pool.js";

const rentalNo=()=>`KIR-${new Date().getFullYear()}-${Date.now().toString().slice(-7)}`;

export async function listRentals(status?:string,customerId?:number){
  await syncRentalOverdue();
  const vals:any[]=[]; const where:string[]=[];
  if(status){vals.push(status);where.push(`r.status=$${vals.length}`)}
  if(customerId){vals.push(customerId);where.push(`r."customerId"=$${vals.length}`)}
  return (await query<any>(`SELECT r.*,c.name AS "customerName",COUNT(i.id)::int AS "deviceCount",
    COALESCE(string_agg(d."serialNumber"||' · '||p.name,', ' ORDER BY i.id),'') AS devices
    FROM "rentalAgreement" r JOIN "customer" c ON c.id=r."customerId"
    LEFT JOIN "rentalItem" i ON i."rentalId"=r.id LEFT JOIN "inventoryDevice" d ON d.id=i."deviceId" LEFT JOIN "product" p ON p.id=d."productId"
    ${where.length?`WHERE ${where.join(' AND ')}`:''} GROUP BY r.id,c.name ORDER BY r."createdAt" DESC`,vals)).rows;
}

export async function rentalSummary(){
  await syncRentalOverdue();
  return (await query<any>(`SELECT COUNT(*) FILTER(WHERE status='ACTIVE')::int active,COUNT(*) FILTER(WHERE status='OVERDUE')::int overdue,
    COUNT(*) FILTER(WHERE status='RESERVED')::int reserved,COALESCE(SUM("depositAmount") FILTER(WHERE "depositStatus"='RECEIVED'),0) AS "heldDeposits",
    COUNT(*) FILTER(WHERE type='DEMO' AND status IN ('ACTIVE','OVERDUE'))::int demos FROM "rentalAgreement"`)).rows[0];
}

export async function findRental(id:number){
  await syncRentalOverdue();
  const r=(await query<any>(`SELECT r.*,c.name AS "customerName",c.phone AS "customerPhone",c.email AS "customerEmail" FROM "rentalAgreement" r JOIN "customer" c ON c.id=r."customerId" WHERE r.id=$1`,[id])).rows[0];
  if(!r)return null;
  r.items=(await query<any>(`SELECT i.*,d."serialNumber",d.status AS "deviceStatus",p.name AS "productName",p.sku FROM "rentalItem" i JOIN "inventoryDevice" d ON d.id=i."deviceId" JOIN "product" p ON p.id=d."productId" WHERE i."rentalId"=$1 ORDER BY i.id`,[id])).rows;
  r.history=(await query<any>(`SELECT h.*,u."firstName"||' '||u."lastName" AS "changedByName" FROM "rentalStatusHistory" h LEFT JOIN "user" u ON u.id=h."changedBy" WHERE h."rentalId"=$1 ORDER BY h."createdAt" DESC`,[id])).rows;
  return r;
}

export async function availableDevices(){
  return (await query<any>(`SELECT d.id,d."serialNumber",d.status,p.id AS "productId",p.name AS "productName",p.sku,p.category FROM "inventoryDevice" d JOIN "product" p ON p.id=d."productId" WHERE d.status='IN_STOCK' AND p.status='ACTIVE' ORDER BY p.name,d."serialNumber"`)).rows;
}

export async function createRental(input:any,userId?:number){
  const devices=Array.isArray(input.deviceIds)?[...new Set(input.deviceIds.map(Number).filter(Boolean))]:[];
  if(!devices.length)throw new Error('En az bir seri numaralı cihaz seçilmelidir.');
  const c=await pool.connect();
  try{
    await c.query('BEGIN');
    const check=(await c.query<any>(`SELECT id,status FROM "inventoryDevice" WHERE id=ANY($1::int[]) FOR UPDATE`,[devices])).rows;
    if(check.length!==devices.length||check.some((d:any)=>d.status!=='IN_STOCK'))throw new Error('Seçilen cihazlardan biri artık kiralamaya uygun değil.');
    const r=(await c.query<any>(`INSERT INTO "rentalAgreement"("rentalNo","customerId",type,status,"billingPeriod","startDate","plannedReturnDate","dailyRate","monthlyRate","fixedAmount","depositAmount","depositStatus",currency,"deliveryAddress","contactName","contactPhone",notes,"createdBy")
      VALUES($1,$2,$3,'RESERVED',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,[
      rentalNo(),Number(input.customerId),input.type||'RENTAL',input.billingPeriod||'DAILY',input.startDate||new Date().toISOString().slice(0,10),input.plannedReturnDate||null,Number(input.dailyRate||0),Number(input.monthlyRate||0),Number(input.fixedAmount||0),Number(input.depositAmount||0),Number(input.depositAmount||0)>0?'PENDING':'NOT_REQUIRED',input.currency||'TRY',input.deliveryAddress||null,input.contactName||null,input.contactPhone||null,input.notes||null,userId||null
    ])).rows[0];
    for(const deviceId of devices){await c.query(`UPDATE "inventoryDevice" SET status='RENTAL_RESERVED',"updatedAt"=now() WHERE id=$1`,[deviceId]);await c.query(`INSERT INTO "rentalItem"("rentalId","deviceId","checkoutCondition","checkoutAccessories") VALUES($1,$2,$3,$4)`,[r.id,deviceId,input.checkoutCondition||null,input.checkoutAccessories||null]);}
    await c.query(`INSERT INTO "rentalStatusHistory"("rentalId","toStatus",note,"changedBy") VALUES($1,'RESERVED','Kiralama rezervasyonu oluşturuldu',$2)`,[r.id,userId||null]);
    await c.query('COMMIT'); return r;
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}

export async function deliverRental(id:number,input:any,userId?:number){
  const c=await pool.connect();
  try{
    await c.query('BEGIN');
    const r=(await c.query<any>(`SELECT * FROM "rentalAgreement" WHERE id=$1 FOR UPDATE`,[id])).rows[0];
    if(!r)throw new Error('Kiralama bulunamadı.');
    if(!['DRAFT','RESERVED'].includes(r.status))throw new Error('Bu kiralama teslimata uygun durumda değil.');
    const items=(await c.query<any>(`SELECT i.*,d."productId",d.status FROM "rentalItem" i JOIN "inventoryDevice" d ON d.id=i."deviceId" WHERE i."rentalId"=$1 FOR UPDATE OF d`,[id])).rows;
    if(items.some((x:any)=>!['IN_STOCK','RENTAL_RESERVED'].includes(x.status)))throw new Error('Kiralama cihazlarından biri teslimata uygun değil.');
    for(const x of items){
      await c.query(`UPDATE "inventoryDevice" SET status='RENTED',"customerId"=$2,"updatedAt"=now() WHERE id=$1`,[x.deviceId,r.customerId]);
      await c.query(`UPDATE "rentalItem" SET "deliveredAt"=now(),"checkoutCondition"=COALESCE($2,"checkoutCondition"),"checkoutAccessories"=COALESCE($3,"checkoutAccessories") WHERE id=$1`,[x.id,input.checkoutCondition||null,input.checkoutAccessories||null]);
      await c.query(`INSERT INTO "stockMovement"("productId","deviceId",type,quantity,"referenceType","referenceId",notes,"createdBy") VALUES($1,$2,'RENTAL_OUT',1,'RENTAL',$3,$4,$5)`,[x.productId,x.deviceId,id,`Kiralama teslimi ${r.rentalNo}`,userId||null]);
    }
    await c.query(`UPDATE "rentalAgreement" SET status='ACTIVE',"depositStatus"=CASE WHEN "depositAmount">0 AND $2 THEN 'RECEIVED' ELSE "depositStatus" END,"updatedAt"=now() WHERE id=$1`,[id,Boolean(input.depositReceived)]);
    await c.query(`INSERT INTO "rentalStatusHistory"("rentalId","fromStatus","toStatus",note,"changedBy") VALUES($1,$2,'ACTIVE',$3,$4)`,[id,r.status,input.note||'Cihaz müşteriye teslim edildi',userId||null]);
    await c.query('COMMIT');return true;
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}

export async function returnRental(id:number,input:any,userId?:number){
  const c=await pool.connect();
  try{
    await c.query('BEGIN');
    const r=(await c.query<any>(`SELECT * FROM "rentalAgreement" WHERE id=$1 FOR UPDATE`,[id])).rows[0];
    if(!r)throw new Error('Kiralama bulunamadı.');
    if(!['ACTIVE','OVERDUE'].includes(r.status))throw new Error('Bu kiralama iade alınamaz.');
    const items=(await c.query<any>(`SELECT i.*,d."productId",d.status FROM "rentalItem" i JOIN "inventoryDevice" d ON d.id=i."deviceId" WHERE i."rentalId"=$1 FOR UPDATE OF d`,[id])).rows;
    const target=input.needsService?'MAINTENANCE':'IN_STOCK';
    for(const x of items){
      await c.query(`UPDATE "inventoryDevice" SET status=$2,"customerId"=NULL,"updatedAt"=now() WHERE id=$1`,[x.deviceId,target]);
      await c.query(`UPDATE "rentalItem" SET "returnedAt"=now(),"returnCondition"=$2,"returnAccessories"=$3,"damageCharge"=$4 WHERE id=$1`,[x.id,input.returnCondition||null,input.returnAccessories||null,Number(input.damageCharge||0)]);
      await c.query(`INSERT INTO "stockMovement"("productId","deviceId",type,quantity,"referenceType","referenceId",notes,"createdBy") VALUES($1,$2,'RENTAL_RETURN',1,'RENTAL',$3,$4,$5)`,[x.productId,x.deviceId,id,`Kiralama iadesi ${r.rentalNo}${input.needsService?' · bakım kontrolü gerekli':''}`,userId||null]);
      if(input.needsService){await c.query(`INSERT INTO "deviceMaintenanceRecord"("maintenanceNo","deviceId",type,status,"scheduledDate",description,"rentalId","createdBy") VALUES($1,$2,'RENTAL_RETURN','PLANNED',CURRENT_DATE,$3,$4,$5)`,[`BKM-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}-${x.deviceId}`,x.deviceId,`Kiralama iadesi sonrası kontrol · ${r.rentalNo}`,id,userId||null]);}
    }
    await c.query(`UPDATE "rentalAgreement" SET status='RETURNED',"actualReturnDate"=CURRENT_DATE,"depositStatus"=CASE WHEN "depositStatus"='RECEIVED' THEN $2 ELSE "depositStatus" END,"updatedAt"=now() WHERE id=$1`,[id,input.holdDeposit?'HELD':'RETURNED']);
    await c.query(`INSERT INTO "rentalStatusHistory"("rentalId","fromStatus","toStatus",note,"changedBy") VALUES($1,$2,'RETURNED',$3,$4)`,[id,r.status,input.note||'Cihaz iade alındı',userId||null]);
    await c.query('COMMIT');return true;
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}

export async function updateDeposit(id:number,status:string){
  return (await query<any>(`UPDATE "rentalAgreement" SET "depositStatus"=$2,"updatedAt"=now() WHERE id=$1 RETURNING *`,[id,status])).rows[0]??null;
}

export async function syncRentalOverdue(){
  await query(`UPDATE "rentalAgreement" SET status='OVERDUE',"updatedAt"=now() WHERE status='ACTIVE' AND "plannedReturnDate" IS NOT NULL AND "plannedReturnDate"<CURRENT_DATE`);
  await query(`INSERT INTO "notification"("type","severity","title","message","entityType","entityId","actionUrl","dedupeKey")
    SELECT 'RENTAL_OVERDUE','CRITICAL','Geciken kiralık cihaz',r."rentalNo"||' · '||c.name||' · planlanan iade '||to_char(r."plannedReturnDate",'DD.MM.YYYY'),'RENTAL',r.id,'/rentals/'||r.id,'rental-overdue-'||r.id
    FROM "rentalAgreement" r JOIN "customer" c ON c.id=r."customerId" WHERE r.status='OVERDUE'
    ON CONFLICT("dedupeKey") DO UPDATE SET message=EXCLUDED.message,"isRead"=false,"readAt"=NULL,"createdAt"=now()`);
}

export async function rentalBillingPreview(id:number){
  const r=await findRental(id); if(!r)return null;
  const start=new Date(r.startDate); const end=new Date(r.actualReturnDate||new Date().toISOString().slice(0,10));
  const days=Math.max(1,Math.ceil((end.getTime()-start.getTime())/86400000)+1);
  const months=Math.max(1,Math.ceil(days/30));
  let rentalAmount=0;
  if(r.type==='DEMO'||r.billingPeriod==='FREE')rentalAmount=0;
  else if(r.billingPeriod==='DAILY')rentalAmount=days*Number(r.dailyRate||0);
  else if(r.billingPeriod==='MONTHLY')rentalAmount=months*Number(r.monthlyRate||0);
  else rentalAmount=Number(r.fixedAmount||0);
  const damages=(r.items||[]).reduce((a:number,x:any)=>a+Number(x.damageCharge||0),0);
  return {days,months,rentalAmount,damageCharge:damages,total:rentalAmount+damages,currency:r.currency};
}

export async function cancelRental(id:number,userId?:number){
  const c=await pool.connect();
  try{await c.query('BEGIN');const r=(await c.query<any>(`SELECT * FROM "rentalAgreement" WHERE id=$1 FOR UPDATE`,[id])).rows[0];if(!r)throw new Error('Kiralama bulunamadı.');if(!['DRAFT','RESERVED'].includes(r.status))throw new Error('Yalnız taslak/rezerve kiralama iptal edilebilir.');await c.query(`UPDATE "inventoryDevice" d SET status='IN_STOCK',"updatedAt"=now() FROM "rentalItem" i WHERE i."rentalId"=$1 AND i."deviceId"=d.id AND d.status='RENTAL_RESERVED'`,[id]);await c.query(`UPDATE "rentalAgreement" SET status='CANCELLED',"updatedAt"=now() WHERE id=$1`,[id]);await c.query(`INSERT INTO "rentalStatusHistory"("rentalId","fromStatus","toStatus",note,"changedBy") VALUES($1,$2,'CANCELLED','Rezervasyon iptal edildi',$3)`,[id,r.status,userId||null]);await c.query('COMMIT');return true}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}
