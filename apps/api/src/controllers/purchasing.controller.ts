
import { recordAudit } from "../services/audit.service.js";
import { findPublicUserById } from "../auth/service.js";
import type { Request, Response } from "express";
import * as s from "../services/purchasing.service.js";
import { ok } from "../utils/http.js";
async function getPurchaseUser(req: Request) {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new Error("Oturum açmış kullanıcı bulunamadı.");
  }

  const user = await findPublicUserById(userId);

  if (!user) {
    throw new Error("Kullanıcı bilgileri bulunamadı.");
  }

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

// TEDARİKÇİLER

export async function suppliersIndex(
  req: Request,
  res: Response
) {
  return ok(
    res,
    await s.listSuppliers(
      typeof req.query.q === "string"
        ? req.query.q
        : undefined
    )
  );
}

export async function supplierCreate(
  req: Request,
  res: Response
) {
  if (
    typeof req.body?.name !== "string" ||
    !req.body.name.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Tedarikçi adı zorunludur.",
    });
  }

  const data = await s.addSupplier(req.body);

  return res.status(201).json({
    success: true,
    data,
    message: "Tedarikçi oluşturuldu.",
  });
}

// SATIN ALMA TALEPLERİ

export async function purchaseRequestsIndex(
  _req: Request,
  res: Response
) {
  return ok(res, await s.listPurchaseRequests());
}

export async function purchaseRequestCreate(
  req: Request,
  res: Response
) {
  if (
    typeof req.body?.title !== "string" ||
    !req.body.title.trim() ||
    !Array.isArray(req.body?.items) ||
    !req.body.items.length
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Talep başlığı ve en az bir ürün zorunludur.",
    });
  }

  const data = await s.addPurchaseRequest(
    req.body,
    await getPurchaseUser(req)
  );

  return res.status(201).json({
    success: true,
    data,
    message: "Satın alma talebi oluşturuldu.",
  });
}

export async function purchaseRequestStatus(
  req: Request,
  res: Response
) {
  const requestId = Number(req.params.id);

  if (
    !Number.isSafeInteger(requestId) ||
    requestId <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz satın alma talep numarası.",
    });
  }

  const data = await s.setPurchaseRequestStatus(
    requestId,
    String(req.body?.status || "")
  );

  if (!data) {
    return res.status(404).json({
      success: false,
      message: "Talep bulunamadı.",
    });
  }

  return ok(res, data);
}

// SATIN ALMA SİPARİŞLERİ

export async function purchaseOrdersIndex(
  _req: Request,
  res: Response
) {
  return ok(res, await s.listPurchaseOrders());
}

export async function purchaseOrderShow(
  req: Request,
  res: Response
) {
  const orderId = Number(req.params.id);

  if (
    !Number.isSafeInteger(orderId) ||
    orderId <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz sipariş numarası.",
    });
  }

  const data = await s.getPurchaseOrder(orderId);

  if (!data) {
    return res.status(404).json({
      success: false,
      message: "Sipariş bulunamadı.",
    });
  }

  return ok(res, data);
}

export async function purchaseOrderCreate(
  req: Request,
  res: Response
) {
  if (
    !req.body?.supplierId ||
    !Array.isArray(req.body?.items) ||
    !req.body.items.length
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Tedarikçi ve en az bir sipariş kalemi zorunludur.",
    });
  }

  const data = await s.addPurchaseOrder(
    req.body,
    await getPurchaseUser(req)
  );

  await recordAudit({
    action: "CREATE",
    module: "PURCHASE",
    entityType: "purchaseOrder",
    entityId: data?.id,
    entityLabel: data?.orderNo,
    newValues: data,
  });

  return res.status(201).json({
    success: true,
    data,
    message: "Satın alma siparişi oluşturuldu.",
  });
}

// MAL KABUL İŞLEMİ

export async function goodsReceiptCreate(
  req: Request,
  res: Response
) {
  const orderId = Number(req.params.id);

  if (
    !Number.isSafeInteger(orderId) ||
    orderId <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz sipariş numarası.",
    });
  }

  try {
    const data = await s.receivePurchaseOrder(
      orderId,
      req.body,
      await getPurchaseUser(req)
    );

    await recordAudit({
      action: "GOODS_RECEIPT",
      module: "PURCHASE",
      entityType: "purchaseOrder",
      entityId: orderId,
      newValues: data,
    });

    return res.status(201).json({
      success: true,
      data,
      message:
        "Mal kabul tamamlandı ve stok güncellendi.",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Mal kabul tamamlanamadı.",
    });
  }
}

// KRİTİK STOK

export async function criticalStockIndex(
  _req: Request,
  res: Response
) {
  return ok(res, await s.listCriticalProducts());
}

// TEDARİKÇİ TEKLİFLERİ

export async function supplierQuotesIndex(
  _req: Request,
  res: Response
) {
  return ok(res, await s.listSupplierQuotes());
}

export async function supplierQuoteCreate(
  req: Request,
  res: Response
) {
  if (
    !req.body?.supplierId ||
    !Array.isArray(req.body?.items) ||
    !req.body.items.length
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Tedarikçi ve teklif kalemleri zorunludur.",
    });
  }

  const data = await s.addSupplierQuote(req.body);

  return res.status(201).json({
    success: true,
    data,
    message: "Tedarikçi teklifi kaydedildi.",
  });
}

export async function supplierQuoteSelect(
  req: Request,
  res: Response
) {
  const quoteId = Number(req.params.id);

  if (
    !Number.isSafeInteger(quoteId) ||
    quoteId <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz teklif numarası.",
    });
  }

  const data = await s.chooseSupplierQuote(quoteId);

  if (!data) {
    return res.status(404).json({
      success: false,
      message: "Teklif bulunamadı.",
    });
  }

  return ok(
    res,
    data,
    "Tedarikçi teklifi seçildi."
  );
}

// TEDARİKÇİ TEKLİFİNİ SİPARİŞE DÖNÜŞTÜRME

export async function supplierQuoteConvert(
  req: Request,
  res: Response
) {
  const quoteId = Number(req.params.id);

  if (
    !Number.isSafeInteger(quoteId) ||
    quoteId <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz teklif numarası.",
    });
  }

  try {
    const data = await s.convertSupplierQuote(
      quoteId,
      await getPurchaseUser(req)
    );

    return res.status(201).json({
      success: true,
      data,
      message:
        "Teklif satın alma siparişine dönüştürüldü.",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Teklif dönüştürülemedi.",
    });
  }
}