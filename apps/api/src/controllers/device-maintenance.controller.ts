
import { recordAudit } from "../services/audit.service.js";
import type { Request, Response } from "express";
import * as svc from "../services/device-maintenance.service.js";
import { ok } from "../utils/http.js";

const num = (x: unknown) =>
  x == null || x === "" ? undefined : Number(x);

export async function maintenanceSummary(
  _req: Request,
  res: Response
) {
  await svc.syncDeviceMaintenanceNotifications();
  return ok(res, await svc.getMaintenanceSummary());
}

export async function maintenanceDue(
  req: Request,
  res: Response
) {
  return ok(
    res,
    await svc.getDueDevices(
      typeof req.query.kind === "string"
        ? req.query.kind
        : undefined,
      num(req.query.days) ?? 30
    )
  );
}

export async function maintenanceIndex(
  req: Request,
  res: Response
) {
  return ok(
    res,
    await svc.getMaintenance(
      num(req.query.deviceId),
      typeof req.query.status === "string"
        ? req.query.status
        : undefined
    )
  );
}

export async function maintenanceShow(
  req: Request,
  res: Response
) {
  const maintenanceId = Number(req.params.id);

  if (!Number.isSafeInteger(maintenanceId) || maintenanceId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz bakım kaydı numarası.",
    });
  }

  const data = await svc.getMaintenanceRecord(maintenanceId);

  if (!data) {
    return res.status(404).json({
      success: false,
      message: "Bakım kaydı bulunamadı.",
    });
  }

  return ok(res, data);
}

export async function maintenanceCreate(
  req: Request,
  res: Response
) {
  if (!req.body?.deviceId) {
    return res.status(400).json({
      success: false,
      message: "Cihaz zorunludur.",
    });
  }

  const data = await svc.addMaintenance(
    req.body,
    req.auth?.userId
  );

  await recordAudit({
    action: "CREATE",
    module: "MAINTENANCE",
    entityType: "maintenance",
    entityId: data?.id,
    newValues: data,
  });

  return res.status(201).json({
    success: true,
    data,
    message: "Bakım kaydı oluşturuldu.",
  });
}

export async function maintenanceStatus(
  req: Request,
  res: Response
) {
  const maintenanceId = Number(req.params.id);

  if (!Number.isSafeInteger(maintenanceId) || maintenanceId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz bakım kaydı numarası.",
    });
  }

  const data = await svc.setMaintenanceStatus(
    maintenanceId,
    req.body,
    req.auth?.userId
  );

  await recordAudit({
    action: "STATUS_CHANGE",
    module: "MAINTENANCE",
    entityType: "maintenance",
    entityId: maintenanceId,
    newValues: data,
  });

  return ok(res, data);
}

export async function calibrationsIndex(
  req: Request,
  res: Response
) {
  return ok(
    res,
    await svc.getCalibrations(num(req.query.deviceId))
  );
}

export async function calibrationCreate(
  req: Request,
  res: Response
) {
  if (!req.body?.deviceId) {
    return res.status(400).json({
      success: false,
      message: "Cihaz zorunludur.",
    });
  }

  return res.status(201).json({
    success: true,
    data: await svc.addCalibration(
      req.body,
      req.auth?.userId
    ),
    message: "Kalibrasyon kaydı oluşturuldu.",
  });
}

export async function calibrationComplete(
  req: Request,
  res: Response
) {
  return ok(
    res,
    await svc.finishCalibration(
      Number(req.params.id),
      req.body
    )
  );
}

export async function certificatesIndex(
  req: Request,
  res: Response
) {
  return ok(
    res,
    await svc.getCertificates(num(req.query.deviceId))
  );
}

export async function certificateCreate(
  req: Request,
  res: Response
) {
  if (
    !req.body?.deviceId ||
    !req.body?.certificateNo?.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Cihaz ve sertifika numarası zorunludur.",
    });
  }

  return res.status(201).json({
    success: true,
    data: await svc.addCertificate(
      req.body,
      req.auth?.userId
    ),
    message: "Sertifika eklendi.",
  });
}

export async function deviceMaintenanceShow(
  req: Request,
  res: Response
) {
  const data = await svc.getDeviceMaintenance(
    Number(req.params.id)
  );

  if (!data) {
    return res.status(404).json({
      success: false,
      message: "Cihaz bulunamadı.",
    });
  }

  return ok(res, data);
}

export async function maintenanceNotificationSync(
  _req: Request,
  res: Response
) {
  await svc.syncDeviceMaintenanceNotifications();

  return ok(res, {
    synced: true,
  });
}

export async function deviceMaintenanceSchedule(
  req: Request,
  res: Response
) {
  const data = await svc.setDeviceMaintenanceSchedule(
    Number(req.params.id),
    req.body
  );

  if (!data) {
    return res.status(404).json({
      success: false,
      message: "Cihaz bulunamadı.",
    });
  }

  return ok(res, data);
}