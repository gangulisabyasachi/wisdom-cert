import { NextResponse } from 'next/server';
import { decrypt } from './lib/session';

// 1. Specify protected and public routes
const protectedRoutes = ['/', '/generate', '/edit'];
const publicRoutes = ['/login', '/verify'];

export default async function middleware(req) {
  // 2. Check if the current route is protected or public
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some(route => 
    path === route || path.startsWith('/edit/') || (path === '/' && route === '/')
  );
  const isPublicRoute = publicRoutes.includes(path);

  // Special case for root path: it's protected
  const isRoot = path === '/';
  
  // 3. Decrypt the session from the cookie
  const cookie = req.cookies.get('session')?.value;
  const session = await decrypt(cookie);

  // 4. Redirect to /login if the user is not authenticated
  if ((isProtectedRoute || isRoot) && !session?.userId) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  // 5. Redirect to / if the user is authenticated
  if (
    isPublicRoute &&
    session?.userId &&
    !req.nextUrl.pathname.startsWith('/')
  ) {
    // We only want to redirect from /login specifically if they are already authed
    if (path === '/login') {
      return NextResponse.redirect(new URL('/', req.nextUrl));
    }
  }

  return NextResponse.next();
}

// Routes Middleware should not run on
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
