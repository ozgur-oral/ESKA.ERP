import { pool, query } from "../db/pool.js";

export type ProjectInput = {
  customerId?: number|null; ownerCompanyId?: number|null; type?: string; name:string; status?:string; stage?:string;
  city?:string|null; district?:string|null; address?:string|null; latitude?:number|null; longitude?:number|null;
  acPowerMw?:number|null; dcPowerMwp?:number|null; startDate?:string|null; targetEndDate?:string|null; description?:string|null;
};

const PROJECT_SELECT=`SELECT p.*,c.name AS "customerName",gc.name AS "ownerCompanyName",
  (SELECT count(*)::int FROM "projectTask" t WHERE t."projectId"=p.id) AS "taskCount",
  (SELECT count(*)::int FROM "projectTask" t WHERE t."projectId"=p.id AND t.status='DONE') AS "doneTaskCount",
  (SELECT count(*)::int FROM "projectAssignment" a WHERE a."projectId"=p.id AND a.status IN ('PLANNED','ACTIVE')) AS "teamCount"
  FROM "project" p LEFT JOIN "customer" c ON c.id=p."customerId" LEFT JOIN "groupCompany" gc ON gc.id=p."ownerCompanyId"`;

async function recalcProjectProgress(client:any,projectId:number){
  const r=await client.query(`SELECT COALESCE(ROUND(AVG(progress)),0)::int AS progress, count(*)::int AS total, count(*) FILTER(WHERE status='DONE')::int AS done FROM "projectTask" WHERE "projectId"=$1 AND status<>'CANCELLED'`,[projectId]);
  const row=r.rows[0]; const progress=row.total?row.progress:0;
  await client.query(`UPDATE "project" SET progress=$2,"updatedAt"=now(),status=CASE WHEN $2=100 AND status='ACTIVE' THEN 'COMPLETED' ELSE status END,"completedAt"=CASE WHEN $2=100 THEN COALESCE("completedAt",now()) ELSE "completedAt" END WHERE id=$1`,[projectId,progress]);
}

export async function listCompanies(){return (await query(`SELECT * FROM "groupCompany" WHERE "isActive"=true ORDER BY name`)).rows}
export async function projectSummary(){const r=await query(`SELECT
 count(*) FILTER(WHERE status='ACTIVE')::int AS active,
 count(*) FILTER(WHERE type='GES' AND status='ACTIVE')::int AS "activeGes",
 count(*) FILTER(WHERE status='PLANNING')::int AS planning,
 count(*) FILTER(WHERE "targetEndDate" BETWEEN current_date AND current_date+interval '30 days' AND status NOT IN ('COMPLETED','CANCELLED'))::int AS "due30",
 COALESCE(sum("dcPowerMwp") FILTER(WHERE type='GES' AND status IN ('PLANNING','ACTIVE')),0)::text AS "gesPowerMwp",
 COALESCE((SELECT count(DISTINCT COALESCE("employeeName",'')) FROM "projectAssignment" WHERE status IN ('PLANNED','ACTIVE')),0)::int AS "fieldTeam"
 FROM "project"`);return r.rows[0]}

export async function listProjects(filters:{status?:string;type?:string;q?:string}={}){const where:string[]=[];const values:unknown[]=[];if(filters.status){values.push(filters.status);where.push(`p.status=$${values.length}`)}if(filters.type){values.push(filters.type);where.push(`p.type=$${values.length}`)}if(filters.q){values.push(`%${filters.q}%`);where.push(`(p.code ILIKE $${values.length} OR p.name ILIKE $${values.length} OR c.name ILIKE $${values.length})`)}return (await query(`${PROJECT_SELECT} ${where.length?`WHERE ${where.join(' AND ')}`:''} ORDER BY p."createdAt" DESC`,values)).rows}

export async function findProjectById(id:number){const r=await query(`${PROJECT_SELECT} WHERE p.id=$1`,[id]);const p=r.rows[0];if(!p)return null;const [tasks,assignments,milestones]=await Promise.all([
 query(`SELECT * FROM "projectTask" WHERE "projectId"=$1 ORDER BY CASE status WHEN 'IN_PROGRESS' THEN 1 WHEN 'TODO' THEN 2 WHEN 'BLOCKED' THEN 3 ELSE 4 END,"dueAt" NULLS LAST,id`,[id]),
 query(`SELECT a.*,h.name AS "homeCompanyName",d.name AS "assignedCompanyName" FROM "projectAssignment" a LEFT JOIN "groupCompany" h ON h.id=a."homeCompanyId" LEFT JOIN "groupCompany" d ON d.id=a."assignedCompanyId" WHERE a."projectId"=$1 ORDER BY a."createdAt"`,[id]),
 query(`SELECT * FROM "projectMilestone" WHERE "projectId"=$1 ORDER BY "sortOrder",id`,[id])]);return {...p,tasks:tasks.rows,assignments:assignments.rows,milestones:milestones.rows}}

