import { customerRisk } from "./finance.repository.js";
import { pool, query } from "../db/pool.js";
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
export type QuoteInput={customerId:number;validUntil?:string|null;currency?:string;notes?:string|null;items:{productId?:number|null;description:string;quantity:number;unitPrice:number;vatRate:number}[]};
export async function findQuotes(customerId?:number){const v=customerId?[customerId]:[];const w=customerId?`WHERE q."customerId"=$1`:``;const r=await query<any>(`SELECT q.*,c.name AS "customerName",COUNT(i.id)::int AS "itemCount" FROM "quote" q JOIN "customer" c ON c.id=q."customerId" LEFT JOIN "quoteItem" i ON i."quoteId"=q.id ${w} GROUP BY q.id,c.name ORDER BY q.id DESC LIMIT 300`,v);return r.rows;}
export async function findQuote(id:number){const q=await query<any>(`SELECT q.*,c.name AS "customerName" FROM "quote" q JOIN "customer" c ON c.id=q."customerId" WHERE q.id=$1`,[id]);if(!q.rows[0])return null;const items=await query<any>(`SELECT i.*,p.sku,p.name AS "productName",p."isSerialized" FROM "quoteItem" i LEFT JOIN "product" p ON p.id=i."productId" WHERE i."quoteId"=$1 ORDER BY i.id`,[id]);return {...q.rows[0],items:items.rows};}
export async function createQuote(
  input: QuoteInput,
  userId?: number
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new Error(
        "Teklifte en az bir ürün bulunmalıdır."
      );
    }

    let subtotal = 0;
    let vatTotal = 0;

    const normalizedItems = input.items.map((item) => {
      const quantity = requireWholeQuantity(
        item.quantity,
        `${item.description || "Ürün"} miktarı`
      );

      const unitPrice = Number(item.unitPrice);
      const vatRate = Number(item.vatRate);

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

      const lineTotal = quantity * unitPrice;

      subtotal += lineTotal;
      vatTotal += lineTotal * (vatRate / 100);

      return {
        ...item,
        quantity,
        unitPrice,
        vatRate,
        lineTotal,
      };
    });

    const grandTotal = subtotal + vatTotal;

    const quoteNo =
      `TKL-${new Date().getFullYear()}-${Date.now()
        .toString()
        .slice(-6)}`;

    const quote = (
      await client.query<any>(
        `
        INSERT INTO "quote"
        (
          "quoteNo",
          "customerId",
          "status",
          "validUntil",
          "currency",
          "subtotal",
          "vatTotal",
          "grandTotal",
          "notes",
          "createdBy"
        )
        VALUES ($1,$2,'DRAFT',$3,$4,$5,$6,$7,$8,$9)
        RETURNING *
        `,
        [
          quoteNo,
          input.customerId,
          input.validUntil ?? null,
          input.currency ?? "TRY",
          subtotal,
          vatTotal,
          grandTotal,
          input.notes ?? null,
          userId ?? null,
        ]
      )
    ).rows[0];

    for (const item of normalizedItems) {
      await client.query(
        `
        INSERT INTO "quoteItem"
        (
          "quoteId",
          "productId",
          "description",
          "quantity",
          "unitPrice",
          "vatRate",
          "lineTotal"
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          quote.id,
          item.productId ?? null,
          item.description,
          item.quantity,
          item.unitPrice,
          item.vatRate,
          item.lineTotal,
        ]
      );
    }

    await client.query("COMMIT");

    return findQuote(quote.id);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
export async function updateQuoteStatus(id:number,status:string){const r=await query<any>(`UPDATE "quote" SET status=$2,"updatedAt"=now() WHERE id=$1 RETURNING *`,[id,status]);return r.rows[0]??null;}
export async function requestQuoteInternalApproval(
  id: number,
  userId: number,
  requestNote?: string | null
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0
    ) {
      throw new Error(
        "Onay talebini oluşturan kullanıcı belirlenemedi."
      );
    }

    const quote = (
      await client.query<any>(
        `
        SELECT *
        FROM "quote"
        WHERE id=$1
        FOR UPDATE
        `,
        [id]
      )
    ).rows[0];

    if (!quote) {
      throw new Error("Teklif bulunamadı.");
    }

    if (
      !["DRAFT", "REVISION_REQUESTED"].includes(
        quote.status
      )
    ) {
      throw new Error(
        "Yalnızca taslak veya revizyon istenmiş teklifler iç onaya gönderilebilir."
      );
    }

    const pendingApproval = (
      await client.query<any>(
        `
        SELECT id
        FROM "approvalRequest"
        WHERE "entityType"='QUOTE'
          AND "entityId"=$1
          AND "approvalType"='SALES_INTERNAL_APPROVAL'
          AND status='PENDING'
        LIMIT 1
        `,
        [id]
      )
    ).rows[0];

    if (pendingApproval) {
      throw new Error(
        "Bu teklif için zaten bekleyen bir iç onay talebi bulunuyor."
      );
    }

    const approvalRequest = (
      await client.query<any>(
        `
        INSERT INTO "approvalRequest"
        (
          module,
          "entityType",
          "entityId",
          "approvalType",
          status,
          "requestedBy",
          "requestNote"
        )
        VALUES
        (
          'SALES',
          'QUOTE',
          $1,
          'SALES_INTERNAL_APPROVAL',
          'PENDING',
          $2,
          $3
        )
        RETURNING *
        `,
        [
          id,
          userId,
          requestNote?.trim() || null,
        ]
      )
    ).rows[0];

    await client.query(
      `
      UPDATE "quote"
      SET
        status='PENDING_INTERNAL_APPROVAL',
        "internalApprovalRequestedAt"=now(),
        "updatedAt"=now()
      WHERE id=$1
      `,
      [id]
    );

    await client.query("COMMIT");

    return {
      quote: await findQuote(id),
      approvalRequest,
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
export type QuoteApprovalDecision =
  | "APPROVE"
  | "REJECT"
  | "REQUEST_REVISION";

export async function decideQuoteInternalApproval(
  id: number,
  decision: QuoteApprovalDecision,
  userId: number,
  decisionNote?: string | null
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0
    ) {
      throw new Error(
        "Onay kararını veren kullanıcı belirlenemedi."
      );
    }

    const quote = (
      await client.query<any>(
        `
        SELECT *
        FROM "quote"
        WHERE id=$1
        FOR UPDATE
        `,
        [id]
      )
    ).rows[0];

    if (!quote) {
      throw new Error("Teklif bulunamadı.");
    }

    if (
      quote.status !== "PENDING_INTERNAL_APPROVAL"
    ) {
      throw new Error(
        "Yalnızca iç onay bekleyen teklifler için karar verilebilir."
      );
    }

    const approvalRequest = (
      await client.query<any>(
        `
        SELECT *
        FROM "approvalRequest"
        WHERE "entityType"='QUOTE'
          AND "entityId"=$1
          AND "approvalType"='SALES_INTERNAL_APPROVAL'
          AND status='PENDING'
        ORDER BY id DESC
        LIMIT 1
        FOR UPDATE
        `,
        [id]
      )
    ).rows[0];

    if (!approvalRequest) {
      throw new Error(
        "Teklif için bekleyen iç onay talebi bulunamadı."
      );
    }

    let approvalStatus:
      | "APPROVED"
      | "REJECTED"
      | "REVISION_REQUESTED";

    let quoteStatus:
      | "INTERNALLY_APPROVED"
      | "REJECTED"
      | "REVISION_REQUESTED";

    switch (decision) {
      case "APPROVE":
        approvalStatus = "APPROVED";
        quoteStatus = "INTERNALLY_APPROVED";
        break;

      case "REJECT":
        approvalStatus = "REJECTED";
        quoteStatus = "REJECTED";
        break;

      case "REQUEST_REVISION":
        approvalStatus = "REVISION_REQUESTED";
        quoteStatus = "REVISION_REQUESTED";
        break;

      default:
        throw new Error(
          "Geçersiz iç onay kararı."
        );
    }

    const decidedApproval = (
      await client.query<any>(
        `
        UPDATE "approvalRequest"
        SET
          status=$2,
          "decidedBy"=$3,
          "decidedAt"=now(),
          "decisionNote"=$4,
          "updatedAt"=now()
        WHERE id=$1
        RETURNING *
        `,
        [
          approvalRequest.id,
          approvalStatus,
          userId,
          decisionNote?.trim() || null,
        ]
      )
    ).rows[0];

    await client.query(
      `
      UPDATE "quote"
      SET
        status=$2,
        "internalApprovedAt"=
          CASE
            WHEN $2='INTERNALLY_APPROVED'
            THEN now()
            ELSE NULL
          END,
        "internalApprovedBy"=
          CASE
            WHEN $2='INTERNALLY_APPROVED'
            THEN $3::INTEGER
            ELSE NULL
          END,
        "updatedAt"=now()
      WHERE id=$1
      `,
      [
        id,
        quoteStatus,
        userId,
      ]
    );

    await client.query("COMMIT");

    return {
      quote: await findQuote(id),
      approvalRequest: decidedApproval,
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
export async function sendQuoteToCustomer(
  id: number,
  userId: number
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0
    ) {
      throw new Error(
        "İşlemi yapan kullanıcı belirlenemedi."
      );
    }

    const quote = (
      await client.query<any>(
        `
        SELECT *
        FROM "quote"
        WHERE id=$1
        FOR UPDATE
        `,
        [id]
      )
    ).rows[0];

    if (!quote) {
      throw new Error("Teklif bulunamadı.");
    }

    if (quote.status !== "INTERNALLY_APPROVED") {
      throw new Error(
        "Yalnızca iç onaydan geçmiş teklifler müşteriye gönderilebilir."
      );
    }

    await client.query(
      `
      UPDATE "quote"
      SET
        status='SENT_TO_CUSTOMER',
        "sentToCustomerAt"=now(),
        "updatedAt"=now()
      WHERE id=$1
      `,
      [id]
    );

    await client.query("COMMIT");

    return findQuote(id);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
export type QuoteCustomerDecision =
  | "APPROVE"
  | "REJECT";

export async function decideQuoteCustomerApproval(
  id: number,
  decision: QuoteCustomerDecision,
  userId: number,
  decisionNote?: string | null
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0
    ) {
      throw new Error(
        "İşlemi yapan kullanıcı belirlenemedi."
      );
    }

    if (
      decision !== "APPROVE" &&
      decision !== "REJECT"
    ) {
      throw new Error(
        "Geçersiz müşteri kararı."
      );
    }

    const quote = (
      await client.query<any>(
        `
        SELECT *
        FROM "quote"
        WHERE id=$1
        FOR UPDATE
        `,
        [id]
      )
    ).rows[0];

    if (!quote) {
      throw new Error("Teklif bulunamadı.");
    }

    if (quote.status !== "SENT_TO_CUSTOMER") {
      throw new Error(
        "Yalnızca müşteriye gönderilmiş teklifler için müşteri kararı kaydedilebilir."
      );
    }

    const nextStatus =
      decision === "APPROVE"
        ? "CUSTOMER_APPROVED"
        : "REJECTED";

    await client.query(
      `
      UPDATE "quote"
      SET
        status=$2,
        "customerApprovedAt"=
          CASE
            WHEN $2='CUSTOMER_APPROVED'
            THEN now()
            ELSE NULL
          END,
        "updatedAt"=now()
      WHERE id=$1
      `,
      [
        id,
        nextStatus,
      ]
    );

    await client.query("COMMIT");

    return {
      quote: await findQuote(id),
      decision,
      decisionNote:
        decisionNote?.trim() || null,
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
export async function requestQuoteRiskOverride(
  id: number,
  userId: number,
  requestNote?: string | null
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0
    ) {
      throw new Error(
        "Risk istisnası talebini oluşturan kullanıcı belirlenemedi."
      );
    }

    const quote = (
      await client.query<any>(
        `
        SELECT *
        FROM "quote"
        WHERE id=$1
        FOR UPDATE
        `,
        [id]
      )
    ).rows[0];

    if (!quote) {
      throw new Error("Teklif bulunamadı.");
    }

    if (quote.status !== "CUSTOMER_APPROVED") {
      throw new Error(
        "Yalnızca müşteri tarafından onaylanmış teklifler için risk istisnası talep edilebilir."
      );
    }

    const risk = await customerRisk(
      Number(quote.customerId),
      Number(quote.grandTotal)
    );

    if (!risk) {
      throw new Error(
        "Müşteri risk bilgisi hesaplanamadı."
      );
    }

    if (risk.canOrder) {
      throw new Error(
        "Bu teklif için finansal risk engeli bulunmuyor; risk istisnası gerekli değil."
      );
    }

    const pendingApproval = (
      await client.query<any>(
        `
        SELECT *
        FROM "approvalRequest"
        WHERE "entityType"='QUOTE'
          AND "entityId"=$1
          AND "approvalType"='SALES_RISK_OVERRIDE'
          AND status='PENDING'
        LIMIT 1
        `,
        [id]
      )
    ).rows[0];

    if (pendingApproval) {
      throw new Error(
        "Bu teklif için zaten bekleyen bir risk istisnası talebi bulunuyor."
      );
    }

    const riskSummary = [
      `Açık bakiye: ${Number(
        risk.openBalance
      ).toFixed(2)} TL`,
      `Teklif tutarı: ${Number(
        quote.grandTotal
      ).toFixed(2)} TL`,
      `Projeksiyon: ${Number(
        risk.projectedExposure
      ).toFixed(2)} TL`,
      `Kredi limiti: ${Number(
        risk.creditLimit
      ).toFixed(2)} TL`,
      `Gecikmiş bakiye: ${Number(
        risk.overdueBalance
      ).toFixed(2)} TL`,
      `Risk seviyesi: ${risk.riskLevel}`,
    ].join(" | ");

    const note = requestNote?.trim()
      ? `${requestNote.trim()} | ${riskSummary}`
      : riskSummary;

    const approvalRequest = (
      await client.query<any>(
        `
        INSERT INTO "approvalRequest"
        (
          module,
          "entityType",
          "entityId",
          "approvalType",
          status,
          "requestedBy",
          "requestNote"
        )
        VALUES
        (
          'FINANCE',
          'QUOTE',
          $1,
          'SALES_RISK_OVERRIDE',
          'PENDING',
          $2,
          $3
        )
        RETURNING *
        `,
        [id, userId, note]
      )
    ).rows[0];

    await client.query("COMMIT");

    return {
      quote: await findQuote(id),
      risk,
      approvalRequest,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export type QuoteRiskOverrideDecision =
  | "APPROVE"
  | "REJECT";

export async function decideQuoteRiskOverride(
  id: number,
  decision: QuoteRiskOverrideDecision,
  userId: number,
  decisionNote?: string | null
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0
    ) {
      throw new Error(
        "Risk istisnası kararını veren kullanıcı belirlenemedi."
      );
    }

    const quote = (
      await client.query<any>(
        `
        SELECT *
        FROM "quote"
        WHERE id=$1
        FOR UPDATE
        `,
        [id]
      )
    ).rows[0];

    if (!quote) {
      throw new Error("Teklif bulunamadı.");
    }

    if (quote.status !== "CUSTOMER_APPROVED") {
      throw new Error(
        "Yalnızca müşteri tarafından onaylanmış teklifler için risk istisnası kararı verilebilir."
      );
    }

    const approvalRequest = (
      await client.query<any>(
        `
        SELECT *
        FROM "approvalRequest"
        WHERE "entityType"='QUOTE'
          AND "entityId"=$1
          AND "approvalType"='SALES_RISK_OVERRIDE'
          AND status='PENDING'
        ORDER BY id DESC
        LIMIT 1
        FOR UPDATE
        `,
        [id]
      )
    ).rows[0];

    if (!approvalRequest) {
      throw new Error(
        "Bu teklif için bekleyen bir finansal risk istisnası talebi bulunamadı."
      );
    }

    const approvalStatus =
      decision === "APPROVE"
        ? "APPROVED"
        : "REJECTED";

    const decidedApproval = (
      await client.query<any>(
        `
        UPDATE "approvalRequest"
        SET
          status=$2,
          "decidedBy"=$3,
          "decidedAt"=now(),
          "decisionNote"=$4,
          "updatedAt"=now()
        WHERE id=$1
        RETURNING *
        `,
        [
          approvalRequest.id,
          approvalStatus,
          userId,
          decisionNote?.trim() || null,
        ]
      )
    ).rows[0];

    await client.query("COMMIT");

    return {
      quote: await findQuote(id),
      approvalRequest: decidedApproval,
      decision,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function convertQuoteToOrder(
  id: number,
  userId?: number
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const q = (
      await client.query<any>(
        `SELECT * FROM "quote" WHERE id=$1 FOR UPDATE`,
        [id]
      )
    ).rows[0];

    if (!q) {
      throw new Error("Teklif bulunamadı.");
    }

    /*
     * Aynı teklif daha önce siparişe dönüştürüldüyse
     * ikinci bir sipariş oluşturma.
     */
    const existing = (
      await client.query<any>(
        `SELECT * FROM "salesOrder" WHERE "quoteId"=$1`,
        [id]
      )
    ).rows[0];

    if (existing) {
      await client.query("ROLLBACK");
      return existing;
    }

    if (q.status !== "CUSTOMER_APPROVED") {
  throw new Error(
    "Yalnızca müşteri tarafından onaylanmış teklifler siparişe dönüştürülebilir."
  );
}

    /*
     * Sipariş oluşturulmadan önce müşteri riskini kontrol et.
     */
    const risk = await customerRisk(
      Number(q.customerId),
      Number(q.grandTotal)
    );

    if (risk && !risk.canOrder) {
  const approvedRiskOverride = (
    await client.query<any>(
      `
      SELECT *
      FROM "approvalRequest"
      WHERE "entityType"='QUOTE'
        AND "entityId"=$1
        AND "approvalType"='SALES_RISK_OVERRIDE'
        AND status='APPROVED'
      ORDER BY "decidedAt" DESC NULLS LAST, id DESC
      LIMIT 1
      `,
      [id]
    )
  ).rows[0];

  if (!approvedRiskOverride) {
    throw new Error(
      `Müşteri risk politikası siparişi engelliyor. ` +
      `Açık bakiye: ${Number(
        risk.openBalance
      ).toFixed(2)} TL, ` +
      `gecikmiş: ${Number(
        risk.overdueBalance
      ).toFixed(2)} TL, ` +
      `limit: ${Number(
        risk.creditLimit
      ).toFixed(2)} TL. ` +
      `Sipariş için finansal risk istisnası onayı gereklidir.`
    );
  }
}

    const orderNo =
      `SIP-${new Date().getFullYear()}-${Date.now()
        .toString()
        .slice(-6)}`;

    const order = (
      await client.query<any>(
        `
        INSERT INTO "salesOrder"
        (
          "orderNo",
          "quoteId",
          "customerId",
          "currency",
          "subtotal",
          "vatTotal",
          "grandTotal",
          "createdBy"
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *
        `,
        [
          orderNo,
          id,
          q.customerId,
          q.currency,
          q.subtotal,
          q.vatTotal,
          q.grandTotal,
          userId ?? null,
        ]
      )
    ).rows[0];

    /*
     * Teklif kalemlerini siparişe kopyala.
     *
     * ÖNEMLİ:
     * Bu aşamada stoktan hiçbir ürün düşülmez.
     * Seri numaralı cihaz da otomatik seçilmez.
     *
     * Fiziksel stok çıkışı teslimat aşamasında yapılacaktır.
     */
    const items = (
      await client.query<any>(
        `
        SELECT
          qi.*,
          p."isSerialized"
        FROM "quoteItem" qi
        LEFT JOIN "product" p
          ON p.id = qi."productId"
        WHERE qi."quoteId"=$1
        ORDER BY qi.id
        `,
        [id]
      )
    ).rows;

    for (const i of items) {
      await client.query(
        `
        INSERT INTO "salesOrderItem"
        (
          "salesOrderId",
          "productId",
          "description",
          "quantity",
          "unitPrice",
          "vatRate",
          "lineTotal"
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          order.id,
          i.productId,
          i.description,
          i.quantity,
          i.unitPrice,
          i.vatRate,
          i.lineTotal,
        ]
      );
    }

    /*
     * Teklif artık siparişe dönüştürüldü.
     * Böylece kullanıcı arayüzünde tekrar dönüştürülebilir
     * bir teklif gibi davranmasını engelleyebiliriz.
     */
    await client.query(
      `
      UPDATE "quote"
      SET
        status='ORDERED',
        "updatedAt"=now()
      WHERE id=$1
      `,
      [id]
    );

    await client.query("COMMIT");

    return order;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
export async function findOrders(customerId?:number){const v=customerId?[customerId]:[];const w=customerId?`WHERE o."customerId"=$1`:``;const r=await query<any>(`SELECT o.*,c.name AS "customerName",COUNT(i.id)::int AS "itemCount" FROM "salesOrder" o JOIN "customer" c ON c.id=o."customerId" LEFT JOIN "salesOrderItem" i ON i."salesOrderId"=o.id ${w} GROUP BY o.id,c.name ORDER BY o.id DESC`,v);return r.rows;}

export async function findOrder(id:number){const o=await query<any>(`SELECT o.*,c.name AS "customerName" FROM "salesOrder" o JOIN "customer" c ON c.id=o."customerId" WHERE o.id=$1`,[id]);if(!o.rows[0])return null;const items=await query<any>(`SELECT i.*,p.sku,p.name AS "productName",p."isSerialized" FROM "salesOrderItem" i LEFT JOIN "product" p ON p.id=i."productId" WHERE i."salesOrderId"=$1 ORDER BY i.id`,[id]);const devices=await query<any>(`SELECT d.*,p.name AS "productName",p.sku FROM "inventoryDevice" d JOIN "product" p ON p.id=d."productId" WHERE d."salesOrderId"=$1 ORDER BY d.id`,[id]);return {...o.rows[0],items:items.rows,devices:devices.rows};}
export async function deliverOrder(
  id: number,
  input: {
    deliveryNote?: string | null;
    warrantyMonths?: number;
    deviceIds?: number[];
  },
  userId?: number
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const order = (
      await client.query<any>(
        `SELECT * FROM "salesOrder" WHERE id=$1 FOR UPDATE`,
        [id]
      )
    ).rows[0];

    if (!order) {
      throw new Error("Sipariş bulunamadı.");
    }

    if (order.status === "CANCELLED") {
      throw new Error("İptal edilmiş sipariş teslim edilemez.");
    }

    if (order.status === "DELIVERED") {
      await client.query("ROLLBACK");
      return findOrder(id);
    }

    const orderItems = (
      await client.query<any>(
        `
        SELECT
          soi.*,
          p.name AS "productName",
          p."isSerialized",
          p."stockQuantity"
        FROM "salesOrderItem" soi
        LEFT JOIN "product" p
          ON p.id = soi."productId"
        WHERE soi."salesOrderId"=$1
        ORDER BY soi.id
        FOR UPDATE OF soi
        `,
        [id]
      )
    ).rows;

    const requestedDeviceIds = Array.isArray(input.deviceIds)
      ? [...new Set(
          input.deviceIds
            .map((x) => Number(x))
            .filter((x) => Number.isSafeInteger(x) && x > 0)
        )]
      : [];

    /*
     * Seri numaralı ürünler için siparişin ihtiyaç duyduğu
     * cihaz sayısını hesapla.
     */
    let serializedQuantity = 0;

    for (const item of orderItems) {
      if (item.productId && item.isSerialized) {
        const qty = Number(item.quantity);

        if (!Number.isInteger(qty) || qty <= 0) {
          throw new Error(
            `${item.productName ?? item.description} için seri numaralı ürün miktarı tam sayı olmalıdır.`
          );
        }

        serializedQuantity += qty;
      }
    }

    if (requestedDeviceIds.length !== serializedQuantity) {
      throw new Error(
        `Teslimat için ${serializedQuantity} adet seri numaralı cihaz seçilmelidir.`
      );
    }

    /*
     * Kullanıcının seçtiği cihazları kilitle ve doğrula.
     */
    let selectedDevices: any[] = [];

    if (requestedDeviceIds.length > 0) {
      selectedDevices = (
        await client.query<any>(
          `
          SELECT
            d.id,
            d."productId",
            d."serialNumber",
            d.status
          FROM "inventoryDevice" d
          WHERE d.id = ANY($1::int[])
          FOR UPDATE
          `,
          [requestedDeviceIds]
        )
      ).rows;

      if (selectedDevices.length !== requestedDeviceIds.length) {
        throw new Error(
          "Seçilen cihazlardan biri sistemde bulunamadı."
        );
      }

      for (const device of selectedDevices) {
        if (device.status !== "IN_STOCK") {
          throw new Error(
            `${device.serialNumber} seri numaralı cihaz stokta değil.`
          );
        }
      }

      /*
       * Her ürün için seçilen cihaz adedi sipariş miktarıyla
       * birebir uyuşmalı.
       */
      for (const item of orderItems) {
        if (!item.productId || !item.isSerialized) {
          continue;
        }

        const requiredQty = Number(item.quantity);

        const selectedQty = selectedDevices.filter(
          (d) => Number(d.productId) === Number(item.productId)
        ).length;

        if (selectedQty !== requiredQty) {
          throw new Error(
            `${item.productName ?? item.description} için ${requiredQty} adet uygun seri numaralı cihaz seçilmelidir.`
          );
        }
      }

      /*
       * Siparişte bulunmayan bir ürünün cihazı seçilmiş olamaz.
       */
      for (const device of selectedDevices) {
        const belongsToOrder = orderItems.some(
          (item) =>
            item.isSerialized &&
            Number(item.productId) === Number(device.productId)
        );

        if (!belongsToOrder) {
          throw new Error(
            `${device.serialNumber} seri numaralı cihaz bu siparişin ürünlerinden biri değildir.`
          );
        }
      }
    }

    /*
     * Miktarlı ürünlerde fiziksel stok yeterliliğini kontrol et.
     * Henüz hiçbir stok hareketi yapmıyoruz.
     */
    for (const item of orderItems) {
      if (!item.productId || item.isSerialized) {
        continue;
      }

      const requiredQty = Number(item.quantity);
      const availableQty = Number(item.stockQuantity ?? 0);

      if (requiredQty <= 0) {
        throw new Error(
          `${item.productName ?? item.description} için geçersiz teslimat miktarı.`
        );
      }

      if (availableQty < requiredQty) {
        throw new Error(
          `${item.productName ?? item.description} için yeterli stok yok. Mevcut: ${availableQty}, gerekli: ${requiredQty}.`
        );
      }
    }

    const months = Math.max(
      0,
      Math.min(120, Number(input.warrantyMonths ?? 24))
    );

    const deliveredAt = new Date();

    /*
     * Seri numaralı cihazları müşteriye ata ve stok çıkışını oluştur.
     */
    for (const device of selectedDevices) {
      await client.query(
        `
        UPDATE "inventoryDevice"
SET
  status='AT_CUSTOMER',
  "customerId"=$2,
  "salesOrderId"=$3,
  "soldAt"=$4::timestamptz,
  "deliveredAt"=$4::timestamptz,
  "warrantyStartAt"=$4::timestamptz,
  "warrantyEndAt"=$4::timestamptz
    + make_interval(months => $5::int),
  "warrantyMonths"=$5::int,
  "updatedAt"=now()
WHERE id=$1
        `,
        [
          device.id,
          order.customerId,
          order.id,
          deliveredAt,
          months,
        ]
      );

      await client.query(
        `
        INSERT INTO "stockMovement"
        (
          "productId",
          "deviceId",
          "type",
          "quantity",
          "referenceType",
          "referenceId",
          "notes",
          "createdBy"
        )
        VALUES ($1,$2,'OUT',1,'DELIVERY',$3,$4,$5)
        `,
        [
          device.productId,
          device.id,
          order.id,
          `Müşteriye teslim - ${device.serialNumber}`,
          userId ?? null,
        ]
      );
    }

    /*
     * Seri numarasız ürünleri şimdi stoktan düş.
     */
    for (const item of orderItems) {
      if (!item.productId || item.isSerialized) {
        continue;
      }

      const updated = (
        await client.query<any>(
          `
          UPDATE "product"
          SET
            "stockQuantity"="stockQuantity"-$2,
            "updatedAt"=now()
          WHERE id=$1
            AND "stockQuantity">=$2
          RETURNING id
          `,
          [item.productId, item.quantity]
        )
      ).rows[0];

      if (!updated) {
        throw new Error(
          `${item.productName ?? item.description} için stok teslimat sırasında yetersiz kaldı.`
        );
      }

      await client.query(
        `
        INSERT INTO "stockMovement"
        (
          "productId",
          "type",
          "quantity",
          "referenceType",
          "referenceId",
          "notes",
          "createdBy"
        )
        VALUES ($1,'OUT',$2,'DELIVERY',$3,$4,$5)
        `,
        [
          item.productId,
          item.quantity,
          order.id,
          "Müşteriye fiziksel teslim",
          userId ?? null,
        ]
      );
    }

    /*
     * Bütün kontroller ve stok işlemleri başarılıysa
     * siparişi teslim edildi olarak kapat.
     */
    await client.query(
      `
      UPDATE "salesOrder"
      SET
        status='DELIVERED',
        "deliveredAt"=$2,
        "deliveryNote"=$3,
        "updatedAt"=now()
      WHERE id=$1
      `,
      [
        id,
        deliveredAt,
        input.deliveryNote ?? null,
      ]
    );

    await client.query("COMMIT");

    return findOrder(id);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
