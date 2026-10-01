import { pool, query } from "../db/pool.js";

const deviceSelect = `SELECT d.*,p.name AS "productName",p.sku,c.name AS "customerName" FROM "inventoryDevice" d JOIN product p ON p.id=d."productId" LEFT JOIN customer c ON c.id=d."customerId"`;
const nextNo=(prefix:string)=>`${prefix}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

export async function maintenanceSummary(){
  const r=await query<any>(`SELECT
    COUNT(*) FILTER (WHERE COALESCE(d."nextMaintenanceAt",'9999-12-31'::date) BETWEEN CURRENT_DATE AND CURRENT_DATE+30)::int AS "maintenanceDue30",
    COUNT(*) FILTER (WHERE d."nextMaintenanceAt"<CURRENT_DATE)::int AS "maintenanceOverdue",
    COUNT(*) FILTER (WHERE COALESCE(d."nextCalibrationAt",'9999-12-31'::date) BETWEEN CURRENT_DATE AND CURRENT_DATE+30)::int AS "calibrationDue30",
    COUNT(*) FILTER (WHERE d."nextCalibrationAt"<CURRENT_DATE)::int AS "calibrationOverdue",
    COUNT(*) FILTER (WHERE d.status='MAINTENANCE')::int AS "inMaintenance",
    (SELECT COUNT(*)::int FROM "deviceCertificate" c WHERE c."validUntil" BETWEEN CURRENT_DATE AND CURRENT_DATE+30) AS "certificatesExpiring30"
    FROM "inventoryDevice" d`);
  return r.rows[0];
}

export async function dueDevices(kind?:string,days=30){
  const field=kind==='CALIBRATION'?`d."nextCalibrationAt"`:`d."nextMaintenanceAt"`;
  return (await query<any>(`${deviceSelect} WHERE ${field} IS NOT NULL AND ${field}<=CURRENT_DATE+$1::int ORDER BY ${field} ASC`,[Math.max(0,days)])).rows;
}

export async function listMaintenance(deviceId?:number,status?:string){const v:any[]=[];const w:string[]=[];if(deviceId){v.push(deviceId);w.push(`m."deviceId"=$${v.length}`)}if(status){v.push(status);w.push(`m.status=$${v.length}`)}return (await query<any>(`SELECT m.*,d."serialNumber",p.name AS "productName",c.name AS "customerName" FROM "deviceMaintenanceRecord" m JOIN "inventoryDevice" d ON d.id=m."deviceId" JOIN product p ON p.id=d."productId" LEFT JOIN customer c ON c.id=d."customerId" ${w.length?`WHERE ${w.join(' AND ')}`:''} ORDER BY COALESCE(m."scheduledDate",m."createdAt"::date) DESC,m.id DESC`,v)).rows}
export async function maintenanceById(id:number){return (await query<any>(`SELECT m.*,d."serialNumber",p.name AS "productName",c.name AS "customerName" FROM "deviceMaintenanceRecord" m JOIN "inventoryDevice" d ON d.id=m."deviceId" JOIN product p ON p.id=d."productId" LEFT JOIN customer c ON c.id=d."customerId" WHERE m.id=$1`,[id])).rows[0]??null}

export async function createMaintenance(input:any,userId?:number){
 const c=await pool.connect();try{await c.query('BEGIN');const d=(await c.query<any>(`SELECT * FROM "inventoryDevice" WHERE id=$1 FOR UPDATE`,[Number(input.deviceId)])).rows[0];if(!d)throw new Error('Cihaz bulunamadı.');
 const r=(await c.query<any>(`INSERT INTO "deviceMaintenanceRecord"("maintenanceNo","deviceId",type,status,"scheduledDate",provider,technician,description,"nextDueDate","serviceRecordId","rentalId","createdBy") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,[nextNo('BKM'),d.id,input.type||'PERIODIC',input.status||'PLANNED',input.scheduledDate||null,input.provider||null,input.technician||null,input.description||null,input.nextDueDate||null,input.serviceRecordId||null,input.rentalId||null,userId||null])).rows[0];
 if(input.status==='IN_PROGRESS'){await c.query(`UPDATE "inventoryDevice" SET status='MAINTENANCE',"updatedAt"=now() WHERE id=$1`,[d.id])}await c.query('COMMIT');return r}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}

