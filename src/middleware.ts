import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth";

export const runtime = "nodejs";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const sessionToken = request.cookies.get("youistic_session")?.value;
  const session = sessionToken ? verifySessionToken(sessionToken) : null;
  const role = session?.role;

  // Protect /dashboard and /ceo routes
  if (path.startsWith("/dashboard") || path.startsWith("/ceo")) {
    if (!session || !role) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Role-based route restrictions
    if (role === "SDR") {
      if (
        !path.startsWith("/dashboard/sdr") &&
        !path.startsWith("/dashboard/support") &&
        !path.startsWith("/dashboard/crm/tickets") &&
        !path.startsWith("/dashboard/settings")
      ) {
        return NextResponse.redirect(new URL("/dashboard/sdr", request.url));
      }
    }

    if (role === "BDE") {
      if (
        !path.startsWith("/dashboard/bde") &&
        !path.startsWith("/dashboard/support") &&
        !path.startsWith("/dashboard/crm/tickets") &&
        !path.startsWith("/dashboard/projects") &&
        !path.startsWith("/dashboard/crm") &&
        !path.startsWith("/dashboard/settings")
      ) {
        return NextResponse.redirect(new URL("/dashboard/bde", request.url));
      }
    }

    if (path.startsWith("/ceo") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  }

  // Serve landing page at root '/'
  if (path === "/") {
    return NextResponse.rewrite(new URL("/index.html", request.url));
  }

  // Support clean URLs for landing page subpages
  const staticPages = [
    "contact",
    "start",
    "solutions",
    "growth",
    "development",
    "builder",
    "admin",
  ];
  const cleanPath = path.replace(/^\//, "");
  if (staticPages.includes(cleanPath)) {
    return NextResponse.rewrite(new URL(`/${cleanPath}.html`, request.url));
  }

  // Redirect authenticated users away from /login if already logged in
  if (path === "/login" && session && role) {
    if (role === "SDR") return NextResponse.redirect(new URL("/dashboard/sdr", request.url));
    if (role === "BDE") return NextResponse.redirect(new URL("/dashboard/bde", request.url));
    return NextResponse.redirect(new URL("/ceo/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|mp4|webm)$).*)",
  ],
};
