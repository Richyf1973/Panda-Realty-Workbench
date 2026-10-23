"use client"

import { useForm } from "@tanstack/react-form"
import { useStore } from "@tanstack/react-store"
import type { UseMutationResult } from "@tanstack/react-query"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@repo/ui/dialog"
import { Label } from "@repo/ui/label"
import { cn } from "@repo/ui/utils"
import { useCompactAdminListViewport } from "@repo/ui/use-compact-admin-list-viewport"
import {
  useAdminClientRegistry,
  type AdminRenderCrudFormAfterMainFieldsArgs,
} from "../../admin-client-registry-context"
import type { AdminEntityCrudListRelationFieldOptionsMap } from "../../admin-entity-crud-relation-field-options-types"
import type { AdminEntityColumn, AdminEntityDefinition } from "../../admin-entity-types"
import {
  adminEntityFormDefaultValues,
  buildAdminEntityCreateRequestPayload,
  listAdminEntityCreateBodyBlockingIssues,
  type AdminEntityCreateMutationVariables,
  type AdminEntityCrudBodyFieldIssue,
} from "../../admin-entity-crud-form-values"
import {
  ADMIN_ENTITY_CRUD_FALLBACK_PAYLOAD_BUILD_ERROR_MESSAGE,
  notifyAndScheduleFocusFirstPayloadIssueField,
} from "../../admin-entity-crud-payload-submit-side-effects"
import { AdminEntityCrudPayloadIssuesAlert } from "./admin-entity-crud-payload-issues-alert"
import { partitionAdminEntityCrudColumnsMainAndManyRelationSide } from "../../admin-entity-many-relation-form"
import {
  ADMIN_ENTITY_CRUD_FIELD_CELL_CLASS,
  ADMIN_ENTITY_CRUD_FIELD_ERROR_FOOTER_CLASS,
  ADMIN_ENTITY_CRUD_FORM_FIELDS_GRID_CLASS,
  ADMIN_ENTITY_CRUD_FORM_SIDE_MANY_RELATION_GRID_TEMPLATE_COLUMNS,
  ADMIN_ENTITY_CRUD_MUTATION_ERROR_GRID_AREA,
  ADMIN_ENTITY_CRUD_FORM_GRID_TEMPLATE_COLUMNS_WIDE,
  buildAdminEntityCrudFormGridLayout,
} from "../../admin-entity-form-grid"
import { formatUnknownErrorMessage } from "../../read-api-error"
import { fieldErrorsText } from "../../field-errors-text"
import type { AdminEntityCrudFormSubscribeApi } from "../../admin-entity-crud-form-subscribe-api"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import { adminEntityLocksCrudOnCompactViewport } from "../../admin-entity-crud-compact-viewport"
import { useAdminCrudFormInteractionLocked } from "../../admin-crud-form-interaction-lock-context"
import { useAdminEntityCrudRelationFieldOptionsMerged } from "./use-admin-entity-crud-relation-field-options-merged"
import { adminEntityColumnFormLabel } from "../../admin-entity-column-form-label"
import { AdminEntityCrudManyRelationCheckboxControl } from "./admin-entity-crud-many-relation-checkbox-control"
import {
  type AdminEntityStringMapForm,
  adminCrudFormLatestStringMapValues,
  adminEntityCreateFormKeySeedDigest,
  chainAdminCrudFieldStringChange,
  partitionCrudDeferredColumns,
  buildAdminEntityCrudFormGroupPartition,
  adminEntityColumnShownInCrudForm,
  crudFormFieldGridSpan,
  adminCrudFormGridMediaQuery,
} from "./admin-entity-crud-form-column-utils"
import {
  createAdminEntityCreateCrudRenderCreateField,
  type AdminEntityCreateCrudRenderCreateFieldDeps,
} from "./admin-entity-create-crud-form-render-create-field"
import { useAdminCrudFormWideGridLayout } from "./admin-entity-crud-form-grid"
import { useAdminCrudServerFieldErrors } from "./admin-entity-crud-server-field-errors"
import { renderCreateFormGroups } from "./admin-entity-create-crud-form-groups"
import { AdminEntityCreateCrudDialogFooter } from "./admin-entity-create-crud-dialog-footer"
import { useAdminEntityCreateCrudSubmitFlight } from "./use-admin-entity-create-crud-submit-flight"
import { queryAdminAsyncSearchTrigger } from "../../admin-entity-async-search-dom"

