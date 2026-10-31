import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  console.log(`Request URL: ${request.url}, Pathname: ${request.nextUrl.pathname}`);
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });
  console.log("Middleware token details:", {
    path: request.nextUrl.pathname,
    hasToken: !!token,
    tokenContent: token ? 'Token exists' : 'No token',
    cookies: request.cookies.getAll(),
  })
  console.log("------------------------------");

  const { pathname } = request.nextUrl;

  // If user is logged in and tries to access login or home page, redirect to dashboard
  if (token && (pathname === "/" || pathname === "/login")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If user is not logged in and tries to access dashboard, redirect to login
  if (!token && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/", // Match home page
    "/login", // Match login page
    "/dashboard/:path*" // Match dashboard and all its subpages
  ]
};
