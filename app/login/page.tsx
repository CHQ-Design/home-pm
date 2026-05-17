"use client"

import { signIn } from "next-auth/react"

export default function LoginPage() {
  return (
    <main className="min-h-[100dvh] flex items-center justify-center bg-[#F9F5EF]">
      <div className="text-center space-y-6">
        <h1 className="font-serif text-3xl font-bold text-[#3A3228]">The Board</h1>
        <p className="text-sm text-[#8C7D6A]">Sign in to continue</p>
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="px-6 py-3 bg-accent text-white font-medium rounded-lg hover:bg-[#556148] transition-colors"
        >
          Sign in with Google
        </button>
      </div>
    </main>
  )
}
