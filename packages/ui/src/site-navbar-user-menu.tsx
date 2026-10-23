"use client"

import { LogOut } from "lucide-react"

import { Avatar, AvatarFallback } from "./avatar"
import { Button } from "./button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu"
import { emailInitialsForAvatar } from "./email-initials"
import { cn } from "./utils"

export type SiteNavbarUserMenuProps = {
  /** Resolved email from the session, or null while the client is still loading. */
  email: string | null
  onSignOut: () => void
  className?: string
}

export function SiteNavbarUserMenu({
  email,
  onSignOut,
  className,
}: SiteNavbarUserMenuProps) {
  const initials = emailInitialsForAvatar(email ?? "")
  const hasEmail = Boolean(email?.trim())

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn(
            "relative size-11 shrink-0 rounded-full p-0.5 ring-1 ring-border/80 bg-background/90 shadow-sm transition-[box-shadow,background-color] hover:bg-muted/80 hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
          aria-label="Account menu"
          data-testid="site-navbar-account-menu-trigger"
        >
          <Avatar className="size-full">
            <AvatarFallback
              className={cn(
                "text-[0.6rem] font-semibold",
                "bg-gradient-to-br from-primary/25 via-primary/12 to-primary/5 text-primary",
              )}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[min(calc(100vw-1rem),18rem)] min-w-[13rem] overflow-hidden p-0 shadow-lg ring-1 ring-foreground/10"
        align="end"
        sideOffset={10}
      >
        <div className="border-b border-border/70 bg-gradient-to-br from-muted/50 to-muted/20 px-3 py-3">
          <div className="flex items-start gap-3">
            <Avatar className="size-10 shrink-0 shadow-sm ring-1 ring-border/60">
              <AvatarFallback
                className={cn(
                  "text-sm font-semibold",
                  "bg-gradient-to-br from-primary/30 via-primary/14 to-primary/5 text-primary",
                )}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
                Signed in as
              </p>
              {hasEmail ? (
                <p
                  className="mt-1 text-sm font-medium leading-snug wrap-break-word text-foreground"
                  data-testid="site-navbar-account-email"
                >
                  {email}
                </p>
              ) : (
                <p
                  className="mt-1 text-sm text-muted-foreground italic"
                  data-testid="site-navbar-account-email"
                >
                  Loading…
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="p-1">
          <DropdownMenuItem
            variant="destructive"
            className="gap-2 px-2.5 py-2"
            data-testid="site-navbar-sign-out"
            onSelect={() => {
              onSignOut()
            }}
          >
            <LogOut className="size-4 opacity-90" aria-hidden />
            Sign out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
