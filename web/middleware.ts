import { NextRequest, NextResponse } from 'next/server';

// Caminhos que não precisam de autenticação
const PUBLIC_PATHS = ['/', '/api/auth'];
const HIDDEN_FEATURE_PREFIXES = ['/emails'];
const ADMIN_PREFIX = '/admin';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payloadBase64] = token.split('.');
    if (!payloadBase64) return null;

    const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const payloadJson = atob(padded);

    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (HIDDEN_FEATURE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;
  // Verifica se existe um token (JWT)
  if (!token) {
    const loginUrl = new URL('/', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`)) {
    const payload = decodeJwtPayload(token);
    const role = String(payload?.role ?? payload?.perfil ?? '').toLowerCase();

    if (role !== 'admin') {
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|static|favicon.ico).*)'],
};
