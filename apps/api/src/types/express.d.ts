import type { Permission, RoleCode } from "../auth/permissions.js";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: number;
        role: RoleCode;
        permissions: Permission[];
      };
    }
  }
}

export {};
