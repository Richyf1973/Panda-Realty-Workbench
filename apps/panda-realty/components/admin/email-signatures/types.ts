export type EmailSignatureItem = {
  id: number
  name: string
  isDefault: boolean
  htmlContent: string
  renderedHtml: string
}

export type EmailSignatureForm = {
  name: string
  isDefault: boolean
  htmlContent: string
  renderedHtml: string
}

export const EMPTY_FORM: EmailSignatureForm = {
  name: "",
  isDefault: false,
  htmlContent: "",
  renderedHtml: "",
}
