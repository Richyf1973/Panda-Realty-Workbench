import Link from "next/link"

import { Button } from "@repo/ui/button"

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-lg font-medium">Sign-in link didn&apos;t work</h1>
      <p className="max-w-sm text-center text-sm text-muted-foreground">
        The link may have expired or already been used. Request a new one or
        try signing in with email and password.
      </p>
      <Button asChild>
        <Link href="/login">Back to login</Link>
      </Button>
    </div>
  )
}
