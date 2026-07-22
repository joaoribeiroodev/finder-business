import { NextRequest, NextResponse } from "next/server";
import {
  validatePassword,
  createSessionCookie,
  clearSessionCookie,
  isAuthEnabled,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!isAuthEnabled()) {
    return NextResponse.json({ success: true, message: "Auth desabilitada." });
  }

  try {
    const { password } = await req.json();
    if (!validatePassword(password)) {
      return NextResponse.json({ success: false, error: "Senha incorreta." }, { status: 401 });
    }

    const res = NextResponse.json({ success: true });
    res.headers.set("Set-Cookie", createSessionCookie());
    return res;
  } catch {
    return NextResponse.json({ success: false, error: "Erro no login." }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.headers.set("Set-Cookie", clearSessionCookie());
  return res;
}
