import { pool, query } from "../db/pool.js";
type PurchasingUser = {
  id?: number | null;
};

async function resolvePurchasingUser(
  user?: PurchasingUser
) {
  const userId = user?.id;

  if (
    !Number.isSafeInteger(userId) ||
    !userId ||
    userId <= 0
  ) {
    throw new Error(
      "İşlemi gerçekleştiren kullanıcı belirlenemedi."
    );
  }

  const result = await query<{
    id: number;
    firstName: string;
    lastName: string;
  }>(
    `
    SELECT
      id,
      "firstName",
      "lastName"
    FROM "user"
    WHERE id = $1
      AND status = 'ACTIVE'
    `,
    [userId]
  );

  const dbUser = result.rows[0];

  if (!dbUser) {
    throw new Error(
      "İşlemi gerçekleştiren aktif kullanıcı bulunamadı."
    );
  }

  return {
    id: dbUser.id,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
  };
}
function requireWholeQuantity(
  value: unknown,
  label = "Miktar"
) {
  const quantity = Number(value);

  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new Error(
      `${label} en az 1 olan tam sayı olmalıdır.`
    );
  }

  return quantity;
}
const nextNo=(prefix:string)=>`${prefix}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
export async function findSuppliers(q?:string){const vals:unknown[]=[];let w="";if(q?.trim()){vals.push(`%${q.trim()}%`);w=`WHERE s.name ILIKE $1 OR s.code ILIKE $1 OR COALESCE(s."taxNumber",'') ILIKE $1`;}return (await query<any>(`SELECT * FROM "supplier" s ${w} ORDER BY s.name`,vals)).rows;}
export async function createSupplier(input:any){const code=input.code?.trim()||`TED-${Date.now().toString().slice(-6)}`;return (await query<any>(`INSERT INTO "supplier" (code,name,"taxOffice","taxNumber","contactName",email,phone,city,address,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[code,input.name.trim(),input.taxOffice||null,input.taxNumber||null,input.contactName||null,input.email||null,input.phone||null,input.city||null,input.address||null,input.notes||null])).rows[0];}
export async function findRequests(){return (await query<any>(`SELECT r.*,COUNT(i.id)::int AS "itemCount" FROM "purchaseRequest" r LEFT JOIN "purchaseRequestItem" i ON i."requestId"=r.id GROUP BY r.id ORDER BY r.id DESC LIMIT 300`)).rows;}
export async function createRequest(input:any,user?:any){
  const resolvedUser = await resolvePurchasingUser(user);

  user = resolvedUser;

  const c = await pool.connect();

  try {
    await c.query('BEGIN');

    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new Error(
        "Satın alma talebinde en az bir ürün bulunmalıdır."
      );
    }

    const normalizedItems = input.items.map((item:any) => ({
      ...item,
      quantity: requireWholeQuantity(
        item.quantity,
        "Satın alma talebi miktarı"
      ),
    }));

    const r = (
      await c.query<any>(
        `
        INSERT INTO "purchaseRequest"
        (
          "requestNo",
          title,
          status,
          priority,
          "requestedBy",
          "requestedByName",
          "neededBy",
          notes
        )
        VALUES ($1,$2,'DRAFT',$3,$4,$5,$6,$7)
        RETURNING *
        `,
        [
          nextNo('SAT'),
          input.title.trim(),
          input.priority || 'NORMAL',
          user?.id || null,
          user
            ? `${user.firstName} ${user.lastName}`
            : null,
          input.neededBy || null,
          input.notes || null,
        ]
      )
    ).rows[0];

    for (const item of normalizedItems) {
      await c.query(
        `
        INSERT INTO "purchaseRequestItem"
        (
          "requestId",
          "productId",
          quantity,
          note
        )
        VALUES ($1,$2,$3,$4)
        `,
        [
          r.id,
          Number(item.productId),
          item.quantity,
          item.note || null,
        ]
      );
    }

    await c.query('COMMIT');

    return r;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}
