import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAuthEnabled, isAuthenticated } from "@/lib/auth";

export function middleware(req: NextRequest) {
  if (!isAuthEnabled()) return NextResponse.next();

  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health")
  ) {
    return NextResponse.next();
  }

  if (!isAuthenticated(req)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
