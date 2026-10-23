import type { CSSProperties, ReactNode } from "react"

import { Label } from "@repo/ui/label"

import { AdminEntityCrudBooleanSwitchControl } from "./admin-entity-crud-boolean-switch-control"
import { AdminEntityCrudDateStringCalendarControl } from "./admin-entity-crud-date-string-calendar-control"
import { AdminEntityCrudDateStringTextInputControl } from "./admin-entity-crud-date-string-text-input-control"
import { AdminEntityCrudDateStringYearMonthControl } from "./admin-entity-crud-date-string-year-month-control"
import { AdminEntityCrudListRelationAsyncSearchControl } from "./admin-entity-crud-list-relation-async-search-control"
import { AdminEntityCrudListRelationSelectControl } from "./admin-entity-crud-list-relation-select-control"
import { AdminEntityCrudManyRelationCheckboxControl } from "./admin-entity-crud-many-relation-checkbox-control"
import { AdminEntityCrudStringControl } from "./admin-entity-crud-string-control"
import { AdminEntityCrudTimestampCalendarControl } from "./admin-entity-crud-timestamp-calendar-control"
import { adminEntityColumnFormLabel } from "../../admin-entity-column-form-label"
import type {
  AdminCrudFormComputedFieldRenderArgs,
} from "../../admin-client-registry-context"
import type { AdminEntityCrudFormSubscribeApi } from "../../admin-entity-crud-form-subscribe-api"
import type { AdminEntityCrudListRelationFieldOptionsMap } from "../../admin-entity-crud-relation-field-options-types"
import { adminEntityColumnShowsManyRelationForm } from "../../admin-entity-many-relation-form"
import { adminEntityColumnTreatsAsBoolean } from "../../admin-entity-list-cell"
import {
  ADMIN_ENTITY_CRUD_FIELD_CELL_CLASS,
  ADMIN_ENTITY_CRUD_FIELD_ERROR_FOOTER_CLASS,
} from "../../admin-entity-form-grid"
import { adminEntityListRelationUsesCrudAsyncSearch } from "../../admin-entity-list-relation-crud-async"
import type { AdminEntityColumn, AdminEntityDefinition } from "../../admin-entity-types"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import { fieldErrorsText } from "../../field-errors-text"
import {
  type AdminEntityStringMapForm,
  adminEntityFieldRequiredOnEdit,
  adminEntityCrudRelationFilterSelections,
} from "./admin-entity-crud-form-column-utils"
import { adminEntityCrudRelationSelectDisabledByFormScope } from "./use-admin-entity-crud-relation-field-options-merged"
import type { AdminEntityCrudFormFieldApi } from "./admin-entity-crud-form-field-api"

export type AdminEntityEditCrudRenderEditFieldDeps = {
  slug: AdminEntitySlug
  adminEntities: Readonly<Record<string, AdminEntityDefinition>>
  form: AdminEntityCrudFormFieldApi
  renderCrudFormComputedField?: (
    args: AdminCrudFormComputedFieldRenderArgs,
  ) => ReactNode | null | undefined
  relationFieldOptions: AdminEntityCrudListRelationFieldOptionsMap
  chainFieldChange: (
    fieldKey: string,
    handleChange: (v: string) => void,
  ) => (v: string) => void
  formValues: AdminEntityStringMapForm
  effectiveViewOnly: boolean
  isCompact: boolean
  listDetailSeed?: Record<string, unknown>
  /**
   * Raw **GET** row (e.g. nested line open) — list-relation embeds (`inventory`) for
   * {@link AdminEntityCrudListRelationAsyncSearchControl} without a second label fetch.
   */
  editDetailSourceRow?: Record<string, unknown> | null
  rowId: string
}

