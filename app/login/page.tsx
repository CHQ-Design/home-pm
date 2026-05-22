"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"

function LoginContent() {
  const params = useSearchParams()
  const accessDenied = params.get("error") === "AccessDenied"

  return (
    <main className="flex-1 flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="font-serif text-5xl font-bold tracking-tight text-foreground">Otium<span className="text-warm" aria-hidden="true">.</span></h1>
        <p className="text-xs text-text-hover tracking-[0.3em] uppercase">oh · tee · um</p>
        <p className="text-sm text-text-secondary">Sign in to your household.</p>
        {accessDenied && (
          <p className="text-sm text-red-600 max-w-xs mx-auto">
            Your account hasn&apos;t been added yet. Ask Craig to add your email.
          </p>
        )}
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="px-6 py-3 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover transition-colors"
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
