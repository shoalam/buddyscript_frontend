import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;

  // Static assets and internal next paths are always allowed
  const isPublicFile = pathname.startsWith('/_next') || 
                       pathname.startsWith('/images') || 
                       pathname.startsWith('/favicon.ico');

  if (isPublicFile) {
    return NextResponse.next();
  }

  // Auth routes are only for guests
  const isAuthRoute = pathname === '/login' || pathname === '/registration';

  // 1. If NOT logged in (at all) and not on an auth route, redirect to login
  if (!token && !refreshToken && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. If ALREADY logged in and on an auth route, redirect to /feed
  if ((token || refreshToken) && isAuthRoute) {
    return NextResponse.redirect(new URL('/feed', request.url));
  }


  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (local images)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images).*)',
  ],
};

