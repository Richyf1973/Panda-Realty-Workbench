export const PREFILL_STRATEGY_FORM6 = "form-6" as const
export const PREFILL_STRATEGY_CONTRACT_SALE_PURCHASE = "contract-sale-purchase-1" as const
export const PREFILL_STRATEGY_PRO_FORMA_2026 = "pro-forma-2026" as const

export function hasPrefillFillStep(strategy: string | null | undefined): boolean {
  return strategy === PREFILL_STRATEGY_FORM6 || strategy === PREFILL_STRATEGY_CONTRACT_SALE_PURCHASE
}
