import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/signup', '/api/auth'];
const ADMIN_PREFIX = '/admin';
const TRADE_SLUGS = new Set([
  'sapataria',
  'lavanderia',
  'assistencia',
  'automotivo',
  'atelier',
  'grafica',
  'marcenaria',
  'otica',
  'pet',
]);

function isTradePath(pathname: string) {
  const slug = pathname.replace(/^\//, '');
  return TRADE_SLUGS.has(slug);
}

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

function homeForRole(role: string, platformAdmin = false) {
  if (platformAdmin) return '/admin/shops';
  return role === 'sector' ? '/kanban' : '/dashboard';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  if (
    PUBLIC_PATHS.includes(pathname) ||
    isTradePath(pathname) ||
    pathname.startsWith('/p/') ||
    pathname.startsWith('/invite/') ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname.startsWith('/verify-email')
  ) {
    if (token && (pathname === '/' || pathname === '/login' || pathname === '/signup')) {
      const payload = decodeJwtPayload(token);
      const role = String(payload?.role ?? payload?.perfil ?? '').toLowerCase();
      const platformAdmin = Boolean(payload?.platformAdmin);
      return NextResponse.redirect(new URL(homeForRole(role, platformAdmin), request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = decodeJwtPayload(token);
  const role = String(payload?.role ?? payload?.perfil ?? '').toLowerCase();
  const email = String(payload?.email ?? '').toLowerCase();
  const platformAdmin =
    Boolean(payload?.platformAdmin) || platformAdminEmails().includes(email);
  const shopCookie = request.cookies.get('wq_shop')?.value || '';
  const visitingShop = /^[a-f0-9]{24}$/i.test(shopCookie);

  // Console only when no shop is open. A visit cookie keeps dashboard, kanban and products.
  if (
    platformAdmin &&
    !payload?.shopId &&
    !visitingShop &&
    (pathname === '/dashboard' || pathname === '/')
  ) {
    return NextResponse.redirect(new URL('/admin/shops', request.url));
  }

  if (pathname.startsWith('/admin/shops') || pathname.startsWith('/admin/plataforma')) {
    const allowed = platformAdminEmails();
    const ok =
      Boolean(payload?.platformAdmin) ||
      (allowed.length > 0 && allowed.includes(email));
    if (!ok) {
      return NextResponse.redirect(new URL('/forbidden', request.url));
    }
    return NextResponse.next();
  }

  // Pure platform admin: console, or the shop they chose to open.
  if (platformAdmin && role === 'platform') {
    const inShop = visitingShop;
    const consolePath =
      pathname.startsWith('/admin/shops') ||
      pathname.startsWith('/admin/plataforma') ||
      pathname.startsWith('/admin/produtos') ||
      pathname.startsWith('/forbidden') ||
      pathname.startsWith('/login');
    if (!consolePath && !inShop) {
      return NextResponse.redirect(new URL('/admin/shops', request.url));
    }
    return NextResponse.next();
  }

  if (
    pathname.startsWith('/admin/financeiro') ||
    pathname.startsWith('/admin/metrics') ||
    pathname.startsWith('/tv-financeiro')
  ) {
    if (role !== 'owner' && role !== 'admin' && !(platformAdmin && visitingShop)) {
      return NextResponse.redirect(new URL('/forbidden', request.url));
    }
  } else if (pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`)) {
    if (role !== 'admin' && role !== 'owner' && !platformAdmin) {
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
      pathname.startsWith('/pedidos/');
    if (blocked) {
      return NextResponse.redirect(new URL('/kanban', request.url));
    }
  }

  // atendimento: configuração da loja sim; gestão (plano, financeiro, métricas) não
  if (role === 'atendimento') {
    const blocked =
      pathname.startsWith('/admin') ||
      pathname.startsWith('/billing') ||
      pathname.startsWith('/tv-financeiro') ||
      pathname.startsWith('/onboarding');
    if (blocked) {
      return NextResponse.redirect(new URL('/forbidden', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|static|favicon.ico).*)'],
};
