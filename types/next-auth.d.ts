import { Role } from "@/lib/auth"

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null
      email?: string | null
      image?: string | null
      role: Role
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role
  }
}
