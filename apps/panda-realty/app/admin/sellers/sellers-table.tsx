"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

import type { SellerRow } from "@/lib/admin/sellers-types"
import { SellersPortalCell } from "@/components/admin/sellers-portal-cell"
import { Button } from "@repo/ui/button"
import { Input } from "@repo/ui/input"

function buildPageUrl(pathname: string, searchParams: URLSearchParams, newPage: number): string {
  const p = new URLSearchParams(searchParams.toString())
  p.set("page", String(newPage))
  return `${pathname}?${p.toString()}`
}

export function SellersTable({ initialSearch }: { initialSearch?: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [sellers, setSellers] = useState<SellerRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [inputValue, setInputValue] = useState(initialSearch ?? "")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const page = Math.max(1, Number.parseInt(String(searchParams.get("page") ?? "1"), 10) || 1)
  const search = searchParams.get("q") ?? undefined

  const fetchSellers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("q", search)
      params.set("page", String(page))
      const res = await fetch(`/api/admin/sellers?${params.toString()}`)
      if (!res.ok) return
      const data = (await res.json()) as { items: SellerRow[]; total: number }
      setSellers(data.items)
      setTotal(data.total)
    } catch {
      // noop
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    void fetchSellers()
  }, [fetchSellers])

  useEffect(() => {
    setInputValue(search ?? "")
  }, [search])

  const handleSearchChange = useCallback(
    (value: string) => {
      setInputValue(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const p = new URLSearchParams(searchParams.toString())
        if (value.trim()) p.set("q", value.trim())
        else p.delete("q")
        p.set("page", "1")
        router.push(`${pathname}?${p.toString()}`)
      }, 400)
    },
    [pathname, router, searchParams],
  )

  const limit = 50
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const hasPrev = page > 1
  const hasNext = page < totalPages

  return (
    <div data-testid="admin-sellers-page" className="flex flex-col gap-4">
      <Input
        data-testid="admin-sellers-search-input"
        type="search"
        placeholder="Search name, address, phone or email…"
        value={inputValue}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="max-w-sm"
      />

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
              <th data-testid="admin-sellers-col-name" className="px-3 py-2.5 font-medium">
                Name
              </th>
              <th data-testid="admin-sellers-col-address" className="px-3 py-2.5 font-medium">
                Address
              </th>
              <th data-testid="admin-sellers-col-phone" className="px-3 py-2.5 font-medium">
                Phone
              </th>
              <th data-testid="admin-sellers-col-email" className="px-3 py-2.5 font-medium">
                Email
              </th>
              <th data-testid="admin-sellers-col-portal" className="px-3 py-2.5 font-medium">
                Portal
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : sellers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  No seller records found.
                </td>
              </tr>
            ) : (
              sellers.map((row, idx) => (
                <tr
                  key={`${row.propertyListId}-${idx}`}
                  className="border-b border-border/50 hover:bg-muted/40"
                >
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.address ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.phone ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.email ?? "—"}</td>
                  <td className="px-3 py-2">
                    <SellersPortalCell propertyListId={row.propertyListId} initialToken={null} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div
        data-testid="admin-sellers-pagination"
        className="flex items-center justify-between text-sm text-muted-foreground"
      >
        <span>
          {total === 0
            ? "No results"
            : `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            asChild={hasPrev}
            disabled={!hasPrev}
            aria-label="Previous page"
            data-testid="admin-sellers-prev-page"
          >
            {hasPrev ? (
              <Link href={buildPageUrl(pathname, searchParams, page - 1)}>
                <ChevronLeft className="size-4" />
              </Link>
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </Button>
          <span className="px-2">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            asChild={hasNext}
            disabled={!hasNext}
            aria-label="Next page"
            data-testid="admin-sellers-next-page"
          >
            {hasNext ? (
              <Link href={buildPageUrl(pathname, searchParams, page + 1)}>
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <ChevronRight className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
