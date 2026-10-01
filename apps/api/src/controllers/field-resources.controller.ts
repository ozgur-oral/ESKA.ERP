
import type { Request, Response } from "express";
import * as s from "../services/field-resources.service.js";
import { ok } from "../utils/http.js";
import { recordAudit } from "../services/audit.service.js";

export async function resourceIndex(
  q: Request,
  r: Response
) {
  return ok(
    r,
    await s.resources(
      typeof q.query.type === "string"
        ? q.query.type
        : undefined
    )
  );
}

export async function resourceAvailable(
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
    await s.availableResources(
      String(q.query.startAt),
      String(q.query.endAt)
    )
  );
}

export async function resourceSummary(
  _q: Request,
  r: Response
) {
  return ok(r, await s.resourceSummary());
}

export async function resourceCreate(
  q: Request,
  r: Response
) {
  if (
    !q.body?.code ||
    !q.body?.name ||
    !q.body?.type
  ) {
    return r.status(400).json({
      success: false,
      message: "Kod, ad ve kaynak türü zorunludur.",
    });
  }

  const x = await s.createResource(q.body);

  await recordAudit({
    action: "CREATE",
    module: "FIELD_RESOURCE",
    entityType: "fieldResource",
    entityId: x.id,
    entityLabel: x.name,
    newValues: x,
  });

  return r.status(201).json({
    success: true,
    data: x,
  });
}

export async function resourceStatus(
  q: Request,
  r: Response
) {
  const resourceId = Number(q.params.id);

  if (
    !Number.isSafeInteger(resourceId) ||
    resourceId <= 0
  ) {
    return r.status(400).json({
      success: false,
      message: "Geçersiz kaynak numarası.",
    });
  }

  const x = await s.setResourceStatus(
    resourceId,
    String(q.body?.status)
  );

  await recordAudit({
    action: "STATUS_CHANGE",
    module: "FIELD_RESOURCE",
    entityType: "fieldResource",
    entityId: resourceId,
    newValues: x,
  });

  return ok(r, x);
}