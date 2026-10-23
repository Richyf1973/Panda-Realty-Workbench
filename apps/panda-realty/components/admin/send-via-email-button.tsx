"use client"

import { Loader2, Mail } from "lucide-react"

import { Button } from "@repo/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui/tooltip"

interface SendViaEmailButtonProps {
  /** Pass null to disable the button with a "no email" tooltip. Pass undefined to always enable it. */
  sellerEmail: string | null | undefined
  sending: boolean
  onSendEmail: () => void
  buttonClassName?: string
  testIdPrefix?: string
}

export function SendViaEmailButton({
  sellerEmail,
  sending,
  onSendEmail,
  buttonClassName = "h-11 sm:h-9",
  testIdPrefix = "portal-seller",
}: SendViaEmailButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span data-testid={`${testIdPrefix}-send-email-trigger`}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={buttonClassName}
              data-testid={`${testIdPrefix}-send-email-btn`}
              disabled={(sellerEmail === null) || sending}
              onClick={onSendEmail}
            >
              {sending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Sending…</>
              ) : (
                <><Mail className="h-4 w-4" />Send via email</>
              )}
            </Button>
          </span>
        </TooltipTrigger>
        {sellerEmail === null && (
          <TooltipContent>No seller email on record</TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}
