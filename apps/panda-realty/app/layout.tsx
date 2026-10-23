import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "sonner"

import "./globals.css"
import { PandaRealtyAppChrome } from "@/components/site/panda-realty-app-chrome"
import { QueryProvider } from "@/components/query-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@repo/ui/tooltip"
import { frontendConfig } from "@/lib/config/frontend"
import { getPandaSiteAuthState } from "@/lib/site/get-site-auth"
import { cn } from "@repo/ui/utils"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  applicationName: "Panda Realty Portal",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Panda Realty",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { initialSignedIn, authConfigured, canAccessAdmin } =
    await getPandaSiteAuthState()

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable,
      )}
    >
      <body className="flex min-h-dvh flex-col">
        <Toaster richColors position="top-right" />
        <ThemeProvider>
          <TooltipProvider delayDuration={300}>
            <QueryProvider>
              <PandaRealtyAppChrome
                navPlacement={frontendConfig.admin.navPlacement}
                initialSignedIn={initialSignedIn}
                authConfigured={authConfigured}
                canAccessAdmin={canAccessAdmin}
              >
                {children}
              </PandaRealtyAppChrome>
            </QueryProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
