import type { Metadata } from "next"
import PageMast from "@/app/page-mast"

export const metadata: Metadata = { title: "About — Otium" }

export default function AboutPage() {
  return (
    <main className="w-full max-w-2xl mx-auto px-4 pt-8 pb-20 sm:pb-8">
      <PageMast kicker="Otium" title="An old Latin word." />
      <div className="space-y-4 font-serif text-lg text-text-hover leading-relaxed">
        <p>
          Otium <span className="text-text-muted">(OH-tee-um)</span> is Latin for productive leisure — the contemplative hours that aren&apos;t work, but still matter. The Romans contrasted it with <em>negotium</em>, the busy world of commerce and obligation.
        </p>
        <p>
          The hours your household actually runs on are otium. So is this app.
        </p>
      </div>
      <p className="mt-10 text-xs text-text-faint">
        A calm way to keep your household running.
      </p>
    </main>
  )
}
