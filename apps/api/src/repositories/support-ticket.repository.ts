import { pool, query } from "../db/pool.js";

export type TicketInput = {
  customerId:number; subject:string; description:string; module?:string; channel?:string; priority?:string;
  department?:string|null; assignedUserId?:number|null; serviceRecordId?:number|null; deviceId?:number|null; corsSubscriptionId?:number|null;
};

const TICKET_SELECT = `SELECT t.*,c."name" AS "customerName",
  COALESCE(u."firstName" || ' ' || u."lastName",u."username") AS "assignedUserName",
  sr."serviceNo",d."serialNumber",p."name" AS "deviceName",cs."subscriptionNo",cs."username" AS "corsUsername"
  FROM "supportTicket" t
  JOIN "customer" c ON c.id=t."customerId"
  LEFT JOIN "user" u ON u.id=t."assignedUserId"
  LEFT JOIN "serviceRecord" sr ON sr.id=t."serviceRecordId"
  LEFT JOIN "inventoryDevice" d ON d.id=t."deviceId"
  LEFT JOIN "product" p ON p.id=d."productId"
  LEFT JOIN "corsSubscription" cs ON cs.id=t."corsSubscriptionId"`;

function sla(priority:string){
  const rules:Record<string,[number,number]>={URGENT:[15,240],HIGH:[30,480],NORMAL:[120,1440],LOW:[240,2880]};
  return rules[priority]??rules.NORMAL;
}

export async function listTickets(filters:{customerId?:number;status?:string;assignedUserId?:number;q?:string}={}){
  const where:string[]=[]; const values:unknown[]=[];
  if(filters.customerId){values.push(filters.customerId);where.push(`t."customerId"=$${values.length}`)}
  if(filters.status){values.push(filters.status);where.push(`t."status"=$${values.length}`)}
  if(filters.assignedUserId){values.push(filters.assignedUserId);where.push(`t."assignedUserId"=$${values.length}`)}
  if(filters.q){values.push(`%${filters.q}%`);where.push(`(t."ticketNo" ILIKE $${values.length} OR t."subject" ILIKE $${values.length} OR c."name" ILIKE $${values.length})`)}
  const r=await query(`${TICKET_SELECT} ${where.length?`WHERE ${where.join(' AND ')}`:''} ORDER BY CASE t."priority" WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4 END,t."createdAt" DESC LIMIT 300`,values);
  return r.rows;
}

export async function ticketSummary(){
  await syncSupportNotifications();
  const r=await query(`SELECT
    count(*) FILTER(WHERE "status" NOT IN ('RESOLVED','CLOSED'))::int AS open,
    count(*) FILTER(WHERE "priority" IN ('HIGH','URGENT') AND "status" NOT IN ('RESOLVED','CLOSED'))::int AS highPriority,
    count(*) FILTER(WHERE "status"='WAITING_CUSTOMER')::int AS waitingCustomer,
    count(*) FILTER(WHERE "status" NOT IN ('RESOLVED','CLOSED') AND now()>"slaResolutionDueAt")::int AS slaBreached,
    count(*) FILTER(WHERE "resolvedAt">=date_trunc('day',now()))::int AS resolvedToday,
    COALESCE(ROUND(100.0*count(*) FILTER(WHERE "resolvedAt" IS NOT NULL AND "resolvedAt"<="slaResolutionDueAt")/NULLIF(count(*) FILTER(WHERE "resolvedAt" IS NOT NULL),0),1),100)::text AS "slaSuccess"
    FROM "supportTicket"`);
  return r.rows[0];
}

export async function findTicketById(id:number){
  const r=await query(`${TICKET_SELECT} WHERE t.id=$1`,[id]); const ticket=r.rows[0]; if(!ticket)return null;
  const comments=await query(`SELECT c.*,COALESCE(u."firstName" || ' ' || u."lastName",u."username") AS "createdByName" FROM "supportTicketComment" c LEFT JOIN "user" u ON u.id=c."createdBy" WHERE c."ticketId"=$1 ORDER BY c."createdAt" ASC`,[id]);
  return {...ticket,comments:comments.rows};
}

