
import { recordAudit } from "../services/audit.service.js";
import type { Request, Response } from "express";

import {
  addQuote,
  completeOrderDelivery,
  createOrderFromQuote,
  decideCustomerQuoteApproval,
  decideQuoteApproval,
  getOrder,
  getQuote,
  listOrders,
  listQuotes,
  decideQuoteRiskApproval,
  requestQuoteApproval,
  requestQuoteRiskApproval,
  sendApprovedQuoteToCustomer,
  setQuoteStatus,
} from "../services/quote.service.js";

import { ok } from "../utils/http.js";

const allowed = [
  "DRAFT",
  "SENT",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
];

// TEKLİF LİSTESİ

export async function quotesIndex(
  req: Request,
  res: Response
) {
  const customerId =
    typeof req.query.customerId === "string"
      ? req.query.customerId
      : undefined;

  return ok(
    res,
    await listQuotes(customerId)
  );
}

// TEKLİF DETAYI

export async function quotesShow(
  req: Request,
  res: Response
) {
  const quoteId = req.params.id;

  if (typeof quoteId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Geçersiz teklif numarası.",
    });
  }

  const quote = await getQuote(quoteId);

  if (!quote) {
    return res.status(404).json({
      success: false,
      message: "Teklif bulunamadı.",
    });
  }

  return ok(res, quote);
}

// YENİ TEKLİF OLUŞTURMA

export async function quotesCreate(
  req: Request,
  res: Response
) {
  if (
    !req.body?.customerId ||
    !Array.isArray(req.body?.items) ||
    !req.body.items.length
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Müşteri ve en az bir teklif kalemi zorunludur.",
    });
  }

  const data = await addQuote(
    req.body,
    req.auth?.userId
  );

  await recordAudit({
    action: "CREATE",
    module: "SALES",
    entityType: "quote",
    entityId: data?.id,
    entityLabel: data?.quoteNo,
    newValues: data,
  });

  return res.status(201).json({
    success: true,
    data,
    message: "Teklif oluşturuldu.",
  });
}

// TEKLİFİ İÇ ONAYA GÖNDERME

export async function quoteApprovalRequest(
  req: Request,
  res: Response
) {
  const quoteId = req.params.id;

  if (typeof quoteId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Geçersiz teklif numarası.",
    });
  }

  const userId = req.auth?.userId;

  if (
    !Number.isSafeInteger(userId) ||
    !userId ||
    userId <= 0
  ) {
    return res.status(401).json({
      success: false,
      message: "İşlemi yapan kullanıcı belirlenemedi.",
    });
  }

  try {
    const data = await requestQuoteApproval(
      quoteId,
      userId,
      typeof req.body?.requestNote === "string"
        ? req.body.requestNote
        : null
    );

    await recordAudit({
      action: "REQUEST_APPROVAL",
      module: "SALES",
      entityType: "quote",
      entityId: quoteId,
      entityLabel: data.quote?.quoteNo,
      newValues: {
        status: data.quote?.status,
        approvalRequestId:
          data.approvalRequest?.id,
      },
    });

    return ok(
      res,
      data,
      "Teklif iç onaya gönderildi."
    );
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Teklif iç onaya gönderilemedi.",
    });
  }
}

// TEKLİF İÇ ONAY KARARI

export async function quoteApprovalDecision(
  req: Request,
  res: Response
) {
  const quoteId = req.params.id;

  if (typeof quoteId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Geçersiz teklif numarası.",
    });
  }

  const userId = req.auth?.userId;

  if (
    !Number.isSafeInteger(userId) ||
    !userId ||
    userId <= 0
  ) {
    return res.status(401).json({
      success: false,
      message: "İşlemi yapan kullanıcı belirlenemedi.",
    });
  }

  const decision = req.body?.decision;

  if (
    decision !== "APPROVE" &&
    decision !== "REJECT" &&
    decision !== "REQUEST_REVISION"
  ) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz iç onay kararı.",
    });
  }

  try {
    const before = await getQuote(quoteId);

    const data = await decideQuoteApproval(
      quoteId,
      decision,
      userId,
      typeof req.body?.decisionNote === "string"
        ? req.body.decisionNote
        : null
    );

    await recordAudit({
      action: "APPROVAL_DECISION",
      module: "SALES",
      entityType: "quote",
      entityId: quoteId,
      entityLabel: data.quote?.quoteNo,
      oldValues: {
        status: before?.status,
      },
      newValues: {
        status: data.quote?.status,
        decision,
        approvalRequestId:
          data.approvalRequest?.id,
      },
    });

    return ok(
      res,
      data,
      decision === "APPROVE"
        ? "Teklif iç onaydan geçti."
        : decision === "REJECT"
          ? "Teklif reddedildi."
          : "Teklif revizyona gönderildi."
    );
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "İç onay kararı kaydedilemedi.",
    });
  }
}

