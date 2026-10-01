
import type { Request, Response } from "express";

import * as db from "../repositories/rbac.repository.js";

import { recordAudit } from "../services/audit.service.js";

// ROL LİSTESİ

export async function roleIndex(
  _q: Request,
  r: Response
) {
  return r.json({
    success: true,
    data: await db.roles(),
  });
}

// YETKİ LİSTESİ

export async function permissionIndex(
  _q: Request,
  r: Response
) {
  return r.json({
    success: true,
    data: await db.permissions(),
  });
}

// YENİ ROL OLUŞTURMA

export async function roleCreate(
  q: Request,
  r: Response
) {
  try {
    const data = await db.createRole(q.body || {});

    await recordAudit({
      action: "CREATE",
      module: "RBAC",
      entityType: "role",
      entityId: data.code,
      entityLabel: data.name,
      newValues: q.body,
    });

    return r.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    return r.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Rol oluşturulamadı.",
    });
  }
}

// ROL YETKİLERİNİ GÜNCELLEME

export async function rolePermissions(
  q: Request,
  r: Response
) {
  const roleCode = q.params.code;

  if (
    typeof roleCode !== "string" ||
    !roleCode.trim()
  ) {
    return r.status(400).json({
      success: false,
      message: "Geçersiz rol kodu.",
    });
  }

  try {
    const items = Array.isArray(q.body?.permissions)
      ? q.body.permissions
      : [];

    await db.setRolePermissions(
      roleCode,
      items
    );

    await recordAudit({
      action: "PERMISSIONS_UPDATE",
      module: "RBAC",
      entityType: "role",
      entityId: roleCode,
      newValues: {
        permissions: items,
      },
    });

    return r.json({
      success: true,
      message: "Rol yetkileri güncellendi.",
    });
  } catch (error) {
    return r.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Yetkiler güncellenemedi.",
    });
  }
}

// ROL DURUMUNU GÜNCELLEME

export async function roleStatus(
  q: Request,
  r: Response
) {
  const roleCode = q.params.code;

  if (
    typeof roleCode !== "string" ||
    !roleCode.trim()
  ) {
    return r.status(400).json({
      success: false,
      message: "Geçersiz rol kodu.",
    });
  }

  try {
    const data = await db.setRoleStatus(
      roleCode,
      Boolean(q.body?.isActive)
    );

    await recordAudit({
      action: "STATUS_CHANGE",
      module: "RBAC",
      entityType: "role",
      entityId: roleCode,
      newValues: data,
    });

    return r.json({
      success: true,
      data,
    });
  } catch (error) {
    return r.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Rol güncellenemedi.",
    });
  }
}