export async function createTicket(input:TicketInput,userId?:number){
  const priority=input.priority??'NORMAL'; const [firstMin,resolutionMin]=sla(priority);
  const client=await pool.connect(); try{await client.query('BEGIN');
    const customer=(await client.query(`SELECT id FROM "customer" WHERE id=$1`,[input.customerId])).rows[0]; if(!customer)throw new Error('Müşteri bulunamadı.');
    const ticketNo=`TCK-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const r=await client.query(`INSERT INTO "supportTicket" ("ticketNo","customerId","subject","description","module","channel","priority","status","department","assignedUserId","serviceRecordId","deviceId","corsSubscriptionId","slaFirstResponseDueAt","slaResolutionDueAt","createdBy") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now()+($14::int*interval '1 minute'),now()+($15::int*interval '1 minute'),$16) RETURNING *`,[ticketNo,input.customerId,input.subject,input.description,input.module??'GENERAL',input.channel??'PHONE',priority,input.assignedUserId?'ASSIGNED':'OPEN',input.department??null,input.assignedUserId??null,input.serviceRecordId??null,input.deviceId??null,input.corsSubscriptionId??null,firstMin,resolutionMin,userId??null]);
    const t=r.rows[0]; await client.query(`INSERT INTO "supportTicketComment" ("ticketId","type","body","createdBy") VALUES ($1,'COMMENT',$2,$3)`,[t.id,`Talep oluşturuldu: ${input.description}`,userId??null]);
    if(priority==='URGENT') await client.query(`INSERT INTO "notification" ("type","severity","title","message","entityType","entityId","actionUrl","dedupeKey") VALUES ('SUPPORT_TICKET','CRITICAL','Acil destek talebi',$1,'SUPPORT_TICKET',$2,$3,$4) ON CONFLICT ("dedupeKey") DO UPDATE SET "message"=EXCLUDED."message","isRead"=false,"readAt"=NULL,"createdAt"=now()`,[`${ticketNo} · ${input.subject}`,t.id,`/support/${t.id}`,`support-urgent-${t.id}`]);
    await client.query('COMMIT'); return t;
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}

export async function addTicketComment(id:number,input:{body:string;visibility?:string;type?:string},userId?:number){
  const client=await pool.connect();try{await client.query('BEGIN');
    const ticket=(await client.query(`SELECT * FROM "supportTicket" WHERE id=$1 FOR UPDATE`,[id])).rows[0];if(!ticket)throw new Error('Ticket bulunamadı.');
    const r=await client.query(`INSERT INTO "supportTicketComment" ("ticketId","type","visibility","body","createdBy") VALUES ($1,$2,$3,$4,$5) RETURNING *`,[id,input.type??'COMMENT',input.visibility??'INTERNAL',input.body,userId??null]);
    if(!ticket.firstRespondedAt) await client.query(`UPDATE "supportTicket" SET "firstRespondedAt"=now(),"updatedAt"=now() WHERE id=$1`,[id]);
    await client.query('COMMIT');return r.rows[0];
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}

export async function updateTicketStatus(id:number,status:string,resolution:string|undefined,userId?:number){
  const client=await pool.connect();try{await client.query('BEGIN');
    const current=(await client.query(`SELECT * FROM "supportTicket" WHERE id=$1 FOR UPDATE`,[id])).rows[0];if(!current)throw new Error('Ticket bulunamadı.');
    const r=(await client.query(`UPDATE "supportTicket" SET "status"=$2,"resolution"=COALESCE($3,"resolution"),"resolvedAt"=CASE WHEN $2='RESOLVED' THEN COALESCE("resolvedAt",now()) ELSE "resolvedAt" END,"closedAt"=CASE WHEN $2='CLOSED' THEN COALESCE("closedAt",now()) ELSE "closedAt" END,"updatedAt"=now() WHERE id=$1 RETURNING *`,[id,status,resolution??null])).rows[0];
    await client.query(`INSERT INTO "supportTicketComment" ("ticketId","type","body","createdBy") VALUES ($1,'STATUS_CHANGE',$2,$3)`,[id,`${current.status} → ${status}${resolution?` · ${resolution}`:''}`,userId??null]);
    await client.query('COMMIT');return r;
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}

export async function assignTicket(id:number,assignedUserId:number|null,department:string|undefined,userId?:number){
  const client=await pool.connect();try{await client.query('BEGIN');
    const r=(await client.query(`UPDATE "supportTicket" SET "assignedUserId"=$2,"department"=COALESCE($3,"department"),"status"=CASE WHEN $2 IS NOT NULL AND "status"='OPEN' THEN 'ASSIGNED' ELSE "status" END,"updatedAt"=now() WHERE id=$1 RETURNING *`,[id,assignedUserId,department??null])).rows[0];if(!r)throw new Error('Ticket bulunamadı.');
    await client.query(`INSERT INTO "supportTicketComment" ("ticketId","type","body","createdBy") VALUES ($1,'ASSIGNMENT',$2,$3)`,[id,assignedUserId?`Ticket kullanıcı #${assignedUserId} için atandı${department?` · ${department}`:''}`:'Ticket ataması kaldırıldı',userId??null]);
    await client.query('COMMIT');return r;
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}

export async function syncSupportNotifications(){
  await query(`INSERT INTO "notification" ("type","severity","title","message","entityType","entityId","actionUrl","dedupeKey")
    SELECT 'SUPPORT_SLA','CRITICAL','Destek SLA süresi aşıldı',t."ticketNo"||' · '||c."name"||' · '||t."subject",'SUPPORT_TICKET',t.id,'/support/'||t.id,'support-sla-'||t.id
    FROM "supportTicket" t JOIN "customer" c ON c.id=t."customerId" WHERE t."status" NOT IN ('RESOLVED','CLOSED') AND now()>t."slaResolutionDueAt"
    ON CONFLICT ("dedupeKey") DO UPDATE SET "message"=EXCLUDED."message","isRead"=false,"readAt"=NULL`);
}
