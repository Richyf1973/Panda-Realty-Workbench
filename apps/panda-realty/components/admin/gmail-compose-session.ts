export const SIGNATURE_STORAGE_KEY = "panda-realty:gmail-compose:selected-signature-id"
export const NO_SIGNATURE_VALUE = "__none__"

export let rememberedSignatureIdInSession: number | null = null
export let rememberedExplicitSignatureIdInSession: number | null = null

export function setRememberedExplicitSignatureId(id: number | null) {
  rememberedExplicitSignatureIdInSession = id
}

export function persistSelectedSignature(value: string) {
  if (value === NO_SIGNATURE_VALUE) {
    rememberedSignatureIdInSession = null
  } else {
    const parsedValue = Number.parseInt(value, 10)
    rememberedSignatureIdInSession = Number.isFinite(parsedValue) ? parsedValue : null
  }
  if (typeof window === "undefined") return
  if (value === NO_SIGNATURE_VALUE) {
    window.localStorage.removeItem(SIGNATURE_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(SIGNATURE_STORAGE_KEY, value)
}