export async function updateRequestStatus(id:number,status:string){return (await query<any>(`UPDATE "purchaseRequest" SET status=$2,"updatedAt"=now() WHERE id=$1 RETURNING *`,[id,status])).rows[0]??null;}
export async function findOrders(){return (await query<any>(`SELECT o.*,s.name AS "supplierName",COUNT(i.id)::int AS "itemCount" FROM "purchaseOrder" o JOIN "supplier" s ON s.id=o."supplierId" LEFT JOIN "purchaseOrderItem" i ON i."orderId"=o.id GROUP BY o.id,s.name ORDER BY o.id DESC LIMIT 300`)).rows;}
export async function findOrder(id:number){const o=(await query<any>(`SELECT o.*,s.name AS "supplierName" FROM "purchaseOrder" o JOIN "supplier" s ON s.id=o."supplierId" WHERE o.id=$1`,[id])).rows[0];if(!o)return null;o.items=(await query<any>(`SELECT i.*,p.name AS "productName",p.sku,p."isSerialized" FROM "purchaseOrderItem" i JOIN "product" p ON p.id=i."productId" WHERE i."orderId"=$1 ORDER BY i.id`,[id])).rows;o.receipts=(await query<any>(`SELECT * FROM "goodsReceipt" WHERE "orderId"=$1 ORDER BY "receivedAt" DESC`,[id])).rows;return o;}
export async function createOrder(input:any,user?:any){
  const resolvedUser = await resolvePurchasingUser(user);

  user = resolvedUser;

  const c = await pool.connect();

  try {
    await c.query('BEGIN');

    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new Error(
        "Satın alma siparişinde en az bir ürün bulunmalıdır."
      );
    }

    let sub = 0;
    let vat = 0;

    const normalizedItems = input.items.map((item:any) => {
      const quantity = requireWholeQuantity(
        item.quantity,
        `${item.description || "Ürün"} miktarı`
      );

      const unitPrice = Number(item.unitPrice);
      const vatRate = Number(item.vatRate ?? 20);

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error(
          `${item.description || "Ürün"} için birim fiyat geçersiz.`
        );
      }

      if (!Number.isFinite(vatRate) || vatRate < 0) {
        throw new Error(
          `${item.description || "Ürün"} için KDV oranı geçersiz.`
        );
      }

      const net = quantity * unitPrice;

      sub += net;
      vat += net * vatRate / 100;

      return {
        ...item,
        quantity,
        unitPrice,
        vatRate,
        net,
      };
    });

    const o = (
      await c.query<any>(
        `
        INSERT INTO "purchaseOrder"
        (
          "orderNo",
          "supplierId",
          "requestId",
          currency,
          subtotal,
          "vatTotal",
          "grandTotal",
          "expectedAt",
          notes,
          "createdBy",
          "createdByName"
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING *
        `,
        [
          nextNo('SAS'),
          Number(input.supplierId),
          input.requestId
            ? Number(input.requestId)
            : null,
          input.currency || 'TRY',
          sub,
          vat,
          sub + vat,
          input.expectedAt || null,
          input.notes || null,
          user?.id || null,
          user
            ? `${user.firstName} ${user.lastName}`
            : null,
        ]
      )
    ).rows[0];

    for (const item of normalizedItems) {
      await c.query(
        `
        INSERT INTO "purchaseOrderItem"
        (
          "orderId",
          "productId",
          description,
          quantity,
          "unitPrice",
          "vatRate",
          "lineTotal"
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          o.id,
          Number(item.productId),
          item.description,
          item.quantity,
          item.unitPrice,
          item.vatRate,
          item.net,
        ]
      );
    }

    if (input.requestId) {
      await c.query(
        `
        UPDATE "purchaseRequest"
        SET
          status='ORDERED',
          "updatedAt"=now()
        WHERE id=$1
        `,
        [Number(input.requestId)]
      );
    }

    await c.query('COMMIT');

    return o;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}
export async function receiveOrder(orderId:number,input:any,user?:any){
  const resolvedUser = await resolvePurchasingUser(user);

  user = resolvedUser;

  const c = await pool.connect();

  try {
    await c.query('BEGIN');const order=(await c.query<any>(`SELECT * FROM "purchaseOrder" WHERE id=$1 FOR UPDATE`,[orderId])).rows[0];if(!order)throw new Error('Satın alma siparişi bulunamadı.');if(['RECEIVED','CANCELLED'].includes(order.status))throw new Error('Bu sipariş mal kabule açık değil.');const receipt=(await c.query<any>(`INSERT INTO "goodsReceipt" ("receiptNo","orderId","supplierId","deliveryNoteNo","receivedBy","receivedByName",notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[nextNo('MK'),orderId,order.supplierId,input.deliveryNoteNo||null,user?.id||null,user?`${user.firstName} ${user.lastName}`:null,input.notes||null])).rows[0];for(const line of input.items||[]){const oi=(await c.query<any>(`SELECT i.*,p."isSerialized",p.name FROM "purchaseOrderItem" i JOIN "product" p ON p.id=i."productId" WHERE i.id=$1 AND i."orderId"=$2 FOR UPDATE`,[Number(line.orderItemId),orderId])).rows[0];if(!oi)throw new Error('Sipariş kalemi bulunamadı.');const qty = requireWholeQuantity(
  line.quantity,
  `${oi.name} mal kabul miktarı`
);

const remaining =
  Number(oi.quantity) -
  Number(oi.receivedQuantity);

if (qty > remaining) {
  throw new Error(
    `${oi.name} için mal kabul miktarı kalan miktarı aşıyor.`
  );
}const serials=Array.isArray(line.serialNumbers)?line.serialNumbers.map((x:any)=>String(x).trim()).filter(Boolean):[];if(oi.isSerialized&&serials.length!==qty)throw new Error(`${oi.name} için ${qty} adet seri numarası girilmelidir.`);await c.query(`INSERT INTO "goodsReceiptItem" ("receiptId","orderItemId","productId",quantity,"serialNumbers") VALUES ($1,$2,$3,$4,$5::jsonb)`,[receipt.id,oi.id,oi.productId,qty,JSON.stringify(serials)]);await c.query(`UPDATE "purchaseOrderItem" SET "receivedQuantity"="receivedQuantity"+$2 WHERE id=$1`,[oi.id,qty]);if(oi.isSerialized){for(const sn of serials){const d=(await c.query<any>(`INSERT INTO "inventoryDevice" ("productId","serialNumber",status) VALUES ($1,$2,'IN_STOCK') RETURNING id`,[oi.productId,sn])).rows[0];await c.query(`INSERT INTO "stockMovement" ("productId","deviceId",type,quantity,"referenceType","referenceId",notes,"createdBy") VALUES ($1,$2,'IN',1,'GOODS_RECEIPT',$3,$4,$5)`,[oi.productId,d.id,receipt.id,`Mal kabul ${receipt.receiptNo}`,user?.id??null]);}}else{await c.query(`UPDATE "product" SET "stockQuantity"="stockQuantity"+$2,"updatedAt"=now() WHERE id=$1`,[oi.productId,qty]);await c.query(`INSERT INTO "stockMovement" ("productId",type,quantity,"referenceType","referenceId",notes,"createdBy") VALUES ($1,'IN',$2,'GOODS_RECEIPT',$3,$4,$5)`,[oi.productId,qty,receipt.id,`Mal kabul ${receipt.receiptNo}`,user?.id??null]);}}
/*
 * Mal kabul edilen miktar kadar tedarikçi borcu oluştur.
 *
 * Finans belgesi sipariş oluşturulduğunda değil, fiziksel mal kabul
 * gerçekleştikçe oluşur/güncellenir. Böylece kısmi mal kabullerde
 * yalnızca teslim alınan miktarın finansal yükümlülüğü kaydedilir.
 */
const receivedFinance = (
  await c.query<any>(
    `
    SELECT
      COALESCE(
        SUM(
          i."receivedQuantity"
          * i."unitPrice"
          * (1 + i."vatRate" / 100.0)
        ),
        0
      ) AS amount
    FROM "purchaseOrderItem" i
    WHERE i."orderId" = $1
    `,
    [orderId]
  )
).rows[0];

const receivedFinanceAmount = Number(
  receivedFinance?.amount ?? 0
);

if (receivedFinanceAmount > 0) {
  await c.query(
    `
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
    VALUES
    (
      $1,
      'SUPPLIER',
      $2,
      'PAYABLE',
      'PURCHASE_ORDER',
      $3,
      $4,
      $5,
      $6,
      COALESCE($7::date, CURRENT_DATE) + 30
    )
    ON CONFLICT ("sourceType", "sourceId")
    DO UPDATE SET
      amount = EXCLUDED.amount,
      description = EXCLUDED.description,
      "dueDate" = EXCLUDED."dueDate",
      "updatedAt" = now()
    `,
    [
      `FIN-PO-${order.id}`,
      order.supplierId,
      order.id,
      `Satın alma siparişi ${order.orderNo}`,
      order.currency,
      receivedFinanceAmount,
      order.expectedAt ?? null,
    ]
  );
}
const left=(await c.query<any>(`SELECT COUNT(*)::int AS n FROM "purchaseOrderItem" WHERE "orderId"=$1 AND "receivedQuantity"<quantity`,[orderId])).rows[0].n;await c.query(`UPDATE "purchaseOrder" SET status=$2,"updatedAt"=now() WHERE id=$1`,[orderId,left===0?'RECEIVED':'PARTIAL']);await c.query('COMMIT');return receipt;}catch(e:any){
  await c.query('ROLLBACK');

  if(
    e?.code==='23505' &&
    e?.constraint==='inventoryDevice_serialNumber_key'
  ){
    const match=String(e?.detail||'').match(/\(serialNumber\)=\((.*?)\)/);
    const serialNumber=match?.[1];

    throw new Error(
      serialNumber
        ? `${serialNumber} seri numaralı cihaz sistemde zaten kayıtlı. Mal kabul işlemi gerçekleştirilemedi.`
        : 'Girilen seri numaralarından biri sistemde zaten kayıtlı. Mal kabul işlemi gerçekleştirilemedi.'
    );
  }

  throw e;
}finally{
  c.release();
}}
export async function criticalProducts(){return (await query<any>(`SELECT p.*,COUNT(d.id) FILTER(WHERE d.status='IN_STOCK')::int AS "deviceStock" FROM "product" p LEFT JOIN "inventoryDevice" d ON d."productId"=p.id WHERE p.status='ACTIVE' GROUP BY p.id HAVING CASE WHEN p."isSerialized" THEN COUNT(d.id) FILTER(WHERE d.status='IN_STOCK') ELSE p."stockQuantity" END <= p."criticalStock" ORDER BY p.name`)).rows;}

