import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: { signIn: "/login" },
})

export const config = {
  matcher: ["/((?!api/auth|api/cron/notify|_next/static|_next/image|favicon|icon|manifest|sw|apple-touch-icon|og-image|login).*)"],
}
