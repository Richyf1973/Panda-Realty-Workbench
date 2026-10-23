"use client"

import { formatAdminEntityDecimalAmountFormDisplay } from "../../admin-entity-list-numeric-format"
import { sanitizeAdminEntityDecimalAmountInput } from "../../admin-entity-currency-decimal-input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@repo/ui/input-group"
import { cn } from "@repo/ui/utils"

/** Read-only footer total styled like inline amount fields (currency + disabled input). */
export function DisabledCurrencyAmountFooterInput({
  currencySymbol,
  total,
  allowLeadingMinus,
  ariaLabel,
  testId,
  className,
}: {
  currencySymbol: string
  total: number
  allowLeadingMinus?: boolean
  ariaLabel: string
  testId?: string
  className?: string
}) {
  const decOpts =
    allowLeadingMinus === true ? { allowLeadingMinus: true } : undefined
  const footerAmountDisplay = formatAdminEntityDecimalAmountFormDisplay(
    sanitizeAdminEntityDecimalAmountInput(String(total), decOpts),
    decOpts,
  )
  return (
    <InputGroup
      className={cn("h-8 w-full", className)}
      data-testid={testId}
    >
      <InputGroupAddon>
        <InputGroupText className="tabular-nums text-foreground">
          {currencySymbol}
        </InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        disabled
        className="h-8 text-right tabular-nums"
        value={footerAmountDisplay}
        aria-label={ariaLabel}
      />
    </InputGroup>
  )
}
