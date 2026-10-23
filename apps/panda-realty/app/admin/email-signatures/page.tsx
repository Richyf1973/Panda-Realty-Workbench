import type { Metadata } from "next"

import { EmailSignaturesPage } from "@/components/admin/email-signatures-page"

export const metadata: Metadata = {
  title: "Email Signatures · Admin",
}

export default function PandaEmailSignaturesAdminPage() {
  return (
    <div className="flex flex-col gap-6 p-6" data-testid="email-signatures-page-shell">
      <EmailSignaturesPage />
    </div>
  )
}
