
import { recordAudit } from "../services/audit.service.js";

import type { Request, Response } from "express";

import {
  addServiceRecord,
  changeServiceBilling,
  changeServiceStatus,
  createServiceOperation,
  createServicePart,
  getServiceRecord,
  listServiceRecords,
} from "../services/service-record.service.js";

import { ok } from "../utils/http.js";

// SERVİS KAYITLARI LİSTESİ

export async function serviceRecordsIndex(
  req: Request,
  res: Response
) {
  const status =
    typeof req.query.status === "string"
      ? req.query.status
      : undefined;

  return ok(
    res,
    await listServiceRecords(status)
  );
}

// SERVİS KAYDI DETAYI

export async function serviceRecordsShow(
  req: Request,
  res: Response
) {
  const serviceId = req.params.id;

  if (
    typeof serviceId !== "string" ||
    !serviceId.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz servis kayıt numarası.",
    });
  }

  const record = await getServiceRecord(serviceId);

  if (!record) {
    return res.status(404).json({
      success: false,
      message: "Servis kaydı bulunamadı.",
    });
  }

  return ok(res, record);
}

// YENİ SERVİS KAYDI OLUŞTURMA

export async function serviceRecordsCreate(
  req: Request,
  res: Response
) {
  if (
    !req.body?.customerId ||
    !req.body?.problem
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Müşteri ve arıza açıklaması zorunludur.",
    });
  }

  try {
    const record = await addServiceRecord(
      req.body,
      req.auth?.userId
    );

    await recordAudit({
      action: "CREATE",
      module: "SERVICE",
      entityType: "serviceRecord",
      entityId: record?.id,
      entityLabel: record?.serviceNo,
      newValues: record,
    });

    return res.status(201).json({
      success: true,
      message: "Servis kaydı açıldı.",
      data: record,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Servis kaydı oluşturulamadı.",
    });
  }
}

// SERVİS DURUMUNU GÜNCELLEME

export async function serviceRecordStatusUpdate(
  req: Request,
  res: Response
) {
  const serviceId = req.params.id;

  if (
    typeof serviceId !== "string" ||
    !serviceId.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz servis kayıt numarası.",
    });
  }

  if (!req.body?.status) {
    return res.status(400).json({
      success: false,
      message: "Durum zorunludur.",
    });
  }

  try {
    const record = await changeServiceStatus(
      serviceId,
      req.body.status,
      req.auth?.userId,
      req.body?.note
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Servis kaydı bulunamadı.",
      });
    }

    await recordAudit({
      action: "STATUS_CHANGE",
      module: "SERVICE",
      entityType: "serviceRecord",
      entityId: serviceId,
      entityLabel: record.serviceNo,
      newValues: {
        status: record.status,
        note: req.body?.note,
      },
    });

    return ok(
      res,
      record,
      "Servis durumu güncellendi."
    );
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Servis durumu güncellenemedi.",
    });
  }
}

// SERVİS İŞLEMİ EKLEME

export async function serviceOperationCreate(
  req: Request,
  res: Response
) {
  const serviceId = req.params.id;

  if (
    typeof serviceId !== "string" ||
    !serviceId.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz servis kayıt numarası.",
    });
  }

  if (!req.body?.description) {
    return res.status(400).json({
      success: false,
      message: "İşlem açıklaması zorunludur.",
    });
  }

  try {
    const item = await createServiceOperation(
      serviceId,
      req.body,
      req.auth?.userId
    );

    return res.status(201).json({
      success: true,
      message: "Servis işlemi eklendi.",
      data: item,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Servis işlemi eklenemedi.",
    });
  }
}

// SERVİSE YEDEK PARÇA EKLEME

export async function servicePartCreate(
  req: Request,
  res: Response
) {
  const serviceId = req.params.id;

  if (
    typeof serviceId !== "string" ||
    !serviceId.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz servis kayıt numarası.",
    });
  }

  if (
    !req.body?.productId ||
    !req.body?.quantity
  ) {
    return res.status(400).json({
      success: false,
      message: "Ürün ve miktar zorunludur.",
    });
  }

  try {
    const item = await createServicePart(
      serviceId,
      {
        productId: Number(
          req.body.productId
        ),

        quantity: Number(
          req.body.quantity
        ),

        unitPrice:
          req.body.unitPrice === undefined
            ? undefined
            : Number(req.body.unitPrice),
      },
      req.auth?.userId
    );

    return res.status(201).json({
      success: true,
      message:
        "Yedek parça eklendi ve stoktan düşüldü.",
      data: item,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Yedek parça eklenemedi.",
    });
  }
}

// SERVİS MALİYET VE SONUÇ BİLGİLERİ

export async function serviceBillingUpdate(
  req: Request,
  res: Response
) {
  const serviceId = req.params.id;

  if (
    typeof serviceId !== "string" ||
    !serviceId.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz servis kayıt numarası.",
    });
  }

  try {
    const record = await changeServiceBilling(
      serviceId,
      req.body ?? {}
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Servis kaydı bulunamadı.",
      });
    }

    return ok(
      res,
      record,
      "Servis maliyet ve sonuç bilgileri güncellendi."
    );
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Servis bilgileri güncellenemedi.",
    });
  }
}