export function createAdminEntityEditCrudRenderEditField(
  deps: AdminEntityEditCrudRenderEditFieldDeps,
): (col: AdminEntityColumn, wrapperStyle: CSSProperties) => ReactNode {
  const {
    slug,
    adminEntities,
    form,
    renderCrudFormComputedField,
    relationFieldOptions,
    chainFieldChange,
    formValues,
    effectiveViewOnly,
    isCompact,
    listDetailSeed,
    editDetailSourceRow = null,
    rowId,
  } = deps

  return function renderEditField(
    col: AdminEntityColumn,
    wrapperStyle: CSSProperties,
  ): ReactNode {
    if (
      col.crudFormVirtual &&
      col.formComputedDisplay &&
      renderCrudFormComputedField
    ) {
      const computed = renderCrudFormComputedField({
        variant: "edit",
        slug,
        col,
        form: deps.form as unknown as AdminEntityCrudFormSubscribeApi,
        listDetailSeed,
        anchorPayrollRowId: rowId ?? null,
        crudListRelationFieldOptions: relationFieldOptions,
      })
      if (computed != null) {
        const hidden = col.formGridSpan === 0
        return (
          <div
            key={col.key}
            className={hidden ? undefined : ADMIN_ENTITY_CRUD_FIELD_CELL_CLASS}
            style={hidden ? { display: "none" } : wrapperStyle}
            data-testid={`admin-entity-edit-field--${slug}--${col.key}`}
          >
            {computed}
          </div>
        )
      }
    }
    const isBool = adminEntityColumnTreatsAsBoolean(col)
    const isMany = adminEntityColumnShowsManyRelationForm(slug, col, adminEntities)
    return (
      <form.Field
        key={col.key}
        name={col.key}
        validators={{
          onSubmit: ({ value }) => {
            if (col.crudEditReadOnly === true) return undefined
            if (isBool || isMany) return undefined
            const t = value.trim()
            if (!col.patchEmptyClears && !t) return "Required"
            return undefined
          },
        }}
      >
        {(field) => (
          <div
            className={ADMIN_ENTITY_CRUD_FIELD_CELL_CLASS}
            style={wrapperStyle}
            data-testid={`admin-entity-edit-field--${slug}--${col.key}`}
          >
            <Label
              htmlFor={
                isMany ? undefined : col.formInputId ?? `dialog-edit-${col.key}`
              }
            >
              {adminEntityColumnFormLabel(col)}
              {adminEntityFieldRequiredOnEdit(col, isBool) ? (
                <span className="text-destructive" aria-hidden>
                  {" "}
                  *
                </span>
              ) : null}
            </Label>
            {isBool ? (
              <AdminEntityCrudBooleanSwitchControl
                variant="edit"
                slug={slug}
                col={col}
                htmlForId={col.formInputId ?? `dialog-edit-${col.key}`}
                value={field.state.value}
                onChange={chainFieldChange(col.key, field.handleChange)}
                onBlur={field.handleBlur}
                readOnly={
                  effectiveViewOnly ||
                  col.formControlReadOnly === true ||
                  col.crudEditReadOnly === true
                }
              />
            ) : isMany && relationFieldOptions[col.key] != null ? (
              <AdminEntityCrudManyRelationCheckboxControl
                variant="edit"
                slug={slug}
                col={col}
                value={field.state.value}
                onChange={chainFieldChange(col.key, field.handleChange)}
                options={relationFieldOptions[col.key]!.options}
                optionsPending={relationFieldOptions[col.key]!.optionsPending}
                readOnly={effectiveViewOnly}
              />
            ) : col.listRelation &&
              adminEntityListRelationUsesCrudAsyncSearch(col) ? (
              <AdminEntityCrudListRelationAsyncSearchControl
                col={col}
                htmlForId={col.formInputId ?? `dialog-edit-${col.key}`}
                data-testid={`admin-entity-edit-relation-async--${slug}--${col.key}`}
                ariaLabel={adminEntityColumnFormLabel(col)}
                required={adminEntityFieldRequiredOnEdit(col, isBool)}
                value={field.state.value}
                onChange={chainFieldChange(col.key, field.handleChange)}
                onBlur={field.handleBlur}
                emptyChoiceLabel={col.patchEmptyClears ? "None" : "Select…"}
                allowClear={col.patchEmptyClears === true}
                disabled={
                  effectiveViewOnly ||
                  adminEntityCrudRelationSelectDisabledByFormScope(
                    col,
                    formValues,
                  )
                }
                compact={isCompact}
                relationDetailEmbed={(() => {
                  const k = col.listRelation?.embedJsonKey
                  if (k == null || editDetailSourceRow == null) return undefined
                  const raw = editDetailSourceRow[k]
                  if (
                    raw == null ||
                    typeof raw !== "object" ||
                    Array.isArray(raw)
                  ) {
                    return undefined
                  }
                  return raw as Record<string, unknown>
                })()}
                preloadedOptions={
                  col.listRelation?.crudFormUiVariant === "preloadedSearch"
                    ? relationFieldOptions[col.key]?.options
                    : undefined
                }
                relationPreloadPending={
                  col.listRelation?.crudFormUiVariant === "preloadedSearch"
                    ? relationFieldOptions[col.key]?.optionsPending
                    : undefined
                }
                relationFilterSelections={adminEntityCrudRelationFilterSelections(col, formValues)}
              />
            ) : col.listRelation && relationFieldOptions[col.key] != null ? (
              <AdminEntityCrudListRelationSelectControl
                htmlForId={col.formInputId ?? `dialog-edit-${col.key}`}
                data-testid={`admin-entity-edit-relation-select--${slug}--${col.key}`}
                ariaLabel={adminEntityColumnFormLabel(col)}
                required={adminEntityFieldRequiredOnEdit(col, isBool)}
                value={field.state.value}
                onChange={chainFieldChange(col.key, field.handleChange)}
                onBlur={field.handleBlur}
                emptyChoiceLabel={col.patchEmptyClears ? "None" : "Select…"}
                baseOptions={relationFieldOptions[col.key]!.options}
                optionsPending={relationFieldOptions[col.key]!.optionsPending}
                disabled={
                  effectiveViewOnly ||
                  adminEntityCrudRelationSelectDisabledByFormScope(
                    col,
                    formValues,
                  )
                }
                triggerShowIdOnly={
                  col.listRelation?.crudSelectTriggerShowIdOnly === true
                }
              />
            ) : col.valueType === "text" &&
              col.dateStringFormControl === "yearMonthEnd" ? (
              <AdminEntityCrudDateStringYearMonthControl
                variant="edit"
                slug={slug}
                col={col}
                htmlForId={col.formInputId ?? `dialog-edit-${col.key}`}
                value={field.state.value}
                onChange={chainFieldChange(col.key, field.handleChange)}
                onBlur={field.handleBlur}
                required={adminEntityFieldRequiredOnEdit(col, isBool)}
                readOnly={
                  effectiveViewOnly ||
                  col.crudEditReadOnly === true
                }
              />
            ) : col.valueType === "text" &&
              col.dateStringFormControl === "calendar" ? (
              <AdminEntityCrudDateStringCalendarControl
                variant="edit"
                slug={slug}
                col={col}
                htmlForId={col.formInputId ?? `dialog-edit-${col.key}`}
                value={field.state.value}
                onChange={chainFieldChange(col.key, field.handleChange)}
                onBlur={field.handleBlur}
                required={adminEntityFieldRequiredOnEdit(col, isBool)}
                readOnly={
                  effectiveViewOnly ||
                  col.crudEditReadOnly === true
                }
              />
            ) : col.valueType === "text" &&
              col.dateStringFormControl === "textInput" ? (
              <AdminEntityCrudDateStringTextInputControl
                variant="edit"
                slug={slug}
                col={col}
                htmlForId={col.formInputId ?? `dialog-edit-${col.key}`}
                value={field.state.value}
                onChange={chainFieldChange(col.key, field.handleChange)}
                onBlur={field.handleBlur}
                required={adminEntityFieldRequiredOnEdit(col, isBool)}
                readOnly={
                  effectiveViewOnly ||
                  col.crudEditReadOnly === true
                }
              />
            ) : col.valueType === "timestamp" &&
              col.timestampFormControl === "calendar" ? (
              <AdminEntityCrudTimestampCalendarControl
                variant="edit"
                slug={slug}
                col={col}
                htmlForId={col.formInputId ?? `dialog-edit-${col.key}`}
                value={field.state.value}
                onChange={chainFieldChange(col.key, field.handleChange)}
                onBlur={field.handleBlur}
                required={adminEntityFieldRequiredOnEdit(col, isBool)}
                readOnly={effectiveViewOnly}
              />
            ) : (
              <AdminEntityCrudStringControl
                slug={slug}
                col={col}
                variant="edit"
                htmlForId={col.formInputId ?? `dialog-edit-${col.key}`}
                fieldName={field.name}
                required={adminEntityFieldRequiredOnEdit(col, isBool)}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={chainFieldChange(col.key, field.handleChange)}
                readOnly={
                  effectiveViewOnly ||
                  col.formControlReadOnly === true ||
                  col.crudEditReadOnly === true
                }
              />
            )}
            <div className={ADMIN_ENTITY_CRUD_FIELD_ERROR_FOOTER_CLASS}>
              {!field.state.meta.isValid ? (
                <p
                  className="text-sm text-destructive"
                  role="alert"
                  data-testid={`admin-entity-edit-field-error--${slug}--${col.key}`}
                >
                  {fieldErrorsText(field.state.meta.errors)}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </form.Field>
    )
  }
}
