
import { recordAudit } from "../services/audit.service.js";
import type { Request, Response } from "express";
import * as svc from "../services/cors-subscription.service.js";
import { ok } from "../utils/http.js";

export async function packagesIndex(
  _req: Request,
  res: Response
) {
  return ok(res, await svc.getCorsPackages());
}

export async function subscriptionsIndex(
  req: Request,
  res: Response
) {
  return ok(
    res,
    await svc.getCorsSubscriptions({
      customerId: req.query.customerId
        ? Number(req.query.customerId)
        : undefined,

      status:
        typeof req.query.status === "string"
          ? req.query.status
          : undefined,

      expiringDays: req.query.expiringDays
        ? Number(req.query.expiringDays)
        : undefined,
    })
  );
}

export async function subscriptionShow(
  req: Request,
  res: Response
) {
  const subscriptionId = Number(req.params.id);

  if (!Number.isSafeInteger(subscriptionId) || subscriptionId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz abonelik numarası.",
    });
  }

  const data = await svc.getCorsSubscription(subscriptionId);

  if (!data) {
    return res.status(404).json({
      success: false,
      message: "Abonelik bulunamadı.",
    });
  }

  return ok(res, data);
}

export async function subscriptionCreate(
  req: Request,
  res: Response
) {
  if (
    !req.body?.customerId ||
    !req.body?.packageId ||
    !req.body?.username
  ) {
    return res.status(400).json({
      success: false,
      message: "Müşteri, paket ve kullanıcı adı zorunludur.",
    });
  }

  const data = await svc.addCorsSubscription(req.body);

  if (!data) {
    return res.status(500).json({
      success: false,
      message: "Abonelik oluşturuldu ancak kayıt bilgileri alınamadı.",
    });
  }

  await recordAudit({
    action: "CREATE",
    module: "CORS",
    entityType: "corsSubscription",
    entityId: data.id,
    entityLabel: data.subscriptionNo,
    newValues: data,
  });

  return res.status(201).json({
    success: true,
    data,
  });
}

export async function subscriptionRenew(
  req: Request,
  res: Response
) {
  const subscriptionId = Number(req.params.id);

  if (!Number.isSafeInteger(subscriptionId) || subscriptionId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz abonelik numarası.",
    });
  }

  const data = await svc.renewCorsSubscription(
    subscriptionId,
    req.body,
    req.auth?.userId
  );

  await recordAudit({
    action: "RENEW",
    module: "CORS",
    entityType: "corsSubscription",
    entityId: subscriptionId,
    newValues: data,
  });

  return ok(res, data);
}

export async function subscriptionPaymentUpdate(
  req: Request,
  res: Response
) {
  const subscriptionId = Number(req.params.id);

  if (
    !Number.isSafeInteger(subscriptionId) ||
    subscriptionId <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz abonelik numarası.",
    });
  }

  const paymentStatus = req.body?.paymentStatus;

  if (
    typeof paymentStatus !== "string" ||
    !["PENDING", "PAID", "PARTIAL", "OVERDUE"].includes(
      paymentStatus
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz ödeme durumu.",
    });
  }

  const before = await svc.getCorsSubscription(subscriptionId);

  if (!before) {
    return res.status(404).json({
      success: false,
      message: "Abonelik bulunamadı.",
    });
  }

  const data = await svc.setCorsSubscriptionPayment(
    subscriptionId,
    paymentStatus
  );

  await recordAudit({
    action: "PAYMENT_UPDATE",
    module: "CORS",
    entityType: "corsSubscription",
    entityId: subscriptionId,
    oldValues: {
      paymentStatus: before.paymentStatus,
    },
    newValues: {
      paymentStatus: data?.paymentStatus,
    },
  });

  return ok(res, data, "Ödeme durumu güncellendi.");
}

export async function subscriptionSummary(
  _req: Request,
  res: Response
) {
  const data = await svc.getCorsSubscriptionSummary();

  return ok(res, data);
}