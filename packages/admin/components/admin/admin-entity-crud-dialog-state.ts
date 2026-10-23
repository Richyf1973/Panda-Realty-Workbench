/** When `adminEntityPartialPatchBySlug` is on, used to omit unchanged fields from PATCH JSON. */
export type AdminEntityEditPatchDiffBaseline = {
  readonly formValues: Record<string, string>
  /** `extraPatchBodyKeys` only — deep-cloned API shapes. */
  readonly extrasByKey: Record<string, unknown>
}

/**
 * Client-only hints when a nested CRUD edit dialog opens from a parent context (e.g. Panda
 * **properties** → **entities**). Not sent to PATCH; consumed by `renderCrudDialogFormBody`.
 */
export type AdminNestedEditUiContext = {
  /** Parent listing id when **entities** edit opens from a **properties** related row. */
  readonly sourcePropertyListId?: string
}

export type AdminEntityCrudDialogState =
  | { kind: "none" }
  | {
      kind: "create"
      /**
       * Incremented after **Create & add new** succeeds so the create form remounts with fresh defaults
       * (main fields + related inline drafts) while the dialog stays open.
       */
      createFormRemountKey?: number
      /**
       * Merged over defaults when opening create with prefilled fields (nested quick-create from async
       * relation search, or future list-toolbar flows). Omit after **Create & add new** so the next
       * empty form does not keep stale seeds.
       */
      createFormSeedValues?: Record<string, string>
    }
  | {
      kind: "edit"
      rowId: string
      values: Record<string, string>
      /** Nested collections already on the list row — skips GET detail when complete. */
      listDetailSeed?: Record<string, unknown>
      /**
       * Raw **GET** detail row (includes list-relation embeds like `inventory` for async-search labels).
       * Set when the dialog is opened with the full server payload; lets {@link
       * AdminEntityCrudListRelationAsyncSearchControl} use `relationDetailEmbed` without a
       * duplicate label fetch. Optional — omit for list-only open flows until wired.
       */
      detailSourceRow?: Record<string, unknown>
      /**
       * Incremented when PATCH succeeds with `keepEditDialogOpen` so `AdminEntityEditCrudForm`
       * remounts with refreshed `values` / `listDetailSeed` (same `rowId`).
       */
      editFormRemountKey?: number
      /** Present when partial PATCH is enabled for this entity (see registry). */
      patchDiffBaseline?: AdminEntityEditPatchDiffBaseline
      /**
       * When set, the edit dialog uses this entity’s definition / API instead of the list page entity
       * (e.g. open **Sales** from **Itemized sales**).
       */
      dialogEntitySlug?: string
      /**
       * When true, the edit dialog is **view-only** (opened from another admin list): fields stay
       * selectable/copyable, related tabs work, and save is hidden. Omit when `dialogEntitySlug`
       * matches the list page or for native list Edit.
       */
      crossPageFormLocked?: boolean
      /** Nested open only — optional UI seed for custom dialog bodies (see {@link AdminNestedEditUiContext}). */
      nestedEditUiContext?: AdminNestedEditUiContext
    }
