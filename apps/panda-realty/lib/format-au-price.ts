export function formatAuPrice(salePrice: string | null): string {
  if (!salePrice) return ""
  const n = parseFloat(salePrice)
  if (!Number.isFinite(n)) return ""
  return n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
