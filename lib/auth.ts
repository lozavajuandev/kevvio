import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { NextRequest, NextResponse } from "next/server";
import { db } from "./db";
import { AppError } from "./domain";
const derive = promisify(scrypt);
export async function hashPassword(password: string) {
  const salt = randomBytes(24).toString("hex");
  const key = (await derive(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, hex] = stored.split(":");
  const key = (await derive(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hex, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}
export function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
export async function userFor(req: NextRequest) {
  const token = req.cookies.get("raiz_session")?.value;
  if (!token) return null;
  const { rows } = await db.query(
    "SELECT u.id,u.name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()",
    [digest(token)],
  );
  return rows[0] ?? null;
}
export async function issueSession(
  user: { id: string; name: string },
  req: NextRequest,
) {
  const token = randomBytes(32).toString("hex");
  await db.query(
    "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",
    [digest(token), user.id],
  );
  const res = NextResponse.json({ user });
  res.cookies.set("raiz_session", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: req.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 604800,
  });
  return res;
}
export function checkOrigin(req: NextRequest) {
  if (["GET", "HEAD"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || new URL(origin).host !== host)
    throw new AppError(403, "Solicitud no autorizada. Recarga la aplicación.");
}
const failures = new Map<string, { count: number; until: number }>();
export function checkLoginRate(key: string) {
  const v = failures.get(key);
  if (v && v.until > Date.now() && v.count >= 10)
    throw new AppError(
      429,
      "Demasiados intentos. Intenta nuevamente en 15 minutos.",
    );
}
export function failedLogin(key: string) {
  const v = failures.get(key);
  failures.set(key, {
    count: v && v.until > Date.now() ? v.count + 1 : 1,
    until: Date.now() + 900000,
  });
}
export function clearLoginRate(key: string) {
  failures.delete(key);
}