export async function updateMaintenanceStatus(id:number,input:any,userId?:number){
 const c=await pool.connect();try{await c.query('BEGIN');const m=(await c.query<any>(`SELECT * FROM "deviceMaintenanceRecord" WHERE id=$1 FOR UPDATE`,[id])).rows[0];if(!m)throw new Error('Bakım kaydı bulunamadı.');const status=String(input.status||m.status);
 const r=(await c.query<any>(`UPDATE "deviceMaintenanceRecord" SET status=$2,"startedAt"=CASE WHEN $2='IN_PROGRESS' THEN COALESCE("startedAt",now()) ELSE "startedAt" END,"completedAt"=CASE WHEN $2='COMPLETED' THEN COALESCE("completedAt",now()) ELSE "completedAt" END,result=COALESCE($3,result),cost=COALESCE($4,cost),"nextDueDate"=COALESCE($5,"nextDueDate"),"updatedAt"=now() WHERE id=$1 RETURNING *`,[id,status,input.result??null,input.cost==null?null:Number(input.cost),input.nextDueDate??null])).rows[0];
 if(status==='IN_PROGRESS') await c.query(`UPDATE "inventoryDevice" SET status='MAINTENANCE',"updatedAt"=now() WHERE id=$1`,[m.deviceId]);
 if(status==='COMPLETED'){await c.query(`UPDATE "inventoryDevice" SET "lastMaintenanceAt"=CURRENT_DATE,"nextMaintenanceAt"=COALESCE($2,CASE WHEN "maintenanceIntervalMonths" IS NOT NULL THEN CURRENT_DATE+("maintenanceIntervalMonths"||' months')::interval ELSE "nextMaintenanceAt" END),status=CASE WHEN "customerId" IS NULL THEN 'IN_STOCK' ELSE 'AT_CUSTOMER' END,"updatedAt"=now() WHERE id=$1`,[m.deviceId,input.nextDueDate??m.nextDueDate??null]);}
 await c.query('COMMIT');return r}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}

export async function listCalibrations(deviceId?:number){const v=deviceId?[deviceId]:[];return (await query<any>(`SELECT x.*,d."serialNumber",p.name AS "productName",c.name AS "customerName" FROM "deviceCalibrationRecord" x JOIN "inventoryDevice" d ON d.id=x."deviceId" JOIN product p ON p.id=d."productId" LEFT JOIN customer c ON c.id=d."customerId" ${deviceId?'WHERE x."deviceId"=$1':''} ORDER BY COALESCE(x."calibratedAt",x."scheduledDate") DESC NULLS LAST,x.id DESC`,v)).rows}
export async function createCalibration(input:any,userId?:number){return (await query<any>(`INSERT INTO "deviceCalibrationRecord"("calibrationNo","deviceId",status,"scheduledDate",provider,technician,"standardReference",notes,cost,currency,"createdBy") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[nextNo('KLB'),Number(input.deviceId),input.status||'PLANNED',input.scheduledDate||null,input.provider||null,input.technician||null,input.standardReference||null,input.notes||null,Number(input.cost||0),input.currency||'TRY',userId||null])).rows[0]}
export async function completeCalibration(id:number,input:any){const c=await pool.connect();try{await c.query('BEGIN');const x=(await c.query<any>(`SELECT * FROM "deviceCalibrationRecord" WHERE id=$1 FOR UPDATE`,[id])).rows[0];if(!x)throw new Error('Kalibrasyon kaydı bulunamadı.');const status=input.status==='FAILED'?'FAILED':'PASSED';const calibratedAt=input.calibratedAt||new Date().toISOString().slice(0,10);const validUntil=input.validUntil||null;const r=(await c.query<any>(`UPDATE "deviceCalibrationRecord" SET status=$2,"calibratedAt"=$3,"validUntil"=$4,result=$5,provider=COALESCE($6,provider),technician=COALESCE($7,technician),"updatedAt"=now() WHERE id=$1 RETURNING *`,[id,status,calibratedAt,validUntil,input.result||null,input.provider||null,input.technician||null])).rows[0];if(status==='PASSED')await c.query(`UPDATE "inventoryDevice" SET "lastCalibrationAt"=$2,"nextCalibrationAt"=COALESCE($3,CASE WHEN "calibrationIntervalMonths" IS NOT NULL THEN $2::date+("calibrationIntervalMonths"||' months')::interval ELSE "nextCalibrationAt" END),"updatedAt"=now() WHERE id=$1`,[x.deviceId,calibratedAt,validUntil]);await c.query('COMMIT');return r}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}}

export async function listCertificates(deviceId?:number){const v=deviceId?[deviceId]:[];return (await query<any>(`SELECT c.*,d."serialNumber",p.name AS "productName" FROM "deviceCertificate" c JOIN "inventoryDevice" d ON d.id=c."deviceId" JOIN product p ON p.id=d."productId" ${deviceId?'WHERE c."deviceId"=$1':''} ORDER BY c."issuedAt" DESC NULLS LAST,c.id DESC`,v)).rows}
export async function createCertificate(input:any,userId?:number){return (await query<any>(`INSERT INTO "deviceCertificate"("deviceId","calibrationId",type,"certificateNo",issuer,"issuedAt","validUntil","fileName","fileUrl",notes,"createdBy") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[Number(input.deviceId),input.calibrationId||null,input.type||'CALIBRATION',String(input.certificateNo).trim(),input.issuer||null,input.issuedAt||null,input.validUntil||null,input.fileName||null,input.fileUrl||null,input.notes||null,userId||null])).rows[0]}