export async function createProject(input:ProjectInput,userId?:number){const client=await pool.connect();try{await client.query('BEGIN');const code=`PRJ-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;const r=await client.query(`INSERT INTO "project" (code,"customerId","ownerCompanyId",type,name,status,stage,city,district,address,latitude,longitude,"acPowerMw","dcPowerMwp","startDate","targetEndDate",description,"createdBy") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,[code,input.customerId??null,input.ownerCompanyId??null,input.type??'SURVEY',input.name,input.status??'PLANNING',input.stage??'PLANLAMA',input.city??null,input.district??null,input.address??null,input.latitude??null,input.longitude??null,input.acPowerMw??null,input.dcPowerMwp??null,input.startDate??null,input.targetEndDate??null,input.description??null,userId??null]);const p=r.rows[0];const defaults=input.type==='GES'?['Saha keşfi','GNSS ölçümü','Haritalama','Proje tasarımı','Dokümantasyon']:['Saha keşfi','Ölçüm','Haritalama','Raporlama'];for(let i=0;i<defaults.length;i++){await client.query(`INSERT INTO "projectMilestone" ("projectId",title,"sortOrder") VALUES ($1,$2,$3)`,[p.id,defaults[i],i+1])}await client.query('COMMIT');return p}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}}

export async function createTask(projectId:number,input:any,userId?:number){const client=await pool.connect();try{await client.query('BEGIN');const count=(await client.query(`SELECT count(*)::int n FROM "projectTask" WHERE "projectId"=$1`,[projectId])).rows[0].n;const code=`TSK-${String(count+1).padStart(3,'0')}`;const r=(await client.query(`INSERT INTO "projectTask" ("projectId",code,title,category,status,priority,"assignedUserId","assignedPerson","plannedStartAt","dueAt",progress,location,notes,"createdBy") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,[projectId,code,input.title,input.category??'GENERAL',input.status??'TODO',input.priority??'NORMAL',input.assignedUserId??null,input.assignedPerson??null,input.plannedStartAt??null,input.dueAt??null,Number(input.progress??0),input.location??null,input.notes??null,userId??null])).rows[0];await recalcProjectProgress(client,projectId);await client.query('COMMIT');return r}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}}

export async function updateTask(taskId:number,input:any,userId?:number){const client=await pool.connect();try{await client.query('BEGIN');const current=(await client.query(`SELECT * FROM "projectTask" WHERE id=$1 FOR UPDATE`,[taskId])).rows[0];if(!current)throw new Error('Görev bulunamadı.');const status=input.status??current.status;let progress=input.progress!==undefined?Number(input.progress):current.progress;if(status==='DONE')progress=100;const r=(await client.query(`UPDATE "projectTask" SET status=$2,progress=$3,"assignedPerson"=COALESCE($4,"assignedPerson"),"dueAt"=COALESCE($5,"dueAt"),notes=COALESCE($6,notes),"completedAt"=CASE WHEN $2='DONE' THEN COALESCE("completedAt",now()) ELSE NULL END,"updatedAt"=now() WHERE id=$1 RETURNING *`,[taskId,status,progress,input.assignedPerson??null,input.dueAt??null,input.notes??null])).rows[0];await recalcProjectProgress(client,current.projectId);await client.query('COMMIT');return r}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}}

export async function addAssignment(projectId:number,input:any){return (await query(`INSERT INTO "projectAssignment" ("projectId","userId","employeeName",department,role,"homeCompanyId","assignedCompanyId","startDate","endDate",status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[projectId,input.userId??null,input.employeeName,input.department??null,input.role??'TEAM_MEMBER',input.homeCompanyId??null,input.assignedCompanyId??null,input.startDate??null,input.endDate??null,input.status??'ACTIVE',input.notes??null])).rows[0]}

export async function addMilestone(projectId:number,input:any){const count=(await query(`SELECT count(*)::int n FROM "projectMilestone" WHERE "projectId"=$1`,[projectId])).rows[0].n;return (await query(`INSERT INTO "projectMilestone" ("projectId",title,status,"targetDate","sortOrder",notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,[projectId,input.title,input.status??'PENDING',input.targetDate??null,count+1,input.notes??null])).rows[0]}
