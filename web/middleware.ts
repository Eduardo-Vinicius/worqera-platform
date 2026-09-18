import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/signup', '/api/auth'];
const ADMIN_PREFIX = '/admin';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payloadBase64] = token.split('.');
    if (!payloadBase64) return null;

    const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function platformAdminEmails() {
  return String(
    process.env.NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS ||
      process.env.PLATFORM_ADMIN_EMAILS ||
      ''
  )
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function homeForRole(role: string) {
  return role === 'sector' ? '/kanban' : '/dashboard';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/p/') ||
    pathname.startsWith('/invite/') ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password'
  ) {
    if (token && (pathname === '/' || pathname === '/login' || pathname === '/signup')) {
      const payload = decodeJwtPayload(token);
      const role = String(payload?.role ?? payload?.perfil ?? '').toLowerCase();
      return NextResponse.redirect(new URL(homeForRole(role), request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = decodeJwtPayload(token);
  const role = String(payload?.role ?? payload?.perfil ?? '').toLowerCase();
  const email = String(payload?.email ?? '').toLowerCase();

  if (pathname.startsWith('/admin/shops')) {
    const allowed = platformAdminEmails();
    if (!allowed.length || !allowed.includes(email)) {
      return NextResponse.redirect(new URL('/forbidden', request.url));
    }
    return NextResponse.next();
  }

  if (
    pathname.startsWith('/admin/financeiro') ||
    pathname.startsWith('/admin/metrics')
  ) {
    if (role !== 'owner') {
      return NextResponse.redirect(new URL('/forbidden', request.url));
    }
  } else if (pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`)) {
    if (role !== 'admin' && role !== 'owner') {
      return NextResponse.redirect(new URL('/forbidden', request.url));
    }
  }

  if (role === 'sector') {
    const blocked =
      pathname.startsWith('/settings') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/funcionarios') ||
      pathname.startsWith('/billing') ||
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/clientes') ||
      pathname === '/pedidos' ||
      pathname.startsWith('/pedidos/novo');
    if (blocked) {
      return NextResponse.redirect(new URL('/kanban', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|static|favicon.ico).*)'],
};
