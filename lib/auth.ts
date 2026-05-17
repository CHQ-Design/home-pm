import { NextAuthOptions, Session } from "next-auth"
import { JWT } from "next-auth/jwt"
import GoogleProvider from "next-auth/providers/google"

const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS ?? "").split(",").map(e => e.trim()).filter(Boolean)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ""

export type Role = "admin" | "member"

export function getRole(email: string | null | undefined): Role {
  return email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? "admin" : "member"
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      return ALLOWED_EMAILS.includes(user.email ?? "")
    },
    async jwt({ token }: { token: JWT }) {
      return token
    },
    async session({ session }: { session: Session }) {
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
}
