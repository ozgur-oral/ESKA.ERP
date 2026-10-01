import { query } from "../db/pool.js";
const n=(x:unknown)=>Number(x||0);
export async function executiveDashboard(){
 const [sales,finance,service,support,cors,stock,projects,tasks,rentals,audit,trend]=await Promise.all([
  query(`SELECT COALESCE(SUM("grandTotal") FILTER(WHERE "createdAt">=date_trunc('month',NOW())),0) sales_month,COUNT(*) FILTER(WHERE status IN ('DRAFT','SENT')) open_quotes,COALESCE(SUM("grandTotal") FILTER(WHERE status IN ('DRAFT','SENT')),0) open_quote_value FROM quote`),
  query(`
  SELECT
    COALESCE(
      SUM(GREATEST("amount" - "paidAmount", 0))
      FILTER (
        WHERE direction = 'RECEIVABLE'
          AND status <> 'PAID'
      ),
      0
    ) AS receivable,

    COALESCE(
      SUM(GREATEST("amount" - "paidAmount", 0))
      FILTER (
        WHERE direction = 'PAYABLE'
          AND status <> 'PAID'
      ),
      0
    ) AS payable,

    COALESCE(
      SUM(GREATEST("amount" - "paidAmount", 0))
      FILTER (
        WHERE direction = 'RECEIVABLE'
          AND status <> 'PAID'
          AND "dueDate" < CURRENT_DATE
      ),
      0
    ) AS overdue

  FROM "financeDocument"
`),
  query(`SELECT COUNT(*) FILTER(WHERE status NOT IN ('READY','DELIVERED','CANCELLED')) active,COUNT(*) FILTER(WHERE "receivedAt"<NOW()-INTERVAL '7 days' AND status NOT IN ('READY','DELIVERED','CANCELLED')) aging FROM "serviceRecord"`),
  query(`SELECT COUNT(*) FILTER(WHERE status NOT IN ('RESOLVED','CLOSED','CANCELLED')) open,COUNT(*) FILTER(WHERE status NOT IN ('RESOLVED','CLOSED','CANCELLED') AND ("slaResolutionDueAt"<NOW() OR ("firstRespondedAt" IS NULL AND "slaFirstResponseDueAt"<NOW()))) sla_breached FROM "supportTicket"`),
  query(`SELECT COUNT(*) FILTER(WHERE status='ACTIVE') active,COUNT(*) FILTER(WHERE status='ACTIVE' AND "endDate"<=CURRENT_DATE+30) expiring FROM "corsSubscription"`),
  query(`
  SELECT COUNT(*)::int AS critical
  FROM "product" p
  WHERE p.status = 'ACTIVE'
    AND (
      CASE
        WHEN p."isSerialized" = true THEN (
          SELECT COUNT(*)
          FROM "inventoryDevice" d
          WHERE d."productId" = p.id
            AND d.status = 'IN_STOCK'
        )
        ELSE p."stockQuantity"
      END
    ) <= p."criticalStock"
`),
  query(`SELECT COUNT(*) FILTER(WHERE status NOT IN ('COMPLETED','CANCELLED')) active,COALESCE(AVG(progress) FILTER(WHERE status NOT IN ('COMPLETED','CANCELLED')),0) avg_progress FROM project`),
  query(`SELECT COUNT(*) FILTER(WHERE status NOT IN ('DONE','CANCELLED')) open,COUNT(*) FILTER(WHERE status NOT IN ('DONE','CANCELLED') AND "dueAt"<NOW()) overdue FROM "workTask"`),
  query(`SELECT COUNT(*) FILTER(WHERE status='ACTIVE') active,COUNT(*) FILTER(WHERE status='OVERDUE') overdue FROM "rentalAgreement"`),
  query(`SELECT COUNT(*) FILTER(WHERE "createdAt">=CURRENT_DATE) today FROM "auditLog"`),
  query(`
  SELECT
    to_char(m.month_start, 'YYYY-MM') AS "month",
    COALESCE(SUM(q."grandTotal"), 0) AS total
  FROM generate_series(
    date_trunc('month', NOW()) - INTERVAL '11 months',
    date_trunc('month', NOW()),
    INTERVAL '1 month'
  ) AS m(month_start)
  LEFT JOIN quote q
    ON date_trunc('month', q."createdAt") = m.month_start
    AND q.status = 'APPROVED'
  GROUP BY m.month_start
  ORDER BY m.month_start
`),
 ]);
 const a=sales.rows[0] as any,f=finance.rows[0] as any,se=service.rows[0] as any,su=support.rows[0] as any,c=cors.rows[0] as any,st=stock.rows[0] as any,p=projects.rows[0] as any,t=tasks.rows[0] as any,r=rentals.rows[0] as any,au=audit.rows[0] as any;
 return {kpis:{salesMonth:n(a.sales_month),openQuotes:n(a.open_quotes),openQuoteValue:n(a.open_quote_value),receivable:n(f.receivable),payable:n(f.payable),overdueReceivable:n(f.overdue),activeService:n(se.active),agingService:n(se.aging),openTickets:n(su.open),slaBreached:n(su.sla_breached),activeCors:n(c.active),corsExpiring:n(c.expiring),criticalStock:n(st.critical),activeProjects:n(p.active),projectProgress:n(p.avg_progress),openTasks:n(t.open),overdueTasks:n(t.overdue),activeRentals:n(r.active),overdueRentals:n(r.overdue),auditToday:n(au.today)},salesTrend:trend.rows.map((x:any)=>({month:x.month,total:n(x.total)}))};
}
