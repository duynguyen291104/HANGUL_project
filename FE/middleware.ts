import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect /speak/* to /pronunciation/*
  if (pathname.startsWith('/speak/')) {
    const topicId = pathname.replace('/speak/', '');
    return NextResponse.redirect(new URL(`/pronunciation/${topicId}`, request.url));
  }

  // Redirect /speak to /pronunciation
  if (pathname === '/speak') {
    return NextResponse.redirect(new URL('/pronunciation', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/speak/:path*'],
};
