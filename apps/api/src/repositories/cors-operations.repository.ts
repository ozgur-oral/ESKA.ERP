import {syncAutomationNotifications} from "./automation.repository.js";
import { syncRentalOverdue } from "./rental.repository.js";
import { pool, query } from "../db/pool.js";
import { syncSupportNotifications } from "./support-ticket.repository.js";
import { syncFinanceDocuments } from "./finance.repository.js";

export async function listStationEvents(stationId?: number, limit = 100) {
  const values: unknown[] = [];
  let where = "";
  if (stationId) { values.push(stationId); where = `WHERE e."stationId"=$1`; }
  values.push(Math.min(limit, 500));
  const r = await query(`${`SELECT e.*,s."code" AS "stationCode",s."name" AS "stationName",s."city"
    FROM "corsStationEvent" e JOIN "corsStation" s ON s.id=e."stationId" ${where}
    ORDER BY e."occurredAt" DESC LIMIT $${values.length}`}`, values);
  return r.rows;
}

export async function createStationEvent(input: any) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const event = (await client.query(`INSERT INTO "corsStationEvent" ("stationId","type","status","message","occurredAt") VALUES ($1,$2,$3,$4,COALESCE($5::timestamptz,now())) RETURNING *`, [input.stationId,input.type,input.status??null,input.message??null,input.occurredAt??null])).rows[0];
    const stationStatus = input.type === "OFFLINE" ? "OFFLINE" : input.type === "WARNING" ? "WARNING" : input.type === "ONLINE" ? "ACTIVE" : input.type === "MAINTENANCE_START" ? "MAINTENANCE" : null;
    if (stationStatus) await client.query(`UPDATE "corsStation" SET "status"=$2,"lastSeenAt"=CASE WHEN $2='ACTIVE' THEN now() ELSE "lastSeenAt" END WHERE id=$1`, [input.stationId,stationStatus]);
    if (["OFFLINE","WARNING"].includes(input.type)) {
      const station = (await client.query(`SELECT "code","name" FROM "corsStation" WHERE id=$1`,[input.stationId])).rows[0];
      const severity = input.type === "OFFLINE" ? "CRITICAL" : "WARNING";
      await client.query(`INSERT INTO "notification" ("type","severity","title","message","entityType","entityId","actionUrl","dedupeKey") VALUES ('CORS_STATION',$1,$2,$3,'CORS_STATION',$4,$5,$6) ON CONFLICT ("dedupeKey") DO UPDATE SET "message"=EXCLUDED."message","severity"=EXCLUDED."severity","isRead"=false,"readAt"=NULL,"createdAt"=now()`, [severity,`${station?.code ?? 'CORS'} ${input.type === 'OFFLINE' ? 'çevrimdışı' : 'uyarı'}`,input.message ?? `${station?.name ?? 'İstasyon'} için teknik kontrol gerekli.`,input.stationId,`/cors/operations?stationId=${input.stationId}`,`cors-station-${input.stationId}-${input.type}`]);
    }
    await client.query("COMMIT"); return event;
  } catch(e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
}

export async function listMaintenance(status?: string) {
  const r = status ? await query(`SELECT m.*,s."code" AS "stationCode",s."name" AS "stationName",s."city" FROM "corsStationMaintenance" m JOIN "corsStation" s ON s.id=m."stationId" WHERE m."status"=$1 ORDER BY m."scheduledAt"`,[status]) : await query(`SELECT m.*,s."code" AS "stationCode",s."name" AS "stationName",s."city" FROM "corsStationMaintenance" m JOIN "corsStation" s ON s.id=m."stationId" ORDER BY m."scheduledAt" DESC`);
  return r.rows;
}

export async function createMaintenance(input:any,userId?:number) {
  const r=await query(`INSERT INTO "corsStationMaintenance" ("stationId","title","description","status","scheduledAt","createdBy") VALUES ($1,$2,$3,'PLANNED',$4,$5) RETURNING *`,[input.stationId,input.title,input.description??null,input.scheduledAt,userId??null]);
  return r.rows[0];
}

