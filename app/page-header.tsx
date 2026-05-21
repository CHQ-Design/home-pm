export default function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="mb-6 pb-4 border-b border-border-subtle flex items-end justify-between gap-4">
      <h1 className="font-serif text-2xl font-bold text-foreground">{title}</h1>
      {children}
    </header>
  )
}
