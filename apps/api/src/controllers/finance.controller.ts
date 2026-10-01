
import { recordAudit } from "../services/audit.service.js";
import type { Request, Response } from "express";
import * as s from "../services/finance.service.js";
import { ok } from "../utils/http.js";

export async function financeSummary(
  _req: Request,
  res: Response
) {
  return ok(res, await s.getSummary());
}

export async function financeDocuments(
  req: Request,
  res: Response
) {
  return ok(
    res,
    await s.listDocuments(
      typeof req.query.direction === "string"
        ? req.query.direction
        : undefined,
      typeof req.query.partyType === "string"
        ? req.query.partyType
        : undefined,
      typeof req.query.status === "string"
        ? req.query.status
        : undefined
    )
  );
}

export async function financeAccounts(
  _req: Request,
  res: Response
) {
  return ok(res, await s.listAccounts());
}

export async function financeAccountCreate(
  req: Request,
  res: Response
) {
  if (!req.body?.name?.trim()) {
    return res.status(400).json({
      success: false,
      message: "Hesap adı zorunludur.",
    });
  }

  const data = await s.addAccount(req.body);

  await recordAudit({
    action: "CREATE",
    module: "FINANCE",
    entityType: "financeAccount",
    entityId: data?.id,
    entityLabel: data?.name,
    newValues: data,
  });

  return res.status(201).json({
    success: true,
    data,
    message: "Finans hesabı oluşturuldu.",
  });
}

export async function financeTransactions(
  _req: Request,
  res: Response
) {
  return ok(res, await s.listTransactions());
}

export async function financeSettle(
  req: Request,
  res: Response
) {
  try {
    const documentId = Number(req.params.id);

    if (
      !Number.isSafeInteger(documentId) ||
      documentId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Geçersiz finans belgesi numarası.",
      });
    }

    const data = await s.settle(
      documentId,
      req.body,
      { id: req.auth?.userId }
    );

    await recordAudit({
      action: "SETTLE",
      module: "FINANCE",
      entityType: "financeDocument",
      entityId: documentId,
      newValues: data,
    });

    return res.status(201).json({
      success: true,
      data,
      message: "Finans hareketi kaydedildi.",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Finans hareketi kaydedilemedi.",
    });
  }
}

export async function financeCustomerLedger(
  req: Request,
  res: Response
) {
  return ok(
    res,
    await s.customerLedger(Number(req.params.id))
  );
}

export async function financeSupplierLedger(
  req: Request,
  res: Response
) {
  return ok(
    res,
    await s.supplierLedger(Number(req.params.id))
  );
}

export async function financeSync(
  _req: Request,
  res: Response
) {
  await s.sync();

  return ok(
    res,
    { synced: true },
    "Kaynak kayıtlar finans defterine eşitlendi."
  );
}

export async function financeCustomerRisk(
  req: Request,
  res: Response
) {
  const result = await s.getCustomerRisk(
    Number(req.params.id),
    Number(req.query.proposedAmount || 0)
  );

  return result
    ? ok(res, result)
    : res.status(404).json({
        success: false,
        message: "Müşteri bulunamadı.",
      });
}

export async function financeReceivableAging(
  _req: Request,
  res: Response
) {
  return ok(res, await s.getReceivableAging());
}

export async function financeRiskNotifications(
  _req: Request,
  res: Response
) {
  await s.syncRiskNotifications();

  return ok(
    res,
    { synced: true },
    "Risk bildirimleri güncellendi."
  );
}