// TEKLİFİ MÜŞTERİYE GÖNDERME

export async function quoteSendToCustomer(
  req: Request,
  res: Response
) {
  const quoteId = req.params.id;

  if (typeof quoteId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Geçersiz teklif numarası.",
    });
  }

  const userId = req.auth?.userId;

  if (
    !Number.isSafeInteger(userId) ||
    !userId ||
    userId <= 0
  ) {
    return res.status(401).json({
      success: false,
      message: "İşlemi yapan kullanıcı belirlenemedi.",
    });
  }

  try {
    const before = await getQuote(quoteId);

    const data = await sendApprovedQuoteToCustomer(
      quoteId,
      userId
    );

    await recordAudit({
      action: "SEND_TO_CUSTOMER",
      module: "SALES",
      entityType: "quote",
      entityId: quoteId,
      entityLabel: data?.quoteNo,
      oldValues: {
        status: before?.status,
      },
      newValues: {
        status: data?.status,
        sentToCustomerAt:
          data?.sentToCustomerAt,
      },
    });

    return ok(
      res,
      data,
      "Teklif müşteriye gönderildi."
    );
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Teklif müşteriye gönderilemedi.",
    });
  }
}

// MÜŞTERİ TEKLİF KARARINI KAYDETME

export async function quoteCustomerDecision(
  req: Request,
  res: Response
) {
  const quoteId = req.params.id;

  if (typeof quoteId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Geçersiz teklif numarası.",
    });
  }

  const userId = req.auth?.userId;

  if (
    !Number.isSafeInteger(userId) ||
    !userId ||
    userId <= 0
  ) {
    return res.status(401).json({
      success: false,
      message: "İşlemi yapan kullanıcı belirlenemedi.",
    });
  }

  const decision = req.body?.decision;

  if (
    decision !== "APPROVE" &&
    decision !== "REJECT"
  ) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz müşteri kararı.",
    });
  }

  try {
    const before = await getQuote(quoteId);

    const data =
      await decideCustomerQuoteApproval(
        quoteId,
        decision,
        userId,
        typeof req.body?.decisionNote === "string"
          ? req.body.decisionNote
          : null
      );

    await recordAudit({
      action: "CUSTOMER_DECISION",
      module: "SALES",
      entityType: "quote",
      entityId: quoteId,
      entityLabel: data.quote?.quoteNo,
      oldValues: {
        status: before?.status,
      },
      newValues: {
        status: data.quote?.status,
        decision,
        decisionNote:
          data.decisionNote,
      },
    });

    return ok(
      res,
      data,
      decision === "APPROVE"
        ? "Müşteri teklif onayı kaydedildi."
        : "Müşteri teklif reddi kaydedildi."
    );
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Müşteri kararı kaydedilemedi.",
    });
  }
}

// FİNANSAL RİSK İSTİSNASI TALEBİ

export async function quoteRiskOverrideRequest(
  req: Request,
  res: Response
) {
  const quoteId = req.params.id;

  if (typeof quoteId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Geçersiz teklif numarası.",
    });
  }

  const userId = req.auth?.userId;

  if (
    !Number.isSafeInteger(userId) ||
    !userId ||
    userId <= 0
  ) {
    return res.status(401).json({
      success: false,
      message: "İşlemi yapan kullanıcı belirlenemedi.",
    });
  }

  try {
    const data = await requestQuoteRiskApproval(
      quoteId,
      userId,
      typeof req.body?.requestNote === "string"
        ? req.body.requestNote
        : null
    );

    await recordAudit({
      action: "REQUEST_RISK_OVERRIDE",
      module: "FINANCE",
      entityType: "quote",
      entityId: quoteId,
      entityLabel: data.quote?.quoteNo,
      newValues: {
        approvalRequestId:
          data.approvalRequest?.id,
        approvalType:
          data.approvalRequest?.approvalType,
        approvalStatus:
          data.approvalRequest?.status,
        riskLevel:
          data.risk?.riskLevel,
        openBalance:
          data.risk?.openBalance,
        proposedAmount:
          data.risk?.proposedAmount,
        projectedExposure:
          data.risk?.projectedExposure,
        creditLimit:
          data.risk?.creditLimit,
      },
    });

    return ok(
      res,
      data,
      "Finansal risk istisnası onaya gönderildi."
    );
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Finansal risk istisnası talebi oluşturulamadı.",
    });
  }
}

// FİNANSAL RİSK İSTİSNASI KARARI

