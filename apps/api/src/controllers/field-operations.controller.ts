
import type { Request, Response } from "express";
import * as s from "../services/field-operations.service.js";
import { ok } from "../utils/http.js";
import { recordAudit } from "../services/audit.service.js";

export async function fieldIndex(
  q: Request,
  r: Response
) {
  const from = String(
    q.query.from || new Date().toISOString()
  );

  const to = String(
    q.query.to ||
      new Date(Date.now() + 30 * 864e5).toISOString()
  );

  return ok(r, await s.operations(from, to));
}

export async function fieldSummary(
  _q: Request,
  r: Response
) {
  return ok(r, await s.summary());
}

export async function fieldAvailable(
  q: Request,
  r: Response
) {
  if (!q.query.startAt || !q.query.endAt) {
    return r.status(400).json({
      success: false,
      message: "Tarih aralığı zorunludur.",
    });
  }

  return ok(
    r,
    await s.availableEmployees(
      String(q.query.startAt),
      String(q.query.endAt)
    )
  );
}

export async function fieldCreate(
  q: Request,
  r: Response
) {
  if (
    !q.body?.title ||
    !q.body?.type ||
    !q.body?.startAt ||
    !q.body?.endAt
  ) {
    return r.status(400).json({
      success: false,
      message: "Tür, başlık ve tarih aralığı zorunludur.",
    });
  }

  try {
    const x = await s.createOperation(
      q.body,
      q.auth?.userId
    );

    await recordAudit({
      action: "CREATE",
      module: "FIELD",
      entityType: "fieldOperation",
      entityId: x.id,
      entityLabel: x.operationNo,
      newValues: x,
    });

    return r.status(201).json({
      success: true,
      data: x,
    });
  } catch (e) {
    return r.status(400).json({
      success: false,
      message:
        e instanceof Error
          ? e.message
          : "Saha operasyonu oluşturulamadı.",
    });
  }
}

export async function fieldStatus(
  q: Request,
  r: Response
) {
  const operationId = Number(q.params.id);

  if (
    !Number.isSafeInteger(operationId) ||
    operationId <= 0
  ) {
    return r.status(400).json({
      success: false,
      message: "Geçersiz saha operasyonu numarası.",
    });
  }

  const x = await s.setOperationStatus(
    operationId,
    String(q.body?.status)
  );

  await recordAudit({
    action: "STATUS_CHANGE",
    module: "FIELD",
    entityType: "fieldOperation",
    entityId: operationId,
    newValues: x,
  });

  return ok(r, x);
}