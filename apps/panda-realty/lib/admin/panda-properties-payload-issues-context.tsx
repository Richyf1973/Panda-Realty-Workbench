"use client"

import { createContext, useContext, type MutableRefObject, type ReactNode } from "react"

/** Invoked when admin create/patch payload validation reports blocking field keys for `properties`. */
export type PandaPropertiesPayloadFieldIssuesHandler = (fieldKeys: readonly string[]) => void

/**
 * Ref filled by {@link PandaPropertiesDialogForm} so {@link notifyAdminEntityCrudPayloadFieldIssues}
 * can open Property details without a module-level singleton.
 */
export const PandaPropertiesPayloadIssuesHandlerRefContext =
  createContext<MutableRefObject<PandaPropertiesPayloadFieldIssuesHandler | null> | null>(null)

export function PandaPropertiesPayloadIssuesHandlerRefProvider({
  handlerRef,
  children,
}: {
  handlerRef: MutableRefObject<PandaPropertiesPayloadFieldIssuesHandler | null>
  children: ReactNode
}) {
  return (
    <PandaPropertiesPayloadIssuesHandlerRefContext.Provider value={handlerRef}>
      {children}
    </PandaPropertiesPayloadIssuesHandlerRefContext.Provider>
  )
}

export function usePandaPropertiesPayloadIssuesHandlerRef(): MutableRefObject<PandaPropertiesPayloadFieldIssuesHandler | null> {
  const ctx = useContext(PandaPropertiesPayloadIssuesHandlerRefContext)
  if (ctx == null) {
    throw new Error(
      "usePandaPropertiesPayloadIssuesHandlerRef requires PandaPropertiesPayloadIssuesHandlerRefProvider",
    )
  }
  return ctx
}
