import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "fb_session";
const SESSION_VALUE = "authenticated";

export function isAuthEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD?.trim());
}

export function isAuthenticated(req?: NextRequest): boolean {
  if (!isAuthEnabled()) return true;

  if (req) {
    const cookie = req.cookies.get(COOKIE_NAME)?.value;
    return cookie === SESSION_VALUE;
  }

  const cookieStore = cookies();
  return cookieStore.get(COOKIE_NAME)?.value === SESSION_VALUE;
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, error: "Não autorizado." },
    { status: 401 }
  );
}

export function validatePassword(password: string): boolean {
  const expected = process.env.APP_PASSWORD?.trim();
  if (!expected) return true;
  return password === expected;
}

export function createSessionCookie(): string {
  return `${COOKIE_NAME}=${SESSION_VALUE}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
