import NextAuth from 'next-auth'
import { authConfig } from '@/authConfig'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

const protectedRoutes = [
  '/dashboard',
  '/upload',
  '/forecast',
  '/simulate',
  '/settings'
]

export default auth(req => {
  const isLoggedIn = !!req.auth
  const isProtected = protectedRoutes.some(route =>
    req.nextUrl.pathname.startsWith(route)
  )

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (
    isLoggedIn &&
    (req.nextUrl.pathname === '/login' ||
      req.nextUrl.pathname === '/signup')
  ) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
