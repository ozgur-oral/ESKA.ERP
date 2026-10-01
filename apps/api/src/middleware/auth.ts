import type { NextFunction, Request, Response } from "express";
import { PERMISSIONS, type Permission } from "../auth/permissions.js";
import { verifySessionToken } from "../auth/token.js";
import { findPublicUserById } from "../auth/service.js";
import { auditContext } from "../audit/context.js";

const permissionValues = new Set<string>(Object.values(PERMISSIONS));

function isPermission(value: string): value is Permission {
  return permissionValues.has(value);
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.header("authorization");

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Oturum açmanız gerekiyor.",
    });
    return;
  }

  const payload = verifySessionToken(header.slice(7));

  if (!payload) {
    res.status(401).json({
      success: false,
      message: "Oturum geçersiz veya süresi dolmuş.",
    });
    return;
  }

  const user = await findPublicUserById(payload.sub);

  if (!user) {
    res.status(401).json({
      success: false,
      message: "Oturum geçersiz veya süresi dolmuş.",
    });
    return;
  }

  const permissions = user.permissions.filter(isPermission);

  req.auth = {
    userId: user.id,
    role: user.role,
    permissions,
  };

  const ctx = auditContext.getStore();

  if (ctx) {
    ctx.userId = user.id;
    ctx.userRole = user.role;
  }

  next();
}

export function requirePermission(...required: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      res.status(401).json({
        success: false,
        message: "Oturum açmanız gerekiyor.",
      });
      return;
    }

    if (
      !required.every((permission) =>
        req.auth!.permissions.includes(permission)
      )
    ) {
      res.status(403).json({
        success: false,
        message: "Bu işlem için yetkiniz bulunmuyor.",
      });
      return;
    }

    next();
  };
}