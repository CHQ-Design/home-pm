"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"

function LoginContent() {
  const params = useSearchParams()
  const accessDenied = params.get("error") === "AccessDenied"

  return (
    <main className="min-h-[100dvh] flex items-center justify-center bg-[#F9F5EF]">
      <div className="text-center space-y-6">
        <h1 className="font-serif text-3xl font-bold text-[#3A3228]">The Board</h1>
        <p className="text-sm text-[#8C7D6A]">Sign in to continue</p>
        {accessDenied && (
          <p className="text-sm text-red-600 max-w-xs mx-auto">
            Your account hasn&apos;t been added yet. Ask Craig to add your email.
          </p>
        )}
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
