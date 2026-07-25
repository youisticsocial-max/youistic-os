import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const role = request.cookies.get("user_role")?.value;
  const path = request.nextUrl.pathname;

  // Protect /dashboard routes
  if (path.startsWith("/dashboard")) {
    if (!role) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Role-based restrictions
    if (role === "SDR") {
      // SDRs can access /dashboard/sdr, /dashboard/support, /dashboard/crm/tickets, and /dashboard/settings
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
      // BDEs can access /dashboard/bde, /dashboard/support, /dashboard/crm/tickets, and /dashboard/settings
      if (
        !path.startsWith("/dashboard/bde") &&
        !path.startsWith("/dashboard/support") &&
        !path.startsWith("/dashboard/crm/tickets") &&
        !path.startsWith("/dashboard/settings")
      ) {
        return NextResponse.redirect(new URL("/dashboard/bde", request.url));
      }
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
  if (path === "/login" && role) {
    if (role === "SDR") return NextResponse.redirect(new URL("/dashboard/sdr", request.url));
    if (role === "BDE") return NextResponse.redirect(new URL("/dashboard/bde", request.url));
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|mp4|webm)$).*)",
  ],
};