export async function quoteRiskOverrideDecision(
  req: Request,
  res: Response
) {
  const quoteId = req.params.id;

  if (typeof quoteId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Geçersiz teklif numarası.",
    });
  }

  const userId = req.auth?.userId;

  if (
    !Number.isSafeInteger(userId) ||
    !userId ||
    userId <= 0
  ) {
    return res.status(401).json({
      success: false,
      message: "İşlemi yapan kullanıcı belirlenemedi.",
    });
  }

  const decision = req.body?.decision;

  if (
    decision !== "APPROVE" &&
    decision !== "REJECT"
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Geçersiz finansal risk istisnası kararı.",
    });
  }

  try {
    const data = await decideQuoteRiskApproval(
      quoteId,
      decision,
      userId,
      typeof req.body?.decisionNote === "string"
        ? req.body.decisionNote
        : null
    );

    await recordAudit({
      action: "RISK_OVERRIDE_DECISION",
      module: "FINANCE",
      entityType: "quote",
      entityId: quoteId,
      entityLabel: data.quote?.quoteNo,
      newValues: {
        decision,
        approvalRequestId:
          data.approvalRequest?.id,
        approvalStatus:
          data.approvalRequest?.status,
        decidedBy:
          data.approvalRequest?.decidedBy,
      },
    });

    return ok(
      res,
      data,
      decision === "APPROVE"
        ? "Finansal risk istisnası onaylandı."
        : "Finansal risk istisnası reddedildi."
    );
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Finansal risk istisnası kararı kaydedilemedi.",
    });
  }
}

// TEKLİF DURUMUNU GÜNCELLEME

export async function quoteStatusUpdate(
  req: Request,
  res: Response
) {
  const quoteId = req.params.id;

  if (typeof quoteId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Geçersiz teklif numarası.",
    });
  }

  if (!allowed.includes(req.body?.status)) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz teklif durumu.",
    });
  }

  const before = await getQuote(quoteId);

  const quote = await setQuoteStatus(
    quoteId,
    req.body.status
  );

  if (!quote) {
    return res.status(404).json({
      success: false,
      message: "Teklif bulunamadı.",
    });
  }

  await recordAudit({
    action: "STATUS_CHANGE",
    module: "SALES",
    entityType: "quote",
    entityId: quoteId,
    entityLabel: quote.quoteNo,
    oldValues: {
      status: before?.status,
    },
    newValues: {
      status: quote.status,
    },
  });

  return ok(
    res,
    quote,
    "Teklif durumu güncellendi."
  );
}

// TEKLİFİ SİPARİŞE DÖNÜŞTÜRME

export async function quoteConvert(
  req: Request,
  res: Response
) {
  const quoteId = req.params.id;

  if (typeof quoteId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Geçersiz teklif numarası.",
    });
  }

  try {
    const data = await createOrderFromQuote(
      quoteId,
      req.auth?.userId
    );

    await recordAudit({
      action: "CONVERT",
      module: "SALES",
      entityType: "salesOrder",
      entityId: data?.id,
      entityLabel: data?.orderNo,
      newValues: data,
      metadata: {
        quoteId,
      },
    });

    return res.status(201).json({
  success: true,
  data,
  message: "Sipariş başarıyla oluşturuldu.",
});
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Sipariş oluşturulamadı.",
    });
  }
}

// SİPARİŞ LİSTESİ

export async function ordersIndex(
  req: Request,
  res: Response
) {
  const customerId =
    typeof req.query.customerId === "string"
      ? req.query.customerId
      : undefined;

  return ok(
    res,
    await listOrders(customerId)
  );
}

// SİPARİŞ DETAYI

export async function ordersShow(
  req: Request,
  res: Response
) {
  const orderId = req.params.id;

  if (typeof orderId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Geçersiz sipariş numarası.",
    });
  }

  const order = await getOrder(orderId);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Sipariş bulunamadı.",
    });
  }

  return ok(res, order);
}

// SİPARİŞ TESLİMATI

export async function orderDeliver(
  req: Request,
  res: Response
) {
  const orderId = req.params.id;

  if (typeof orderId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Geçersiz sipariş numarası.",
    });
  }

  try {
    const data = await completeOrderDelivery(
      orderId,
      {
  deliveryNote:
    req.body?.deliveryNote ?? null,

  warrantyMonths: Number(
    req.body?.warrantyMonths ?? 24
  ),

  deviceIds: Array.isArray(req.body?.deviceIds)
    ? req.body.deviceIds
        .map((x: unknown) => Number(x))
        .filter(
          (x: number) =>
            Number.isSafeInteger(x) && x > 0
        )
    : [],
},
      req.auth?.userId
    );

    return ok(
      res,
      data,
      "Sipariş teslim edildi; cihaz garantileri başlatıldı."
    );
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Teslimat tamamlanamadı.",
    });
  }
}