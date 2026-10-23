/** Options for one FK column with `listRelation` (from related entity list API). */
export type AdminEntityCrudListRelationFieldOptions = {
  readonly options: readonly { readonly value: string; readonly label: string }[]
  readonly optionsPending: boolean
  /**
   * Raw related-list rows backing the options (preloaded variants only). Lets a custom form body
   * read embedded fields (e.g. description / unit) for the selected FK from the already-fetched
   * list instead of issuing a per-select `GET /api/admin/<rel>/<id>`.
   */
  readonly rawListRows?: readonly Record<string, unknown>[]
}

export type AdminEntityCrudListRelationFieldOptionsMap = Record<
  string,
  AdminEntityCrudListRelationFieldOptions
>