export function AdminEntityCreateCrudForm({
  slug,
  entityDefinition,
  addCardTitle,
  schemaSqlName,
  createCols,
  createMutation,
  crudListRelationFieldOptions,
  createFormListDateFilterDefaults = {},
  createFormSeedValues,
  createFooterMode = "default",
  createPrimarySubmitLabel,
  promoteCreateDialogToEditFromApiRow,
  onCancel,
}: {
  slug: AdminEntitySlug
  entityDefinition: AdminEntityDefinition
  addCardTitle: string
  schemaSqlName: string
  createCols: AdminEntityColumn[]
  createMutation: Pick<
    UseMutationResult<
      Record<string, unknown>,
      Error,
      AdminEntityCreateMutationVariables
    >,
    "mutate" | "isPending" | "isError" | "error"
  >
  crudListRelationFieldOptions: AdminEntityCrudListRelationFieldOptionsMap
  createFormListDateFilterDefaults?: Readonly<Record<string, string>>
  createFormSeedValues?: Readonly<Record<string, string>>
  createFooterMode?: "default" | "singleCreate"
  /** Overrides the default primary submit label (e.g. nested buyer **Create & Edit**). */
  createPrimarySubmitLabel?: string
  promoteCreateDialogToEditFromApiRow?: (
    createdRow: Record<string, unknown>,
  ) => void
  onCancel: () => void
}) {
  const {
    adminEntities,
    adminUiMutationsDisabled = false,
    adminEntityCrudExtrasForSaveRef,
    getCreateFormDefaultsBySlug,
    renderCrudFormBeforeRelatedCollections,
    renderCrudFormAfterMainFields,
    crudFormAfterMainFieldsSideRailSlugs,
    renderCrudFormGroupBody,
    renderCrudDialogFormBody,
    renderCrudFormComputedField,
    crudFormFieldChangeEffectBySlug,
    crudFormClientSubmitValidatorBySlug,
    crudFormNormalizeValuesBeforeSubmitBySlug,
    crudFormServerErrorToFieldErrorsBySlug,
    notifyAdminEntityCrudPayloadFieldIssues,
  } = useAdminClientRegistry()
  const compactVpCreate = useCompactAdminListViewport()
  const compactLocksEditingCreate =
    adminEntityLocksCrudOnCompactViewport(entityDefinition)
  const defaultValues = useMemo(() => {
    const base = adminEntityFormDefaultValues(createCols) as AdminEntityStringMapForm
    const fromRegistry = getCreateFormDefaultsBySlug?.[slug]?.() ?? {}
    return {
      ...base,
      ...fromRegistry,
      ...createFormListDateFilterDefaults,
      ...(createFormSeedValues ?? {}),
    } as AdminEntityStringMapForm
  }, [
    createCols,
    createFormSeedValues,
    createFormListDateFilterDefaults,
    getCreateFormDefaultsBySlug,
    slug,
  ])

  const [clientSubmitValidatorMessage, setClientSubmitValidatorMessage] = useState<
    string | null
  >(null)
  const [clientPayloadFieldIssues, setClientPayloadFieldIssues] = useState<
    AdminEntityCrudBodyFieldIssue[] | null
  >(null)

  const clearClientSubmitAlerts = useCallback(() => {
    setClientSubmitValidatorMessage(null)
    setClientPayloadFieldIssues(null)
  }, [])
  /** "unset" → use implicit default (e.g. Enter) from {@link createFormPrimarySubmitAction}. */
  const pendingCreateAfterSuccessRef = useRef<
    "keepOpen" | "close" | "createAnother" | "unset"
  >("unset")
  const formRef = useRef<HTMLFormElement>(null)
  const createSubmitFlight = useAdminEntityCreateCrudSubmitFlight(createMutation)
  const { createMutationInFlight } = createSubmitFlight
  const createSubmitFlightRef = useRef(createSubmitFlight)
  createSubmitFlightRef.current = createSubmitFlight

  useEffect(() => {
    if (slug.endsWith("-inventory-count-items")) {
      const trigger = queryAdminAsyncSearchTrigger(formRef.current, "create", slug, "itemCode")
      if (trigger) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            trigger.focus()
          })
        })
        return
      }
    }
    if (slug === "under-over-beg") {
      const trigger = queryAdminAsyncSearchTrigger(
        formRef.current,
        "create",
        slug,
        "customerCode",
      )
      if (trigger) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            trigger.focus()
          })
        })
        return
      }
    }
    const firstField = formRef.current?.querySelector<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
    )
    firstField?.focus()
  }, [])

  const form = useForm({
    defaultValues,
    listeners: {
      onChange: () => {
        clearClientSubmitAlerts()
      },
    },
    onSubmit: ({ value }) => {
      if (createSubmitFlightRef.current.shouldBlockCreateSubmit()) return
      if (
        adminUiMutationsDisabled ||
        (compactVpCreate && compactLocksEditingCreate)
      )
        return

      const showCreateAndAddNew = createFooterMode !== "singleCreate"
      const primary = entityDefinition.createFormPrimarySubmitAction ?? "create"
      const enterDefault: "keepOpen" | "close" | "createAnother" =
        primary === "createAndAddNew" && showCreateAndAddNew
          ? "createAnother"
          : primary === "createAndClose"
            ? "close"
            : "keepOpen"
      const pending = pendingCreateAfterSuccessRef.current
      const afterSuccess = pending === "unset" ? enterDefault : pending
      pendingCreateAfterSuccessRef.current = "unset"

      crudFormNormalizeValuesBeforeSubmitBySlug?.[slug]?.({
        variant: "create",
        form: form as unknown as AdminEntityCrudFormSubscribeApi,
      })
      const valueNow = adminCrudFormLatestStringMapValues(
        form,
        value as AdminEntityStringMapForm,
      )
      const msg = crudFormClientSubmitValidatorBySlug?.[slug]?.({
        variant: "create",
        value: valueNow,
        crudExtrasForSave: adminEntityCrudExtrasForSaveRef?.current,
      })
      if (msg) {
        setClientPayloadFieldIssues(null)
        setClientSubmitValidatorMessage(msg)
        return
      }
      const body = buildAdminEntityCreateRequestPayload(
        entityDefinition,
        createCols,
        valueNow,
        adminEntities,
      )
      if (!body) {
        const issues = listAdminEntityCreateBodyBlockingIssues(createCols, valueNow)
        if (issues.length > 0) {
          setClientSubmitValidatorMessage(null)
          setClientPayloadFieldIssues(issues)
          const fieldKeys = issues.map((i) => i.key)
          notifyAndScheduleFocusFirstPayloadIssueField({
            slug,
            fieldKeys,
            variant: "create",
            notifyAdminEntityCrudPayloadFieldIssues,
          })
        } else {
          setClientPayloadFieldIssues(null)
          setClientSubmitValidatorMessage(ADMIN_ENTITY_CRUD_FALLBACK_PAYLOAD_BUILD_ERROR_MESSAGE)
        }
        return
      }
      createSubmitFlightRef.current.mutateCreateWithFlightLock({
        body,
        afterSuccess,
      })
    },
  })

  const formDensity = entityDefinition.crudDialogFormDensity ?? "default"
  const isCompact = formDensity === "compact"
  const formValues = useStore(form.store, (s) => s.values as AdminEntityStringMapForm)
  const hasClientSubmitAlert =
    clientSubmitValidatorMessage != null ||
    (clientPayloadFieldIssues != null && clientPayloadFieldIssues.length > 0)
  const relationFieldOptions = useAdminEntityCrudRelationFieldOptionsMerged(
    slug,
    "create",
    crudListRelationFieldOptions,
    formValues,
  )

  const compactCreateReadOnly =
    compactVpCreate && compactLocksEditingCreate
  const formBodyInteractionsLocked =
    adminUiMutationsDisabled || compactCreateReadOnly
  const interactionLockedFromChildSources = useAdminCrudFormInteractionLocked()
  const createFooterLocked = formBodyInteractionsLocked || createMutationInFlight
  const createSubmitExtraLocked = interactionLockedFromChildSources
  const trimmedPrimaryCreateLabel = createPrimarySubmitLabel?.trim()
  const primaryCreateIdleLabel =
    trimmedPrimaryCreateLabel != null && trimmedPrimaryCreateLabel !== ""
      ? trimmedPrimaryCreateLabel
      : "Create"

  const showFooterCancel = !compactVpCreate
  const showCreateSubmit = !adminUiMutationsDisabled && !compactCreateReadOnly
  const showCreateAndAddNew = createFooterMode !== "singleCreate"
  const createPrimaryAction = entityDefinition.createFormPrimarySubmitAction ?? "create"
  const whichCreateSubmit: "addNew" | "close" | "create" =
    createPrimaryAction === "createAndAddNew" && showCreateAndAddNew
      ? "addNew"
      : createPrimaryAction === "createAndClose"
        ? "close"
        : "create"

  const fieldChangeEffect = crudFormFieldChangeEffectBySlug?.[slug]
  const chainFieldChange = useMemo(
    () => (fieldKey: string, handleChange: (v: string) => void) =>
      chainAdminCrudFieldStringChange(
        fieldChangeEffect,
        {
          variant: "create",
          slug,
          form: form as unknown as AdminEntityCrudFormSubscribeApi,
        },
        fieldKey,
        handleChange,
      ),
    [fieldChangeEffect, slug, form],
  )

  const { mutationErrorSuppressed: createMutationErrorSuppressed } =
    useAdminCrudServerFieldErrors({
      variant: "create",
      isError: createMutation.isError,
      error: createMutation.error,
      isPending: createMutation.isPending,
      entityDefinition,
      mapper: crudFormServerErrorToFieldErrorsBySlug?.[slug],
      form,
    })

  const { mainCols: colsExcludingDeferred, deferredCols } = useMemo(
    () => partitionCrudDeferredColumns(createCols, entityDefinition),
    [createCols, entityDefinition],
  )

  const { mainCols, sideManyCols } = useMemo(
    () =>
      partitionAdminEntityCrudColumnsMainAndManyRelationSide(
        slug,
        colsExcludingDeferred,
        adminEntities,
      ),
    [slug, colsExcludingDeferred, adminEntities],
  )
  const hasSideMany = sideManyCols.length > 0

  const groupedKeySet = useMemo(
    () =>
      new Set(
        entityDefinition.crudFormGroups?.flatMap((g) => [...g.columnKeys]) ??
          [],
      ),
    [entityDefinition],
  )
  const hasFormGroups = groupedKeySet.size > 0

  const colsForMainGrid = hasSideMany ? mainCols : colsExcludingDeferred
  const colsForUngroupedGrid = hasFormGroups
    ? colsForMainGrid.filter((c) => !groupedKeySet.has(c.key))
    : colsForMainGrid
  const visibleColsForUngroupedGrid = useMemo(
    () => colsForUngroupedGrid.filter((c) => adminEntityColumnShownInCrudForm(c, formValues)),
    [colsForUngroupedGrid, formValues],
  )

  const crudFormGridLayout = useMemo(() => {
    return buildAdminEntityCrudFormGridLayout(
      visibleColsForUngroupedGrid.map((c) => crudFormFieldGridSpan(c)),
      {
        includeMutationErrorRow:
          !hasSideMany && createMutation.isError && !adminUiMutationsDisabled && !createMutationErrorSuppressed,
      },
    )
  }, [
    visibleColsForUngroupedGrid,
    hasSideMany,
    createMutation.isError,
    adminUiMutationsDisabled,
    createMutationErrorSuppressed,
  ])

  const resolvedFormGroups = useMemo(
    () => buildAdminEntityCrudFormGroupPartition(colsForMainGrid, entityDefinition).groups,
    [colsForMainGrid, entityDefinition],
  )
  const formGroupsMode = entityDefinition.crudFormGroupsMode ?? "sections"

  const hasCrudRelatedCollections =
    (entityDefinition.crudRelatedCollections?.length ?? 0) > 0

  const wideGrid = useAdminCrudFormWideGridLayout()
  const crudFormGridStyle: CSSProperties = {
    gridTemplateAreas: wideGrid
      ? crudFormGridLayout.gridTemplateAreasWide
      : crudFormGridLayout.gridTemplateAreasNarrow,
    gridTemplateColumns: wideGrid
      ? ADMIN_ENTITY_CRUD_FORM_GRID_TEMPLATE_COLUMNS_WIDE
      : "1fr",
  }

  const splitWide = wideGrid && hasSideMany

  const customFormBody =
    renderCrudDialogFormBody?.({
      slug,
      variant: "create",
      entityRowId: null,
      entityDefinition,
      isCompact,
      form: form as unknown as NonNullable<AdminRenderCrudFormAfterMainFieldsArgs["form"]>,
      crudListRelationFieldOptions: relationFieldOptions,
    }) ?? null

  const afterMainFieldsRawCreate =
    renderCrudFormAfterMainFields?.({
      slug,
      variant: "create",
      entityRowId: null,
      form: form as unknown as NonNullable<
        AdminRenderCrudFormAfterMainFieldsArgs["form"]
      >,
      crudDeferredFieldCols: deferredCols,
    }) ?? null

  const afterMainFieldsResolvedCreate =
    afterMainFieldsRawCreate != null && deferredCols.length > 0 ? (
      <div
        className={cn(
          "shrink-0 border-t border-border/80",
          isCompact ? "px-3 py-2" : "px-4 py-3",
        )}
        data-testid={`admin-entity-crud-after-main-fields-deferred--create--${slug}`}
      >
        {afterMainFieldsRawCreate}
      </div>
    ) : (
      afterMainFieldsRawCreate
    )

  const afterMainFieldsSideRailCreate =
    customFormBody == null &&
    crudFormAfterMainFieldsSideRailSlugs?.has(slug) === true &&
    afterMainFieldsResolvedCreate != null

  const renderCreateField = useMemo(
    () =>
      createAdminEntityCreateCrudRenderCreateField({
        slug,
        adminEntities,
        form: form as AdminEntityCreateCrudRenderCreateFieldDeps["form"],
        renderCrudFormComputedField,
        relationFieldOptions,
        chainFieldChange,
        formValues,
        isCompact,
      }),
    [
      slug,
      adminEntities,
      form,
      renderCrudFormComputedField,
      relationFieldOptions,
      chainFieldChange,
      formValues,
      isCompact,
    ],
  )

  const mainFieldsGrid = (
    <div
      className={
        splitWide
          ? cn("grid min-w-0", isCompact ? "gap-2" : "gap-4")
          : cn(
              ADMIN_ENTITY_CRUD_FORM_FIELDS_GRID_CLASS,
              isCompact && "admin-entity-crud-form-fields-grid--compact",
            )
      }
      data-testid={`admin-entity-crud-main-fields-grid--create--${slug}`}
      style={crudFormGridStyle}
    >
      {visibleColsForUngroupedGrid.map((col, fieldIndex) =>
        renderCreateField(col, {
          gridArea: crudFormGridLayout.fieldAreaNames[fieldIndex] ?? "auto",
        }),
      )}
      {!hasSideMany && hasClientSubmitAlert ? (
        <div
          className="min-w-0"
          style={{ gridArea: ADMIN_ENTITY_CRUD_MUTATION_ERROR_GRID_AREA }}
        >
          {clientPayloadFieldIssues?.length ? (
            <AdminEntityCrudPayloadIssuesAlert slug={slug} issues={clientPayloadFieldIssues} />
          ) : (
            <p
              className="min-w-0 text-sm text-destructive"
              role="alert"
              data-testid={`admin-entity-crud-client-validation-error--${slug}`}
            >
              {clientSubmitValidatorMessage}
            </p>
          )}
        </div>
      ) : null}
      {!hasSideMany && createMutation.isError && !createMutationErrorSuppressed ? (
        <p
          className="min-w-0 text-sm text-destructive"
          style={{ gridArea: ADMIN_ENTITY_CRUD_MUTATION_ERROR_GRID_AREA }}
          role="alert"
          data-testid={`admin-entity-create-error--${slug}`}
        >
          {formatUnknownErrorMessage(createMutation.error)}
        </p>
      ) : null}
    </div>
  )

  const sideManyFieldNodes = sideManyCols.map((col) => (
    <form.Field
      key={col.key}
      name={col.key}
      validators={{
        onSubmit: () => undefined,
      }}
    >
      {(field) => (
        <div
          className={cn(
            ADMIN_ENTITY_CRUD_FIELD_CELL_CLASS,
            splitWide ? "min-h-0 flex-1" : null,
          )}
          data-testid={`admin-entity-create-field--${slug}--${col.key}`}
        >
          <Label>{adminEntityColumnFormLabel(col)}</Label>
          {relationFieldOptions[col.key] != null ? (
            <AdminEntityCrudManyRelationCheckboxControl
              variant="create"
              slug={slug}
              col={col}
              value={field.state.value}
              onChange={chainFieldChange(col.key, field.handleChange)}
              options={relationFieldOptions[col.key]!.options}
              optionsPending={
                relationFieldOptions[col.key]!.optionsPending
              }
              layout={splitWide ? "sideRail" : "default"}
            />
          ) : null}
          <div className={ADMIN_ENTITY_CRUD_FIELD_ERROR_FOOTER_CLASS}>
            {!field.state.meta.isValid ? (
              <p
                className="text-sm text-destructive"
                role="alert"
                data-testid={`admin-entity-create-field-error--${slug}--${col.key}`}
              >
                {fieldErrorsText(field.state.meta.errors)}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </form.Field>
  ))

  const mutationErrorBlock =
    hasSideMany &&
    ((createMutation.isError && !createMutationErrorSuppressed) || hasClientSubmitAlert) ? (
      <>
        {hasClientSubmitAlert ? (
          clientPayloadFieldIssues?.length ? (
            <AdminEntityCrudPayloadIssuesAlert slug={slug} issues={clientPayloadFieldIssues} />
          ) : (
            <p
              className="min-w-0 text-sm text-destructive"
              role="alert"
              data-testid={`admin-entity-crud-client-validation-error--${slug}`}
            >
              {clientSubmitValidatorMessage}
            </p>
          )
        ) : null}
        {createMutation.isError && !createMutationErrorSuppressed ? (
          <p
            className="min-w-0 text-sm text-destructive"
            role="alert"
            data-testid={`admin-entity-create-error--${slug}`}
          >
            {formatUnknownErrorMessage(createMutation.error)}
          </p>
        ) : null}
      </>
    ) : null

  const defaultMainBody = hasSideMany ? (
    splitWide ? (
      <div
        className={cn(
          "min-w-0",
          isCompact ? "space-y-2 p-3" : "space-y-4 p-4",
        )}
        data-testid={`admin-entity-crud-default-main--create--${slug}`}
      >
        <div
          className={cn(
            "grid min-h-[min(50vh,26rem)] w-full items-stretch",
            isCompact ? "gap-2" : "gap-4",
          )}
          style={{
            gridTemplateColumns:
              ADMIN_ENTITY_CRUD_FORM_SIDE_MANY_RELATION_GRID_TEMPLATE_COLUMNS,
          }}
        >
          {mainFieldsGrid}
          <aside
            className={cn(
              "flex min-h-0 min-w-0 flex-col border-l border-border/60 bg-muted/10",
              isCompact ? "gap-2 pl-3" : "gap-4 pl-4",
            )}
            data-testid={`admin-entity-crud-many-relation-side--${slug}`}
          >
            {sideManyFieldNodes}
          </aside>
        </div>
        {mutationErrorBlock}
      </div>
    ) : (
      <div
        className={cn(
          "min-w-0",
          isCompact ? "space-y-2 p-3" : "space-y-4 p-4",
        )}
        data-testid={`admin-entity-crud-default-main--create--${slug}`}
      >
        {mainFieldsGrid}
        <div
          className={cn(
            "border-t border-border/80",
            isCompact ? "pt-2" : "pt-4",
          )}
          data-testid={`admin-entity-crud-many-relation-side--${slug}`}
        >
          {sideManyFieldNodes}
        </div>
        {mutationErrorBlock}
      </div>
    )
  ) : (
    mainFieldsGrid
  )

  return (
    <form
      ref={formRef}
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        isCompact && "admin-entity-crud-dialog-form--compact",
      )}
      data-testid={`admin-entity-create-form--${slug}`}
      autoComplete="off"
      aria-busy={formBodyInteractionsLocked}
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <DialogHeader
        className={cn(
          "shrink-0 border-b border-border/80",
          isCompact ? "gap-1 px-3 pt-3 pb-2" : "px-4 pt-4 pb-3",
        )}
        data-testid={`admin-entity-crud-dialog-header--create--${slug}`}
      >
        <DialogTitle
          className={cn(isCompact && "text-base")}
          data-testid={`admin-entity-create-dialog-title--${slug}`}
        >
          {addCardTitle}
        </DialogTitle>
        <DialogDescription
          className="sr-only"
          data-testid={`admin-entity-crud-dialog-description--create--${slug}`}
        >
          Create a row in{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            {schemaSqlName}
          </code>
          .
        </DialogDescription>
      </DialogHeader>
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          afterMainFieldsSideRailCreate
            ? "overflow-y-auto overflow-x-hidden scrollbar-galaxy md:overflow-hidden"
            : hasCrudRelatedCollections
              ? "overflow-y-auto overflow-x-hidden scrollbar-galaxy"
              : "scrollbar-galaxy overflow-y-auto overflow-x-hidden",
        )}
        data-testid={`admin-entity-crud-dialog-body--create--${slug}`}
      >
        <fieldset
          disabled={formBodyInteractionsLocked}
          data-testid={`admin-entity-crud-form-body-fieldset--${slug}`}
          className={cn(
            "min-w-0 flex flex-col border-0 p-0",
            !hasCrudRelatedCollections && "flex-1 min-h-0",
            afterMainFieldsSideRailCreate && "md:min-h-0",
            formBodyInteractionsLocked && "opacity-65",
          )}
        >
          <legend className="sr-only">Row fields</legend>
          {customFormBody != null ? (
            <>
              <div
                className="scrollbar-galaxy flex min-h-0 flex-1 flex-col overflow-y-auto"
                data-testid={`admin-entity-crud-custom-form-scroll--create--${slug}`}
              >
                {customFormBody}
              </div>
              {hasClientSubmitAlert ? (
                clientPayloadFieldIssues?.length ? (
                  <div
                    className={cn(
                      "shrink-0 min-w-0 px-4 py-2",
                      isCompact && "px-3 py-1",
                    )}
                  >
                    <AdminEntityCrudPayloadIssuesAlert slug={slug} issues={clientPayloadFieldIssues} />
                  </div>
                ) : (
                  <p
                    className={cn(
                      "shrink-0 min-w-0 px-4 py-2 text-sm text-destructive",
                      isCompact && "px-3 py-1",
                    )}
                    role="alert"
                    data-testid={`admin-entity-crud-client-validation-error--${slug}`}
                  >
                    {clientSubmitValidatorMessage}
                  </p>
                )
              ) : !adminUiMutationsDisabled && createMutation.isError && !createMutationErrorSuppressed ? (
                <p
                  className={cn(
                    "shrink-0 min-w-0 px-4 py-2 text-sm text-destructive",
                    isCompact && "px-3 py-1",
                  )}
                  role="alert"
                  data-testid={`admin-entity-create-error--${slug}`}
                >
                  {formatUnknownErrorMessage(createMutation.error)}
                </p>
              ) : null}
            </>
          ) : (
            renderCreateFormGroups({
              slug,
              entityDefinition,
              resolvedFormGroups,
              hasFormGroups,
              formGroupsMode,
              form: form as unknown as NonNullable<AdminRenderCrudFormAfterMainFieldsArgs["form"]>,
              relationFieldOptions,
              wideGrid,
              isCompact,
              renderCrudFormGroupBody,
              renderCrudFormBeforeRelatedCollections,
              renderCreateField,
              afterMainFieldsSideRailCreate,
              defaultMainBody,
              afterMainFieldsResolvedCreate,
              adminUiMutationsDisabled,
              compactCreateReadOnly,
              promoteCreateDialogToEditFromApiRow,
            })
          )}
        </fieldset>
      </div>
      <AdminEntityCreateCrudDialogFooter
        slug={slug}
        isCompact={isCompact}
        showFooterCancel={showFooterCancel}
        showCreateSubmit={showCreateSubmit}
        showCreateAndAddNew={showCreateAndAddNew}
        whichSubmit={whichCreateSubmit}
        createFooterLocked={createFooterLocked}
        createSubmitExtraLocked={createSubmitExtraLocked}
        createMutationInFlight={createMutationInFlight}
        primaryCreateIdleLabel={primaryCreateIdleLabel}
        pendingCreateAfterSuccessRef={pendingCreateAfterSuccessRef}
        onCancel={onCancel}
        onRequestSubmit={() => void form.handleSubmit()}
      />
    </form>
  )
}
