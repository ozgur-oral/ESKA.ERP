
import { recordAudit } from "../services/audit.service.js";
import type { Request, Response } from "express";
import * as svc from "../services/rental.service.js";
import { ok } from "../utils/http.js";

// KİRALAMA LİSTESİ

export async function rentalsIndex(
  req: Request,
  res: Response
) {
  const status =
    typeof req.query.status === "string"
      ? req.query.status
      : undefined;

  const customerId =
    typeof req.query.customerId === "string"
      ? req.query.customerId
      : undefined;

  return ok(
    res,
    await svc.rentals(status, customerId)
  );
}

// KİRALAMA ÖZETİ

export async function rentalsSummary(
  _req: Request,
  res: Response
) {
  return ok(
    res,
    await svc.rentalSummary()
  );
}

// KİRALAMA DETAYI

export async function rentalShow(
  req: Request,
  res: Response
) {
  const rentalId = req.params.id;

  if (
    typeof rentalId !== "string" ||
    !rentalId.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz kiralama numarası.",
    });
  }

  const data = await svc.rental(rentalId);

  if (!data) {
    return res.status(404).json({
      success: false,
      message: "Kiralama bulunamadı.",
    });
  }

  return ok(res, data);
}

// KİRALANABİLİR CİHAZLAR

export async function rentalDevices(
  _req: Request,
  res: Response
) {
  return ok(
    res,
    await svc.rentalAvailableDevices()
  );
}

// YENİ KİRALAMA OLUŞTURMA

export async function rentalCreate(
  req: Request,
  res: Response
) {
  if (!req.body?.customerId) {
    return res.status(400).json({
      success: false,
      message: "Müşteri zorunludur.",
    });
  }

  try {
    const data = await svc.addRental(
      req.body,
      req.auth?.userId
    );

    await recordAudit({
      action: "CREATE",
      module: "RENTAL",
      entityType: "rental",
      entityId: data?.id,
      entityLabel: data?.rentalNo,
      newValues: data,
    });

    return res.status(201).json({
      success: true,
      data,
      message: "Kiralama oluşturuldu.",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Kiralama oluşturulamadı.",
    });
  }
}

// CİHAZ TESLİMİ

export async function rentalDeliver(
  req: Request,
  res: Response
) {
  const rentalId = req.params.id;

  if (
    typeof rentalId !== "string" ||
    !rentalId.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz kiralama numarası.",
    });
  }

  try {
    await svc.deliverRental(
      rentalId,
      req.body || {},
      req.auth?.userId
    );

    const data = await svc.rental(rentalId);

    await recordAudit({
      action: "DELIVER",
      module: "RENTAL",
      entityType: "rental",
      entityId: rentalId,
      newValues: data,
    });

    return ok(
      res,
      data,
      "Cihaz teslim edildi."
    );
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Teslim yapılamadı.",
    });
  }
}

// CİHAZ İADESİ

export async function rentalReturn(
  req: Request,
  res: Response
) {
  const rentalId = req.params.id;

  if (
    typeof rentalId !== "string" ||
    !rentalId.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz kiralama numarası.",
    });
  }

  try {
    await svc.returnRental(
      rentalId,
      req.body || {},
      req.auth?.userId
    );

    const data = await svc.rental(rentalId);

    await recordAudit({
      action: "RETURN",
      module: "RENTAL",
      entityType: "rental",
      entityId: rentalId,
      newValues: data,
    });

    return ok(
      res,
      data,
      "Cihaz iade alındı."
    );
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "İade alınamadı.",
    });
  }
}

// DEPOZİTO DURUMU GÜNCELLEME

export async function rentalDeposit(
  req: Request,
  res: Response
) {
  const rentalId = req.params.id;

  if (
    typeof rentalId !== "string" ||
    !rentalId.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz kiralama numarası.",
    });
  }

  const allowed = [
    "PENDING",
    "RECEIVED",
    "RETURNED",
    "HELD",
    "NOT_REQUIRED",
  ];

  if (
    typeof req.body?.status !== "string" ||
    !allowed.includes(req.body.status)
  ) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz depozito durumu.",
    });
  }

  const data = await svc.depositUpdate(
    rentalId,
    req.body.status
  );

  return ok(res, data);
}

// KİRALAMA FATURALANDIRMA ÖNİZLEMESİ

export async function rentalBilling(
  req: Request,
  res: Response
) {
  const rentalId = req.params.id;

  if (
    typeof rentalId !== "string" ||
    !rentalId.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz kiralama numarası.",
    });
  }

  const data = await svc.billingPreview(
    rentalId
  );

  if (!data) {
    return res.status(404).json({
      success: false,
      message: "Kiralama bulunamadı.",
    });
  }

  return ok(res, data);
}

// KİRALAMA REZERVASYONU İPTALİ

export async function rentalCancel(
  req: Request,
  res: Response
) {
  const rentalId = req.params.id;

  if (
    typeof rentalId !== "string" ||
    !rentalId.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz kiralama numarası.",
    });
  }

  try {
    await svc.cancelRental(
      rentalId,
      req.auth?.userId
    );

    const data = await svc.rental(rentalId);

    return ok(
      res,
      data,
      "Kiralama rezervasyonu iptal edildi."
    );
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "İptal edilemedi.",
    });
  }
}