export async function updateMaintenanceStatus(id:number,status:string) {
  const client=await pool.connect(); try { await client.query("BEGIN");
    const row=(await client.query(`UPDATE "corsStationMaintenance" SET "status"=$2,"completedAt"=CASE WHEN $2='COMPLETED' THEN now() ELSE "completedAt" END,"updatedAt"=now() WHERE id=$1 RETURNING *`,[id,status])).rows[0];
    if(!row) throw new Error("Bakım kaydı bulunamadı.");
    if(status==='IN_PROGRESS') { await client.query(`UPDATE "corsStation" SET "status"='MAINTENANCE' WHERE id=$1`,[row.stationId]); await client.query(`INSERT INTO "corsStationEvent" ("stationId","type","message") VALUES ($1,'MAINTENANCE_START',$2)`,[row.stationId,row.title]); }
    if(status==='COMPLETED') { await client.query(`UPDATE "corsStation" SET "status"='ACTIVE',"lastSeenAt"=now() WHERE id=$1`,[row.stationId]); await client.query(`INSERT INTO "corsStationEvent" ("stationId","type","message") VALUES ($1,'MAINTENANCE_END',$2)`,[row.stationId,row.title]); }
    await client.query("COMMIT"); return row;
  } catch(e){await client.query("ROLLBACK");throw e} finally{client.release()}
}

export async function getUptimeReport(days=30) {
  const r=await query(`WITH events AS (
    SELECT s.id,s."code",s."name",s."city",e."type",e."occurredAt",
      lead(e."occurredAt",1,now()) OVER (PARTITION BY s.id ORDER BY e."occurredAt") AS next_at
    FROM "corsStation" s LEFT JOIN "corsStationEvent" e ON e."stationId"=s.id AND e."occurredAt">=now()-($1::int*interval '1 day')
  ), agg AS (
    SELECT id,"code","name","city",COALESCE(sum(EXTRACT(epoch FROM (next_at-"occurredAt"))) FILTER(WHERE "type"='OFFLINE'),0) offline_seconds
    FROM events GROUP BY id,"code","name","city"
  ) SELECT *,ROUND((100-(LEAST(1,offline_seconds/($1::numeric*86400))*100))::numeric,2)::text AS "uptimePercent" FROM agg ORDER BY offline_seconds DESC`,[days]);
  return r.rows;
}

export async function getCorsRevenueReport(months=12) {
  const r=await query(`WITH m AS (SELECT generate_series(date_trunc('month',CURRENT_DATE)-(($1::int-1)*interval '1 month'),date_trunc('month',CURRENT_DATE),interval '1 month') month)
  SELECT to_char(m.month,'YYYY-MM') AS month,
    COALESCE((SELECT sum(s.amount) FROM "corsSubscription" s WHERE date_trunc('month',s."createdAt")=m.month),0)::text AS "newSales",
    COALESCE((SELECT sum(r.amount) FROM "corsSubscriptionRenewal" r WHERE date_trunc('month',r."createdAt")=m.month),0)::text AS renewals,
    (COALESCE((SELECT sum(s.amount) FROM "corsSubscription" s WHERE date_trunc('month',s."createdAt")=m.month),0)+COALESCE((SELECT sum(r.amount) FROM "corsSubscriptionRenewal" r WHERE date_trunc('month',r."createdAt")=m.month),0))::text AS total
  FROM m ORDER BY m.month`,[months]); return r.rows;
}

