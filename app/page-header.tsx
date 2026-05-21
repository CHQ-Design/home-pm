export default function PageHeader({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <header className="mb-6 pb-4 border-b border-border-subtle flex items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
      </div>
      {children}
    </header>
  )
}
