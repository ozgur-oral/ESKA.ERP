import{query}from"../db/pool.js";
export async function customerTimeline(customerId:number){
 const [a,n,q,o,sv,t,cs,r]=await Promise.all([
  query(`SELECT id,'CRM' source,type,subject title,description,"activityAt" at,status FROM "crmActivity" WHERE "customerId"=$1`,[customerId]),
  query(`SELECT id,'NOTE' source,'NOTE' type,LEFT(note,120) title,note description,"createdAt" at,CASE WHEN "isPinned" THEN 'PINNED' ELSE 'NOTE' END status FROM "crmCustomerNote" WHERE "customerId"=$1`,[customerId]),
  query(`SELECT id,'QUOTE' source,'QUOTE' type,COALESCE("quoteNo",'Teklif #'||id) title,NULL description,"createdAt" at,status FROM quote WHERE "customerId"=$1`,[customerId]),
  query(`SELECT id,'ORDER' source,'ORDER' type,COALESCE("orderNo",'Sipariş #'||id) title,NULL description,"createdAt" at,status FROM "salesOrder" WHERE "customerId"=$1`,[customerId]),
  query(`SELECT id,'SERVICE' source,'SERVICE' type,COALESCE("serviceNo",'Servis #'||id) title,description,"createdAt" at,status FROM "serviceRecord" WHERE "customerId"=$1`,[customerId]),
  query(`SELECT id,'SUPPORT' source,'SUPPORT' type,COALESCE("ticketNo",'Ticket #'||id) title,subject description,"createdAt" at,status FROM "supportTicket" WHERE "customerId"=$1`,[customerId]),
  query(`SELECT id,'CORS' source,'CORS' type,'CORS Aboneliği #'||id title,NULL description,"createdAt" at,status FROM "corsSubscription" WHERE "customerId"=$1`,[customerId]),
  query(`SELECT id,'RENTAL' source,'RENTAL' type,COALESCE("agreementNo",'Kiralama #'||id) title,NULL description,"createdAt" at,status FROM "rentalAgreement" WHERE "customerId"=$1`,[customerId])
 ]);
 return [...a.rows,...n.rows,...q.rows,...o.rows,...sv.rows,...t.rows,...cs.rows,...r.rows].sort((x:any,y:any)=>+new Date(y.at)-+new Date(x.at));
}
export async function activities(customerId?:number){
 return(await query(`SELECT a.*,c.name "customerName",u."firstName"||' '||u."lastName" "assignedUserName" FROM "crmActivity" a JOIN customer c ON c.id=a."customerId" LEFT JOIN "user" u ON u.id=a."assignedUserId" ${customerId?'WHERE a."customerId"=$1':''} ORDER BY a."activityAt" DESC`,customerId?[customerId]:[])).rows
}
export async function createActivity(x:any,userId?:number){
 return(await query(`INSERT INTO "crmActivity"("customerId","contactName",type,direction,subject,description,outcome,"activityAt","followUpAt",status,"assignedUserId","createdBy") VALUES($1,$2,$3,$4,$5,$6,$7,COALESCE($8,NOW()),$9,$10,$11,$12) RETURNING *`,[x.customerId,x.contactName||null,x.type,x.direction||null,x.subject,x.description||null,x.outcome||null,x.activityAt||null,x.followUpAt||null,x.status||'COMPLETED',x.assignedUserId||null,userId||null])).rows[0]
}
export async function createNote(customerId:number,note:string,isPinned:boolean,userId?:number){
 return(await query(`INSERT INTO "crmCustomerNote"("customerId",note,"isPinned","createdBy") VALUES($1,$2,$3,$4) RETURNING *`,[customerId,note,isPinned,userId||null])).rows[0]
}
export async function followUps(userId?:number){
 return(await query(`SELECT a.*,c.name "customerName" FROM "crmActivity" a JOIN customer c ON c.id=a."customerId" WHERE a.status='PLANNED' AND a."followUpAt" IS NOT NULL AND ($1::int IS NULL OR a."assignedUserId"=$1) ORDER BY a."followUpAt"`,[userId||null])).rows
}
export async function summary(){
 return(await query(`SELECT COUNT(*) FILTER(WHERE "activityAt"::date=CURRENT_DATE)::int today,COUNT(*) FILTER(WHERE status='PLANNED' AND "followUpAt"<NOW())::int overdue,COUNT(*) FILTER(WHERE status='PLANNED' AND "followUpAt">=NOW() AND "followUpAt"<NOW()+INTERVAL '7 days')::int upcoming,COUNT(DISTINCT "customerId") FILTER(WHERE "activityAt">=date_trunc('month',NOW()))::int "activeCustomers" FROM "crmActivity"`)).rows[0]
}
