"use client"

import { createContext, useContext, type ReactNode } from "react"

const AddressConversionsContext = createContext<ReadonlyMap<string, string>>(new Map())

export function AddressConversionsProvider({
  conversions,
  children,
}: {
  conversions: ReadonlyMap<string, string>
  children: ReactNode
}) {
  return (
    <AddressConversionsContext.Provider value={conversions}>
      {children}
    </AddressConversionsContext.Provider>
  )
}

export function useAddressConversions(): ReadonlyMap<string, string> {
  return useContext(AddressConversionsContext)
}
