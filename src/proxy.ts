import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Proxy de Seguridad (Next.js 16) - Protección de Rutas Privadas y Cabeceras OWASP
 * Garantiza que solo usuarios autenticados accedan al Muro de Publicaciones (/dashboard)
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionCookie = request.cookies.get('inacadt_session')?.value;
  const hasSupabaseCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));

  const isAuthenticated = Boolean(sessionCookie) || hasSupabaseCookie;

  // Proteger la ruta privada /dashboard (Muro de Publicaciones)
  if (pathname.startsWith('/dashboard') && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si ya está autenticado y visita /login, redirigir al muro (/dashboard)
  if (pathname === '/login' && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const response = NextResponse.next();

  // Cabeceras de Seguridad OWASP
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};

