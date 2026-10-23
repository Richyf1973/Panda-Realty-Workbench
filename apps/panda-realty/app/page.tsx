import Link from "next/link"
import { redirect } from "next/navigation"

import { Button } from "@repo/ui/button"
import { getSessionUser } from "@/lib/auth/session"

export default async function HomePage() {
  const user = await getSessionUser()
  if (user) redirect("/admin/properties")

  return (
    <div
      className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-16"
      data-testid="panda-realty-home"
    >
      <h1 className="text-2xl font-semibold tracking-tight">Panda Realty</h1>
      <p className="text-muted-foreground text-sm">
        Admin app for Postgres schema{" "}
        <code className="text-foreground">panda_realty</code>. Domain notes live in{" "}
        <code className="text-foreground">docs/BUSINESS-LOGIC.md</code>.
        {" Sign in to open Admin."}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/properties">Admin</Link>
        </Button>
      </div>
    </div>
  )
}
