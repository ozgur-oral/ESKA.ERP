import { createHmac, timingSafeEqual } from "node:crypto";
import type { RoleCode } from "./permissions.js";

export type SessionTokenPayload = {
  sub: number;
  role: RoleCode;
  iat: number;
  exp: number;
};

const encode = (value: string) => Buffer.from(value).toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

function secret() {
  return process.env.AUTH_SECRET ?? "eska-erp-development-secret-change-me";
}

function signPart(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createSessionToken(userId: number, role: RoleCode, ttlSeconds = 60 * 60 * 8) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionTokenPayload = { sub: userId, role, iat: now, exp: now + ttlSeconds };
  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${signPart(encodedPayload)}`;
}

export function verifySessionToken(token: string): SessionTokenPayload | null {
  const [payloadPart, signature] = token.split(".");
  if (!payloadPart || !signature) return null;
  const expected = signPart(payloadPart);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(decode(payloadPart)) as SessionTokenPayload;
    if (!payload.sub || !payload.role || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
