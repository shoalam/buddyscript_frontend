import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const jwt = request.cookies.get('jwt')?.value;

  // Protected routes: any route that isn't login or registration (or static assets)
  const isAuthRoute = pathname === '/login' || pathname === '/registration';
  const isPublicFile = pathname.startsWith('/_next') || 
                       pathname.startsWith('/images') || 
                       pathname.startsWith('/favicon.ico');

  if (isPublicFile) {
    return NextResponse.next();
  }

  // Redirect to login if NOT logged in and trying to access private route
  if (!jwt && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect to / (feed) if ALREADY logged in and trying to access login/registration
  if (jwt && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
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
