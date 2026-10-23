export function computeConditionDueDate(args: {
  readonly contractDate: Date | string | null
  readonly days: number | null
}): Date | null {
  const { contractDate, days } = args
  if (contractDate == null || days == null) return null
  if (!Number.isFinite(days) || days <= 0) return null

  const base = new Date(contractDate)
  if (Number.isNaN(base.getTime())) return null

  const result = new Date(base)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}
