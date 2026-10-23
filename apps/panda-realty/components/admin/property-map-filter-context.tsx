"use client"

import { createContext, useCallback, useContext, useState, type ReactNode } from "react"

interface PropertyMapFilterOpenContextValue {
  /** Open the map filter prefilled with an address. Pass the row's propertyListId to pin it to row 1. */
  openWithAddress: (address: string, propertyListId?: number) => void
  pendingAddress: string | null
  /** The source property id when opened via a row map button; null for toolbar-initiated opens. */
  pendingPropertyListId: number | null
  clearPendingAddress: () => void
}

const PropertyMapFilterOpenContext = createContext<PropertyMapFilterOpenContextValue>({
  openWithAddress: () => {},
  pendingAddress: null,
  pendingPropertyListId: null,
  clearPendingAddress: () => {},
})

export function PropertyMapFilterOpenContextProvider({ children }: { children: ReactNode }) {
  const [pendingAddress, setPendingAddress] = useState<string | null>(null)
  const [pendingPropertyListId, setPendingPropertyListId] = useState<number | null>(null)

  const openWithAddress = useCallback((address: string, propertyListId?: number) => {
    setPendingAddress(address)
    setPendingPropertyListId(propertyListId ?? null)
  }, [])

  const clearPendingAddress = useCallback(() => {
    setPendingAddress(null)
    setPendingPropertyListId(null)
  }, [])

  return (
    <PropertyMapFilterOpenContext.Provider
      value={{ openWithAddress, pendingAddress, pendingPropertyListId, clearPendingAddress }}
    >
      {children}
    </PropertyMapFilterOpenContext.Provider>
  )
}

export function usePropertyMapFilterOpen() {
  return useContext(PropertyMapFilterOpenContext)
}