export async function findSupplierQuotes(){return (await query<any>(`SELECT q.*,s.name AS "supplierName",r."requestNo",COUNT(i.id)::int AS "itemCount" FROM "supplierQuote" q JOIN "supplier" s ON s.id=q."supplierId" LEFT JOIN "purchaseRequest" r ON r.id=q."requestId" LEFT JOIN "supplierQuoteItem" i ON i."supplierQuoteId"=q.id GROUP BY q.id,s.name,r."requestNo" ORDER BY q.id DESC LIMIT 300`)).rows;}
export async function createSupplierQuote(input:any){
  const c = await pool.connect();

  try {
    await c.query('BEGIN');

    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new Error(
        "Tedarikçi teklifinde en az bir ürün bulunmalıdır."
      );
    }

    let total = 0;

    const normalizedItems = input.items.map((item:any) => {
      const quantity = requireWholeQuantity(
        item.quantity,
        "Tedarikçi teklifi miktarı"
      );

      const unitPrice = Number(item.unitPrice);

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error(
          "Tedarikçi teklifinde birim fiyat geçersiz."
        );
      }

      const lineTotal = quantity * unitPrice;

      total += lineTotal;

      return {
        ...item,
        quantity,
        unitPrice,
        lineTotal,
      };
    });

    const q = (
      await c.query<any>(
        `
        INSERT INTO "supplierQuote"
        (
          "quoteNo",
          "supplierId",
          "requestId",
          currency,
          "validUntil",
          "grandTotal",
          notes
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *
        `,
        [
          nextNo('TT'),
          Number(input.supplierId),
          input.requestId
            ? Number(input.requestId)
            : null,
          input.currency || 'TRY',
          input.validUntil || null,
          total,
          input.notes || null,
        ]
      )
    ).rows[0];

    for (const item of normalizedItems) {
      await c.query(
        `
        INSERT INTO "supplierQuoteItem"
        (
          "supplierQuoteId",
          "productId",
          quantity,
          "unitPrice",
          "lineTotal"
        )
        VALUES ($1,$2,$3,$4,$5)
        `,
        [
          q.id,
          Number(item.productId),
          item.quantity,
          item.unitPrice,
          item.lineTotal,
        ]
      );
    }

    await c.query('COMMIT');

    return q;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}
