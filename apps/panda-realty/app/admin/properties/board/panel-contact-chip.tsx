export function ContactChip({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      {icon}
      {value}
    </span>
  )
}
