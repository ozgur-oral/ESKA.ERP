
import type { Request, Response } from "express";

import {
  changePassword,
  createUser,
  listPublicUsers,
  updateUser,
} from "../auth/service.js";

import { roles } from "../repositories/rbac.repository.js";

import { recordAudit } from "../services/audit.service.js";

// KULLANICI LİSTESİ

export async function usersIndex(
  _q: Request,
  r: Response
) {
  return r.json({
    success: true,
    data: await listPublicUsers(),
  });
}

// ROL LİSTESİ

export async function rolesIndex(
  _q: Request,
  r: Response
) {
  return r.json({
    success: true,
    data: await roles(),
  });
}

// YENİ KULLANICI OLUŞTURMA

export async function userCreate(
  q: Request,
  r: Response
) {
  try {
    const requiredFields = [
      "username",
      "email",
      "firstName",
      "lastName",
      "role",
      "password",
    ];

    for (const field of requiredFields) {
      if (!q.body?.[field]) {
        return r.status(400).json({
          success: false,
          message: `${field} zorunludur.`,
        });
      }
    }

    const data = await createUser(q.body);

    await recordAudit({
      action: "CREATE",
      module: "USER",
      entityType: "user",
      entityId: data.id,
      entityLabel: data.username,
      newValues: {
        ...data,
        password: undefined,
      },
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
          : "Kullanıcı oluşturulamadı.",
    });
  }
}

// KULLANICI BİLGİLERİNİ GÜNCELLEME

export async function userUpdate(
  q: Request,
  r: Response
) {
  const userId = Number(q.params.id);

  if (
    !Number.isSafeInteger(userId) ||
    userId <= 0
  ) {
    return r.status(400).json({
      success: false,
      message: "Geçersiz kullanıcı numarası.",
    });
  }

  try {
    const data = await updateUser(
      userId,
      q.body || {}
    );

    await recordAudit({
      action: "UPDATE",
      module: "USER",
      entityType: "user",
      entityId: data.id,
      entityLabel: data.username,
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
          : "Kullanıcı güncellenemedi.",
    });
  }
}

// KULLANICI ŞİFRESİNİ DEĞİŞTİRME

export async function userPassword(
  q: Request,
  r: Response
) {
  const userId = Number(q.params.id);

  if (
    !Number.isSafeInteger(userId) ||
    userId <= 0
  ) {
    return r.status(400).json({
      success: false,
      message: "Geçersiz kullanıcı numarası.",
    });
  }

  if (
    typeof q.body?.password !== "string" ||
    !q.body.password.trim()
  ) {
    return r.status(400).json({
      success: false,
      message: "Yeni şifre zorunludur.",
    });
  }

  try {
    await changePassword(
      userId,
      q.body.password
    );

    await recordAudit({
      action: "PASSWORD_CHANGE",
      module: "USER",
      entityType: "user",
      entityId: userId,
    });

    return r.json({
      success: true,
      message: "Şifre güncellendi.",
    });
  } catch (error) {
    return r.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Şifre değiştirilemedi.",
    });
  }
}