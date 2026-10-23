"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { Share, SmartphoneNfc } from "lucide-react"

import { Button } from "@repo/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function isIosUserAgent(): boolean {
  if (typeof navigator === "undefined") return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent || "")
}

function getStandaloneSnapshot(): boolean {
  const displayStandalone =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches
  const iosStandalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  return displayStandalone || iosStandalone
}

function subscribeStandalone(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {}
  }
  const mq = window.matchMedia("(display-mode: standalone)")
  mq.addEventListener?.("change", onChange)
  return () => mq.removeEventListener?.("change", onChange)
}

type AddToHomeButtonProps = {
  /** testid for the trigger button — distinct per portal (seller vs buyer). */
  triggerTestId?: string
}

export function AddToHomeButton({
  triggerTestId = "portal-seller-add-to-home-button",
}: AddToHomeButtonProps = {}) {
  const [open, setOpen] = useState(false)
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)

  // SSR-safe (server snapshot = false): avoids a hydration mismatch without an
  // effect-driven setState, and re-renders if display-mode flips at runtime.
  const standalone = useSyncExternalStore(
    subscribeStandalone,
    getStandaloneSnapshot,
    () => false,
  )

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
  }, [])

  // Device detection only affects the dialog body, which renders client-side on
  // open — so reading it inline here is hydration-safe.
  const isIos = isIosUserAgent()

  // Nothing to add once already installed/standalone.
  if (standalone) return null

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    setDeferredPrompt(null)
    setOpen(false)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-testid={triggerTestId}
        onClick={() => setOpen(true)}
        className="shrink-0 gap-1.5"
      >
        <SmartphoneNfc className="h-4 w-4" />
        Save to Home
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="portal-add-to-home-dialog" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add this portal to your Home Screen</DialogTitle>
            <DialogDescription>
              Keep this property portal one tap away on your phone or desktop.
            </DialogDescription>
          </DialogHeader>

          {/* eslint-disable-next-line @next/next/no-img-element -- static same-origin icon, no optimization needed */}
          <img
            data-testid="portal-add-to-home-icon-preview"
            src="/icons/apple-touch-icon.png"
            alt="Panda Realty icon"
            className="mx-auto h-16 w-16 rounded-2xl shadow-sm ring-1 ring-black/5"
            width={64}
            height={64}
          />

          {isIos ? (
            <ol
              data-testid="portal-add-to-home-instructions-ios"
              className="list-decimal space-y-1.5 pl-5 text-sm text-gray-600"
            >
              <li>
                Tap the Share icon{" "}
                <Share className="inline h-4 w-4 align-text-bottom" /> in the
                Safari toolbar.
              </li>
              <li>Choose &ldquo;Add to Home Screen&rdquo;.</li>
              <li>Tap &ldquo;Add&rdquo; in the top-right corner.</li>
            </ol>
          ) : (
            <div
              data-testid="portal-add-to-home-instructions-other"
              className="space-y-3 text-sm text-gray-600"
            >
              {deferredPrompt && (
                <Button
                  type="button"
                  data-testid="portal-add-to-home-install-button"
                  onClick={handleInstall}
                  className="w-full"
                >
                  Install this app
                </Button>
              )}
              <ol className="list-decimal space-y-1.5 pl-5">
                <li>
                  Open your browser menu (the three-dot menu, or the install icon
                  in the address bar).
                </li>
                <li>
                  Choose &ldquo;Add to Home screen&rdquo; or &ldquo;Install&rdquo;.
                </li>
                <li>Confirm to add the shortcut.</li>
              </ol>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              data-testid="portal-add-to-home-dismiss"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