export async function selectSupplierQuote(id:number){const c=await pool.connect();try{await c.query('BEGIN');const q=(await c.query<any>(`UPDATE "supplierQuote" SET status='SELECTED' WHERE id=$1 RETURNING *`,[id])).rows[0];if(!q){await c.query('ROLLBACK');return null;}if(q.requestId)await c.query(`UPDATE "supplierQuote" SET status='REJECTED' WHERE "requestId"=$1 AND id<>$2 AND status='RECEIVED'`,[q.requestId,id]);if(q.requestId)await c.query(`UPDATE "purchaseRequest" SET status='APPROVED',"updatedAt"=now() WHERE id=$1 AND status<>'ORDERED'`,[q.requestId]);await c.query('COMMIT');return q;}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}}

export async function convertSupplierQuoteToOrder(id:number,user?:any){const c=await pool.connect();try{await c.query('BEGIN');const q=(await c.query<any>(`SELECT * FROM "supplierQuote" WHERE id=$1 FOR UPDATE`,[id])).rows[0];if(!q)throw new Error('Tedarikçi teklifi bulunamadı.');if(q.status==='REJECTED')throw new Error('Reddedilmiş teklif siparişe dönüştürülemez.');const items=(await c.query<any>(`SELECT qi.*,p.name,p."vatRate" FROM "supplierQuoteItem" qi JOIN "product" p ON p.id=qi."productId" WHERE qi."supplierQuoteId"=$1`,[id])).rows;if(!items.length)throw new Error('Teklif kalemi bulunamadı.');let sub=0,vat=0;for(const i of items){sub+=Number(i.lineTotal);vat+=Number(i.lineTotal)*Number(i.vatRate??20)/100;}const o=(await c.query<any>(`INSERT INTO "purchaseOrder" ("orderNo","supplierId","requestId","supplierQuoteId",currency,subtotal,"vatTotal","grandTotal","createdBy","createdByName") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[nextNo('SAS'),q.supplierId,q.requestId||null,q.id,q.currency,sub,vat,sub+vat,user?.id||null,user?`${user.firstName} ${user.lastName}`:null])).rows[0];for(const i of items)await c.query(`INSERT INTO "purchaseOrderItem" ("orderId","productId",description,quantity,"unitPrice","vatRate","lineTotal") VALUES ($1,$2,$3,$4,$5,$6,$7)`,[o.id,i.productId,i.name,i.quantity,i.unitPrice,i.vatRate??20,i.lineTotal]);await c.query(`UPDATE "supplierQuote" SET status='SELECTED' WHERE id=$1`,[id]);if(q.requestId){await c.query(`UPDATE "supplierQuote" SET status='REJECTED' WHERE "requestId"=$1 AND id<>$2 AND status='RECEIVED'`,[q.requestId,id]);await c.query(`UPDATE "purchaseRequest" SET status='ORDERED',"updatedAt"=now() WHERE id=$1`,[q.requestId]);}await c.query('COMMIT');return o;}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}}