export async function syncCorsNotifications() {
  await syncFinanceDocuments();
  await query(`INSERT INTO "notification" ("type","severity","title","message","entityType","entityId","actionUrl","dedupeKey")
    SELECT 'CORS_EXPIRY',CASE WHEN (s."endDate"-CURRENT_DATE)<=7 THEN 'CRITICAL' ELSE 'WARNING' END,
      'CORS aboneliği yakında bitiyor',c."name"||' · '||s."username"||' · '||(s."endDate"-CURRENT_DATE)||' gün kaldı','CORS_SUBSCRIPTION',s.id,'/cors/subscriptions/'||s.id,'cors-expiry-'||s.id
    FROM "corsSubscription" s JOIN "customer" c ON c.id=s."customerId"
    WHERE s."status"='ACTIVE' AND s."endDate" BETWEEN CURRENT_DATE AND CURRENT_DATE+interval '30 day'
    ON CONFLICT ("dedupeKey") DO UPDATE SET "message"=EXCLUDED."message","severity"=EXCLUDED."severity"`);
  await query(`INSERT INTO "notification" ("type","severity","title","message","entityType","entityId","actionUrl","dedupeKey")
    SELECT 'CORS_PAYMENT','WARNING','CORS tahsilatı bekliyor',c."name"||' · '||s."subscriptionNo"||' · '||s."paymentStatus",'CORS_SUBSCRIPTION',s.id,'/cors/subscriptions/'||s.id,'cors-payment-'||s.id
    FROM "corsSubscription" s JOIN "customer" c ON c.id=s."customerId" WHERE s."paymentStatus" IN ('PENDING','PARTIAL','OVERDUE')
    ON CONFLICT ("dedupeKey") DO UPDATE SET "message"=EXCLUDED."message"`);
  await query(`INSERT INTO "notification" ("type","severity","title","message","entityType","entityId","actionUrl","dedupeKey")
    SELECT 'FINANCE_OVERDUE',CASE WHEN MAX(CURRENT_DATE-d."dueDate")>=30 THEN 'CRITICAL' ELSE 'WARNING' END,
      'Gecikmiş müşteri alacağı',c.name||' · '||ROUND(SUM(d.amount-d."paidAmount"),2)||' TL · en fazla '||MAX(CURRENT_DATE-d."dueDate")||' gün gecikme',
      'CUSTOMER',c.id,'/customers/'||c.id,'finance-overdue-'||c.id
    FROM "financeDocument" d JOIN "customer" c ON c.id=d."customerId"
    WHERE d.direction='RECEIVABLE' AND d.status IN ('OPEN','PARTIAL') AND d."dueDate"<CURRENT_DATE
    GROUP BY c.id,c.name ON CONFLICT ("dedupeKey") DO UPDATE SET "severity"=EXCLUDED."severity","message"=EXCLUDED."message"`);
}

export async function listNotifications(limit=100,userId?:number) { await Promise.all([syncCorsNotifications(),syncSupportNotifications(),syncRentalOverdue(),syncAutomationNotifications()]); return (await query(`SELECT * FROM "notification" WHERE "userId" IS NULL OR "userId"=$2 ORDER BY "isRead" ASC,"createdAt" DESC LIMIT $1`,[Math.min(limit,500),userId??-1])).rows; }
export async function notificationSummary(userId?:number){ await Promise.all([syncCorsNotifications(),syncSupportNotifications(),syncRentalOverdue(),syncAutomationNotifications()]); return (await query(`SELECT count(*) FILTER(WHERE NOT "isRead")::int unread,count(*) FILTER(WHERE NOT "isRead" AND "severity"='CRITICAL')::int critical FROM "notification" WHERE "userId" IS NULL OR "userId"=$1`,[userId??-1])).rows[0]; }
export async function markNotificationRead(id:number,userId?:number){return (await query(`UPDATE "notification" SET "isRead"=true,"readAt"=now() WHERE id=$1 AND ("userId" IS NULL OR "userId"=$2) RETURNING *`,[id,userId??-1])).rows[0]??null;}
export async function markAllNotificationsRead(userId?:number){await query(`UPDATE "notification" SET "isRead"=true,"readAt"=COALESCE("readAt",now()) WHERE NOT "isRead" AND ("userId" IS NULL OR "userId"=$1)`,[userId??-1]);return true;}
