import { NextResponse, type NextRequest } from "next/server"
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session"

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const isAuthed = await verifySessionToken(token)

  const { pathname } = request.nextUrl
  const isLoginPage = pathname === "/login"

  if (!isAuthed && !isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (isAuthed && isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Protect everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