export async function deviceMaintenanceDetail(deviceId:number){const d=(await query<any>(`${deviceSelect} WHERE d.id=$1`,[deviceId])).rows[0];if(!d)return null;const [m,c,cert]=await Promise.all([listMaintenance(deviceId),listCalibrations(deviceId),listCertificates(deviceId)]);return {...d,maintenance:m,calibrations:c,certificates:cert}}


export async function updateDeviceSchedule(deviceId:number,input:any){
 const r=await query<any>(`UPDATE "inventoryDevice" SET "maintenanceIntervalMonths"=COALESCE($2,"maintenanceIntervalMonths"),"calibrationIntervalMonths"=COALESCE($3,"calibrationIntervalMonths"),"nextMaintenanceAt"=COALESCE($4,"nextMaintenanceAt"),"nextCalibrationAt"=COALESCE($5,"nextCalibrationAt"),"updatedAt"=now() WHERE id=$1 RETURNING *`,[deviceId,input.maintenanceIntervalMonths==null?null:Number(input.maintenanceIntervalMonths),input.calibrationIntervalMonths==null?null:Number(input.calibrationIntervalMonths),input.nextMaintenanceAt||null,input.nextCalibrationAt||null]);return r.rows[0]??null
}

export async function syncMaintenanceNotifications(){
 await query(`INSERT INTO notification(type,severity,title,message,"entityType","entityId","actionUrl","dedupeKey") SELECT 'DEVICE_MAINTENANCE_DUE',CASE WHEN d."nextMaintenanceAt"<CURRENT_DATE THEN 'CRITICAL' ELSE 'WARNING' END,'Cihaz bakım zamanı',p.name||' · '||d."serialNumber"||' · '||to_char(d."nextMaintenanceAt",'DD.MM.YYYY'),'DEVICE',d.id,'/maintenance/devices/'||d.id,'device-maintenance-'||d.id||'-'||d."nextMaintenanceAt" FROM "inventoryDevice" d JOIN product p ON p.id=d."productId" WHERE d."nextMaintenanceAt" IS NOT NULL AND d."nextMaintenanceAt"<=CURRENT_DATE+30 ON CONFLICT("dedupeKey") DO NOTHING`);
 await query(`INSERT INTO notification(type,severity,title,message,"entityType","entityId","actionUrl","dedupeKey") SELECT 'DEVICE_CALIBRATION_DUE',CASE WHEN d."nextCalibrationAt"<CURRENT_DATE THEN 'CRITICAL' ELSE 'WARNING' END,'Kalibrasyon zamanı',p.name||' · '||d."serialNumber"||' · '||to_char(d."nextCalibrationAt",'DD.MM.YYYY'),'DEVICE',d.id,'/maintenance/devices/'||d.id,'device-calibration-'||d.id||'-'||d."nextCalibrationAt" FROM "inventoryDevice" d JOIN product p ON p.id=d."productId" WHERE d."nextCalibrationAt" IS NOT NULL AND d."nextCalibrationAt"<=CURRENT_DATE+30 ON CONFLICT("dedupeKey") DO NOTHING`);
 return true;
}
