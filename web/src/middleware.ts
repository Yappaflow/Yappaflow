import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const AUTH_COOKIE_NAME = "yf_auth";

// Paths that require authentication, written as "/dashboard" (locale-free).
// Anything matching `/(en|tr)/dashboard(/...)?` gets gated.
const PROTECTED_PREFIXES = ["/dashboard"];

function isProtectedPath(pathname: string): boolean {
  // Strip the locale segment if present so matching is simple.
  const segments = pathname.split("/").filter(Boolean);
  const rest = routing.locales.includes(segments[0] as "en" | "tr")
    ? "/" + segments.slice(1).join("/")
    : pathname;
  return PROTECTED_PREFIXES.some(
    (p) => rest === p || rest.startsWith(p + "/")
  );
}

function localeFor(pathname: string): string {
  const first = pathname.split("/").filter(Boolean)[0];
  return routing.locales.includes(first as "en" | "tr")
    ? first
    : routing.defaultLocale;
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isProtectedPath(pathname) && !req.cookies.get(AUTH_COOKIE_NAME)) {
    const locale = localeFor(pathname);
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/auth`;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/", "/(tr|en)/:path*", "/(privacy|terms)"],
};
