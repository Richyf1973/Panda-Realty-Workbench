"use client"

import { useState, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Button } from "@repo/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui/dialog"
import { Map, X, Loader2 } from "lucide-react"
import type { PropertyMapFilterMapProps } from "./property-map-filter-map"
import { MAP_FILTER_MAP_MIN_HEIGHT_PX, MAP_FILTER_DEFAULT_ADDRESS } from "./property-map-filter-constants"
import { encodeStreetFilter, fetchStreetsForPolygon } from "./property-map-filter-streets"
import { PropertyMapFilterAddressSearch } from "./property-map-filter-address-search"
import { usePropertyMapFilterOpen } from "./property-map-filter-context"

const PropertyMapFilterMap = dynamic<PropertyMapFilterMapProps>(
  () => import("./property-map-filter-map"),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-full w-full flex-1 bg-muted animate-pulse rounded-md"
        style={{ minHeight: MAP_FILTER_MAP_MIN_HEIGHT_PX }}
      />
    ),
  },
)

const MAP_FILTER_DIALOG_STYLE = {
  width:
    "calc(100vw - 2rem - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px))",
  height:
    "calc(100dvh - 2rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))",
  maxHeight:
    "calc(100dvh - 2rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))",
} as const

export function PropertyMapFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeFilter = searchParams.get("streetFilter")

  const { pendingAddress, pendingPropertyListId, clearPendingAddress } = usePropertyMapFilterOpen()

  const [open, setOpen] = useState(false)
  const [initialAddress, setInitialAddress] = useState<string | null>(null)
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null)
  const [pinAt, setPinAt] = useState<[number, number] | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [savedPolygon, setSavedPolygon] = useState<[number, number][] | null>(null)
  const [openedViaRowButton, setOpenedViaRowButton] = useState(false)
  // The anchor property whose row map icon was tapped — pinned to row 1 when the filter applies.
  const [pinSourceId, setPinSourceId] = useState<number | null>(null)

  const handleOpen = useCallback(() => {
    setOpenedViaRowButton(false)
    setPinSourceId(null)
    setPinAt(null)
    setInitialAddress(null)
    setFetchError(null)
    if (savedPolygon && savedPolygon.length > 0) {
      const lat = savedPolygon.reduce((s, p) => s + p[0], 0) / savedPolygon.length
      const lng = savedPolygon.reduce((s, p) => s + p[1], 0) / savedPolygon.length
      setFlyTo([lat, lng])
    } else {
      setFlyTo(null)
    }
    setOpen(true)
  }, [savedPolygon])

  const handleClose = useCallback(() => {
    setOpen(false)
    setFetchError(null)
    setPinAt(null)
    setInitialAddress(null)
  }, [])

  // Open dialog from a row map button via context
  useEffect(() => {
    if (!pendingAddress) return
    setOpenedViaRowButton(true)
    setPinSourceId(pendingPropertyListId)
    setFlyTo(null)
    setPinAt(null)
    setFetchError(null)
    setInitialAddress(pendingAddress)
    setOpen(true)
    clearPendingAddress()
  }, [pendingAddress, pendingPropertyListId, clearPendingAddress])

  // Auto-geocode when dialog opens with a pre-filled address
  useEffect(() => {
    if (!open || !initialAddress) return
    const abortController = new AbortController()

    const geocode = async () => {
      try {
        const res = await fetch(
          `/api/streets/autocomplete?q=${encodeURIComponent(initialAddress)}`,
          { signal: abortController.signal },
        )
        if (!res.ok) return
        const data = await res.json()
        const first = data.items?.[0]
        if (first) {
          setFlyTo([first.lat, first.lng])
          setPinAt([first.lat, first.lng])
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          // silent fallback — no pin placed
        }
      }
    }

    geocode()
    return () => abortController.abort()
  }, [open, initialAddress])

  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setFlyTo([lat, lng])
  }, [])

  const handlePolygonComplete = useCallback(
    async (points: [number, number][]) => {
      setIsFetching(true)
      setFetchError(null)
      try {
        const results = await fetchStreetsForPolygon(points)
        if (results.length === 0) {
          setFetchError("No streets found in this area. Try a different polygon.")
          return
        }
        const params = new URLSearchParams(searchParams.toString())
        params.set("streetFilter", encodeStreetFilter(results))
        // Pin the anchor property (the row whose map icon was tapped) to row 1; toolbar-initiated
        // filters carry no anchor, so drop any stale pin.
        if (pinSourceId != null) {
          params.set("pinTopId", String(pinSourceId))
        } else {
          params.delete("pinTopId")
        }
        params.delete("page")
        setSavedPolygon(points)
        handleClose()
        router.push(`${pathname}?${params.toString()}`)
      } catch {
        setFetchError("Street data is temporarily unavailable. Please try again later.")
      } finally {
        setIsFetching(false)
      }
    },
    [searchParams, pathname, router, handleClose, pinSourceId],
  )

  const clearStreetFilter = useCallback(() => {
    setSavedPolygon(null)
    setPinSourceId(null)
    const params = new URLSearchParams(searchParams.toString())
    params.delete("streetFilter")
    params.delete("pinTopId")
    params.delete("page")
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }, [searchParams, pathname, router])

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          data-testid="property-map-filter-trigger"
          variant={activeFilter ? "default" : "outline"}
          size="sm"
          onClick={handleOpen}
          className="gap-1.5"
        >
          <Map className="h-4 w-4" />
          Map Filter
          {activeFilter && (
            <span className="ml-1 rounded-full bg-primary-foreground text-primary text-xs px-1.5 py-0.5 leading-none">
              ON
            </span>
          )}
        </Button>
        {activeFilter && (
          <Button
            type="button"
            data-testid="property-map-filter-clear"
            variant="ghost"
            size="sm"
            onClick={clearStreetFilter}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
        <DialogContent
          data-testid="property-map-filter-dialog"
          style={MAP_FILTER_DIALOG_STYLE}
          className="flex max-h-none w-full max-w-none flex-col gap-4 overflow-hidden"
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>Filter properties by map area</DialogTitle>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <PropertyMapFilterAddressSearch
              key={initialAddress ?? ""}
              onLocationSelect={handleLocationSelect}
              initialQuery={initialAddress ?? MAP_FILTER_DEFAULT_ADDRESS}
            />

            <div className="relative min-h-0 flex-1" data-testid="property-map-filter-map-wrap">
              {isFetching && (
                <div className="absolute inset-0 z-1000 flex items-center justify-center bg-background/60 rounded-md">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
              <PropertyMapFilterMap
                dialogOpen={open}
                flyTo={flyTo}
                pinAt={pinAt}
                pinLabel={initialAddress ?? undefined}
                onPolygonComplete={handlePolygonComplete}
                onPolygonDeleted={clearStreetFilter}
                initialPolygon={!openedViaRowButton && savedPolygon ? savedPolygon : undefined}
              />
            </div>

            {fetchError && (
              <p className="shrink-0 text-sm text-destructive">{fetchError}</p>
            )}
          </div>

          <DialogFooter className="shrink-0">
            <Button
              type="button"
              data-testid="property-map-filter-cancel"
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
