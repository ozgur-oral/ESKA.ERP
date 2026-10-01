import { pool, query } from "../db/pool.js";

const nextNo=(prefix:string)=>`${prefix}-${new Date().getFullYear()}-${Date.now().toString().slice(-7)}`;

export async function syncFinanceDocuments() {
  const c = await pool.connect();

  try {
    await c.query("BEGIN");

    /*
     * SALES ORDER → FINANCE DOCUMENT
     *
     * Satış siparişi yalnızca gerçekten teslim edildiğinde
     * müşterinin cari hesabında alacak oluşturmalıdır.
     *
     * Eski sistem tarafından OPEN vb. durumdaki siparişler için
     * oluşturulmuş finans belgelerini güvenli şekilde temizliyoruz.
     *
     * Tahsilat yapılmış veya financeAllocation kaydı bulunan
     * belgeler tarihsel finans bütünlüğünü korumak amacıyla silinmez.
     */
    await c.query(`
      DELETE FROM "financeDocument" d
      USING "salesOrder" o
      WHERE d."sourceType" = 'SALES_ORDER'
        AND d."sourceId" = o.id
        AND (
          o.status <> 'DELIVERED'
          OR o."deliveredAt" IS NULL
        )
        AND d."paidAmount" = 0
        AND NOT EXISTS (
          SELECT 1
          FROM "financeAllocation" a
          WHERE a."documentId" = d.id
        )
    `);

    /*
     * Yalnızca teslim edilmiş satış siparişleri
     * müşterinin cari hesabında alacak oluşturur.
     *
     * Vade tarihi:
     * teslim tarihi + müşterinin ödeme vadesi
     */
    await c.query(`
      INSERT INTO "financeDocument"
      (
        "documentNo",
        "partyType",
        "customerId",
        direction,
        "sourceType",
        "sourceId",
        description,
        currency,
        amount,
        "dueDate"
      )
      SELECT
        'FIN-SO-' || o.id,
        'CUSTOMER',
        o."customerId",
        'RECEIVABLE',
        'SALES_ORDER',
        o.id,
        'Satış siparişi ' || o."orderNo",
        o.currency,
        o."grandTotal",
        (o."deliveredAt"::date + c."paymentTermDays")
      FROM "salesOrder" o
      JOIN "customer" c
        ON c.id = o."customerId"
      WHERE o.status = 'DELIVERED'
        AND o."deliveredAt" IS NOT NULL
        AND o."grandTotal" > 0
      ON CONFLICT ("sourceType", "sourceId")
      DO UPDATE SET
        amount = EXCLUDED.amount,
        description = EXCLUDED.description,
        "dueDate" = EXCLUDED."dueDate",
        "updatedAt" = now()
    `);

    /*
     * CORS abonelikleri
     */
    await c.query(`
      INSERT INTO "financeDocument"
      (
        "documentNo",
        "partyType",
        "customerId",
        direction,
        "sourceType",
        "sourceId",
        description,
        currency,
        amount,
        "dueDate"
      )
      SELECT
        'FIN-CORS-' || s.id,
        'CUSTOMER',
        s."customerId",
        'RECEIVABLE',
        'CORS_SUBSCRIPTION',
        s.id,
        'CORS aboneliği ' || s."subscriptionNo",
        s.currency,
        s.amount,
        s."startDate"
      FROM "corsSubscription" s
      WHERE s.status <> 'CANCELLED'
        AND s.amount > 0
      ON CONFLICT ("sourceType", "sourceId")
      DO UPDATE SET
        amount = EXCLUDED.amount,
        description = EXCLUDED.description,
        "updatedAt" = now()
    `);

    /*
     * CORS yenilemeleri
     */
    await c.query(`
      INSERT INTO "financeDocument"
      (
        "documentNo",
        "partyType",
        "customerId",
        direction,
        "sourceType",
        "sourceId",
        description,
        currency,
        amount,
        "dueDate"
      )
      SELECT
        'FIN-CRN-' || r.id,
        'CUSTOMER',
        s."customerId",
        'RECEIVABLE',
        'CORS_RENEWAL',
        r.id,
        'CORS yenileme ' || s."subscriptionNo",
        s.currency,
        r.amount,
        r."createdAt"::date
      FROM "corsSubscriptionRenewal" r
      JOIN "corsSubscription" s
        ON s.id = r."subscriptionId"
      WHERE r.amount > 0
      ON CONFLICT ("sourceType", "sourceId")
      DO UPDATE SET
        amount = EXCLUDED.amount,
        description = EXCLUDED.description,
        "updatedAt" = now()
    `);

    /*
     * Kiralamalar
     */
    await c.query(`
      INSERT INTO "financeDocument"
      (
        "documentNo",
        "partyType",
        "customerId",
        direction,
        "sourceType",
        "sourceId",
        description,
        currency,
        amount,
        "dueDate"
      )
      SELECT
        'FIN-RNT-' || r.id,
        'CUSTOMER',
        r."customerId",
        'RECEIVABLE',
        'RENTAL',
        r.id,
        'Kiralama ' || r."rentalNo",
        r.currency,
        CASE
          WHEN r.type = 'DEMO'
            OR r."billingPeriod" = 'FREE'
            THEN COALESCE(x.damage, 0)

          WHEN r."billingPeriod" = 'DAILY'
            THEN
              GREATEST(
                1,
                (r."actualReturnDate" - r."startDate") + 1
              ) * r."dailyRate"
              + COALESCE(x.damage, 0)

          WHEN r."billingPeriod" = 'MONTHLY'
            THEN
              GREATEST(
                1,
                CEIL(
                  GREATEST(
                    1,
                    (r."actualReturnDate" - r."startDate") + 1
                  )::numeric / 30
                )
              ) * r."monthlyRate"
              + COALESCE(x.damage, 0)

          ELSE
            r."fixedAmount" + COALESCE(x.damage, 0)
        END,
        r."actualReturnDate"
      FROM "rentalAgreement" r
      LEFT JOIN (
        SELECT
          "rentalId",
          SUM("damageCharge") AS damage
        FROM "rentalItem"
        GROUP BY "rentalId"
      ) x
        ON x."rentalId" = r.id
      WHERE r.status = 'RETURNED'
        AND (
          r.type <> 'DEMO'
          OR COALESCE(x.damage, 0) > 0
        )
      ON CONFLICT ("sourceType", "sourceId")
      DO UPDATE SET
        amount = EXCLUDED.amount,
        description = EXCLUDED.description,
        "updatedAt" = now()
    `);

    /*
     * Satın alma siparişleri
     */
    await c.query(`
      INSERT INTO "financeDocument"
      (
        "documentNo",
        "partyType",
        "supplierId",
        direction,
        "sourceType",
        "sourceId",
        description,
        currency,
        amount,
        "dueDate"
      )
      SELECT
        'FIN-PO-' || o.id,
        'SUPPLIER',
        o."supplierId",
        'PAYABLE',
        'PURCHASE_ORDER',
        o.id,
        'Satın alma siparişi ' || o."orderNo",
        o.currency,
        o."grandTotal",
        COALESCE(
          o."expectedAt",
          o."createdAt"::date
        ) + 30
      FROM "purchaseOrder" o
      WHERE o.status <> 'CANCELLED'
        AND o."grandTotal" > 0
      ON CONFLICT ("sourceType", "sourceId")
      DO UPDATE SET
        amount = EXCLUDED.amount,
        description = EXCLUDED.description,
        "updatedAt" = now()
    `);

    /*
     * Finans belgelerinin ödeme durumlarını güncelle.
     */
    await c.query(`
      UPDATE "financeDocument"
      SET status =
        CASE
          WHEN "paidAmount" >= amount THEN 'PAID'
          WHEN "paidAmount" > 0 THEN 'PARTIAL'
          ELSE 'OPEN'
        END
      WHERE status <> 'CANCELLED'
    `);

    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
export async function summary(){
  await syncFinanceDocuments();
  const r=await query<any>(`SELECT
    COALESCE(SUM(amount-"paidAmount") FILTER(WHERE direction='RECEIVABLE' AND status<>'CANCELLED'),0) AS "totalReceivable",
    COALESCE(SUM(amount-"paidAmount") FILTER(WHERE direction='PAYABLE' AND status<>'CANCELLED'),0) AS "totalPayable",
    COALESCE(SUM(amount-"paidAmount") FILTER(WHERE direction='RECEIVABLE' AND status<>'CANCELLED' AND "dueDate"<CURRENT_DATE),0) AS "overdueReceivable",
    COUNT(*) FILTER(WHERE status IN ('OPEN','PARTIAL'))::int AS "openDocuments"
    FROM "financeDocument"`);
  const cash=await query<any>(`SELECT a.id,a.code,a.name,a.type,a.currency,
    (a."openingBalance"+COALESCE(SUM(CASE WHEN t.type='RECEIPT' THEN t.amount WHEN t.type='PAYMENT' THEN -t.amount ELSE 0 END),0)) AS balance
    FROM "financeAccount" a LEFT JOIN "financeTransaction" t ON t."accountId"=a.id
    WHERE a."isActive"=true GROUP BY a.id ORDER BY a.id`);
  return {...r.rows[0],accounts:cash.rows};
}

export async function documents(direction?:string,partyType?:string,status?:string){
  await syncFinanceDocuments();
  const vals:any[]=[];const where:string[]=[];
  if(direction){vals.push(direction);where.push(`d.direction=$${vals.length}`)}
  if(partyType){vals.push(partyType);where.push(`d."partyType"=$${vals.length}`)}
  if(status){vals.push(status);where.push(`d.status=$${vals.length}`)}
  return (await query<any>(`SELECT d.*,c.name AS "customerName",s.name AS "supplierName",
    (d.amount-d."paidAmount") AS balance
    FROM "financeDocument" d LEFT JOIN "customer" c ON c.id=d."customerId" LEFT JOIN "supplier" s ON s.id=d."supplierId"
    ${where.length?`WHERE ${where.join(" AND ")}`:""} ORDER BY d."dueDate" NULLS LAST,d.id DESC LIMIT 500`,vals)).rows;
}
export async function accounts(){return (await query<any>(`SELECT * FROM "financeAccount" WHERE "isActive"=true ORDER BY id`)).rows}
export async function createAccount(input:any){return (await query<any>(`INSERT INTO "financeAccount"(code,name,type,currency,"openingBalance") VALUES($1,$2,$3,$4,$5) RETURNING *`,[input.code?.trim()||`HSP-${Date.now().toString().slice(-6)}`,input.name.trim(),input.type||'BANK',input.currency||'TRY',Number(input.openingBalance||0)])).rows[0]}
export async function transactions(){return (await query<any>(`SELECT t.*,a.name AS "accountName",c.name AS "customerName",s.name AS "supplierName" FROM "financeTransaction" t JOIN "financeAccount" a ON a.id=t."accountId" LEFT JOIN "customer" c ON c.id=t."customerId" LEFT JOIN "supplier" s ON s.id=t."supplierId" ORDER BY t."transactionDate" DESC,t.id DESC LIMIT 500`)).rows}

export async function settleDocument(documentId:number,input:any,user?:any){
  const c=await pool.connect();
  try{
    await c.query('BEGIN');
    const d=(await c.query<any>(`SELECT * FROM "financeDocument" WHERE id=$1 FOR UPDATE`,[documentId])).rows[0];
    if(!d)throw new Error('Finans belgesi bulunamadı.');
    const remaining=Number(d.amount)-Number(d.paidAmount);
    const amount=Number(input.amount);
    if(!amount||amount<=0||amount>remaining+0.001)throw new Error(`Tutar 0'dan büyük ve kalan ${remaining.toFixed(2)} tutarını aşmayacak şekilde olmalıdır.`);
    const expected=d.direction==='RECEIVABLE'?'RECEIPT':'PAYMENT';
let createdByName: string | null = null;

if (user?.id) {
  const actor = (
    await c.query<any>(
      `
      SELECT
        "firstName",
        "lastName",
        username
      FROM "user"
      WHERE id=$1
      `,
      [Number(user.id)]
    )
  ).rows[0];

  if (actor) {
    createdByName =
      [actor.firstName, actor.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      actor.username ||
      null;
  }
}
    const t=(await c.query<any>(`INSERT INTO "financeTransaction" ("transactionNo",type,"accountId","partyType","customerId","supplierId",currency,amount,description,"transactionDate","createdBy","createdByName")
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,[
        nextNo(expected==='RECEIPT'?'TAH':'ODM'),expected,Number(input.accountId),d.partyType,d.customerId,d.supplierId,d.currency,amount,input.description||d.description,input.transactionDate||new Date().toISOString().slice(0,10),user?.id || null,
createdByName
      ])).rows[0];
    await c.query(`INSERT INTO "financeAllocation" ("transactionId","documentId",amount) VALUES($1,$2,$3)`,[t.id,documentId,amount]);
    const paid=Number(d.paidAmount)+amount;
    await c.query(`UPDATE "financeDocument" SET "paidAmount"=$2,status=$3,"updatedAt"=now() WHERE id=$1`,[documentId,paid,paid>=Number(d.amount)-0.001?'PAID':'PARTIAL']);
    await c.query('COMMIT');return t;
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}

export async function partyLedger(kind:'customer'|'supplier',id:number){
  await syncFinanceDocuments();
  const field=kind==='customer'?'"customerId"':'"supplierId"';
  const docs=(await query<any>(`SELECT *,(amount-"paidAmount") AS balance FROM "financeDocument" WHERE ${field}=$1 ORDER BY "createdAt" DESC`,[id])).rows;
  const tx=(await query<any>(`SELECT t.*,a.name AS "accountName" FROM "financeTransaction" t JOIN "financeAccount" a ON a.id=t."accountId" WHERE t.${field}=$1 ORDER BY t."transactionDate" DESC,t.id DESC`,[id])).rows;
  return {documents:docs,transactions:tx};
}

export async function customerRisk(customerId:number,proposedAmount=0){
  await syncFinanceDocuments();
  const r=await query<any>(`SELECT c.id,c.name,c."creditLimit",c."riskPolicy",c."paymentTermDays",c."riskNotes",
    COALESCE(SUM(d.amount-d."paidAmount") FILTER(WHERE d.direction='RECEIVABLE' AND d.status IN ('OPEN','PARTIAL')),0) AS "openBalance",
    COALESCE(SUM(d.amount-d."paidAmount") FILTER(WHERE d.direction='RECEIVABLE' AND d.status IN ('OPEN','PARTIAL') AND d."dueDate"<CURRENT_DATE),0) AS "overdueBalance",
    COALESCE(MAX((CURRENT_DATE-d."dueDate")) FILTER(WHERE d.direction='RECEIVABLE' AND d.status IN ('OPEN','PARTIAL') AND d."dueDate"<CURRENT_DATE),0)::int AS "maxOverdueDays"
    FROM "customer" c LEFT JOIN "financeDocument" d ON d."customerId"=c.id WHERE c.id=$1 GROUP BY c.id`,[customerId]);
  if(!r.rows[0])return null;
  const row=r.rows[0],limit=Number(row.creditLimit||0),open=Number(row.openBalance||0),overdue=Number(row.overdueBalance||0),proposed=Number(proposedAmount||0),exposure=open+proposed;
  const available=limit>0?Math.max(0,limit-open):null;
  const utilization=limit>0?(exposure/limit)*100:0;
  const limitExceeded=limit>0&&exposure>limit+0.001;
  const severeOverdue=overdue>0&&Number(row.maxOverdueDays)>=30;
  const canOrder=row.riskPolicy!=='BLOCK'||(!limitExceeded&&!severeOverdue);
  const riskLevel=!canOrder?'BLOCKED':severeOverdue||limitExceeded?'CRITICAL':overdue>0||utilization>=80?'WARNING':'GOOD';
  return {...row,creditLimit:limit,openBalance:open,overdueBalance:overdue,maxOverdueDays:Number(row.maxOverdueDays||0),proposedAmount:proposed,projectedExposure:exposure,availableLimit:available,utilizationPercent:Math.round(utilization*100)/100,limitExceeded,severeOverdue,canOrder,riskLevel};
}

export async function receivableAging(){
  await syncFinanceDocuments();
  return (await query<any>(`SELECT c.id AS "customerId",c.code,c.name,c."creditLimit",c."riskPolicy",
    COALESCE(SUM(d.amount-d."paidAmount") FILTER(WHERE d.status IN ('OPEN','PARTIAL') AND d.direction='RECEIVABLE' AND (d."dueDate">=CURRENT_DATE OR d."dueDate" IS NULL)),0) AS current,
    COALESCE(SUM(d.amount-d."paidAmount") FILTER(WHERE d.status IN ('OPEN','PARTIAL') AND d.direction='RECEIVABLE' AND CURRENT_DATE-d."dueDate" BETWEEN 1 AND 30),0) AS "days1to30",
    COALESCE(SUM(d.amount-d."paidAmount") FILTER(WHERE d.status IN ('OPEN','PARTIAL') AND d.direction='RECEIVABLE' AND CURRENT_DATE-d."dueDate" BETWEEN 31 AND 60),0) AS "days31to60",
    COALESCE(SUM(d.amount-d."paidAmount") FILTER(WHERE d.status IN ('OPEN','PARTIAL') AND d.direction='RECEIVABLE' AND CURRENT_DATE-d."dueDate" BETWEEN 61 AND 90),0) AS "days61to90",
    COALESCE(SUM(d.amount-d."paidAmount") FILTER(WHERE d.status IN ('OPEN','PARTIAL') AND d.direction='RECEIVABLE' AND CURRENT_DATE-d."dueDate">90),0) AS "days90plus",
    COALESCE(SUM(d.amount-d."paidAmount") FILTER(WHERE d.status IN ('OPEN','PARTIAL') AND d.direction='RECEIVABLE'),0) AS total
    FROM "customer" c LEFT JOIN "financeDocument" d ON d."customerId"=c.id
    GROUP BY c.id HAVING COALESCE(SUM(d.amount-d."paidAmount") FILTER(WHERE d.status IN ('OPEN','PARTIAL') AND d.direction='RECEIVABLE'),0)>0
    ORDER BY (COALESCE(SUM(d.amount-d."paidAmount") FILTER(WHERE d.status IN ('OPEN','PARTIAL') AND d.direction='RECEIVABLE' AND d."dueDate"<CURRENT_DATE),0)) DESC,c.name`)).rows;
}

export async function syncCreditRiskNotifications(){
  await syncFinanceDocuments();
  await query(`INSERT INTO "notification" ("type","severity","title","message","entityType","entityId","actionUrl","dedupeKey")
    SELECT 'FINANCE_OVERDUE',CASE WHEN MAX(CURRENT_DATE-d."dueDate")>=30 THEN 'CRITICAL' ELSE 'WARNING' END,
      'Gecikmiş müşteri alacağı',c.name||' · '||to_char(SUM(d.amount-d."paidAmount"),'FM999G999G999D00')||' TL · en fazla '||MAX(CURRENT_DATE-d."dueDate")||' gün gecikme',
      'CUSTOMER',c.id,'/customers/'||c.id,'finance-overdue-'||c.id
    FROM "financeDocument" d JOIN "customer" c ON c.id=d."customerId"
    WHERE d.direction='RECEIVABLE' AND d.status IN ('OPEN','PARTIAL') AND d."dueDate"<CURRENT_DATE
    GROUP BY c.id,c.name
    ON CONFLICT ("dedupeKey") DO UPDATE SET "severity"=EXCLUDED."severity","message"=EXCLUDED."message","isRead"=false,"readAt"=NULL`);
}
