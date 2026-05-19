import { NextAuthOptions, Session } from "next-auth"
import { JWT } from "next-auth/jwt"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "./prisma"

export type Role = "admin" | "member"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase()
      if (!email) return false
      const dbUser = await prisma.user.findUnique({ where: { email } })
      return dbUser !== null
    },
    async jwt({ token }: { token: JWT }) {
      const email = (token.email as string | undefined)?.toLowerCase()
      if (email) {
        const dbUser = await prisma.user.findUnique({
          where: { email },
          select: { role: true, householdId: true },
        })
        token.role = (dbUser?.role ?? "member") as Role
        token.householdId = dbUser?.householdId ?? null
      }
      return token
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.role = token.role as Role
        session.user.householdId = token.householdId as number | null
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
}
