"use client"

import { Input } from "@repo/ui/input"
import { Textarea } from "@repo/ui/textarea"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@repo/ui/input-group"
import { cn } from "@repo/ui/utils"
import {
  AdminEntityCrudCurrencyAmountTextInput,
  AdminEntityCrudPlainDecimalAmountTextInput,
} from "./admin-entity-crud-currency-amount-input"
import { AdminEntityCrudIntegerSelectControl } from "./admin-entity-crud-integer-select-control"
import { AdminEntityCrudTextSelectControl } from "./admin-entity-crud-text-select-control"
import { nextCoercedAdminEntityNumericStringOnBlur } from "../../admin-entity-numeric-blur-coerce"
import {
  adminEntityIntegerInputKeyShouldPass,
  sanitizeAdminEntityIntegerInput,
  type AdminEntityIntegerInputOptions,
} from "../../admin-entity-integer-input"
import { ADMIN_ENTITY_CRUD_AUTOCOMPLETE_NOPE } from "../../admin-entity-crud-autocomplete-suppress"
import { adminEntityCrudInputHtmlProps } from "../../admin-entity-crud-input-html-props"
import { adminEntityColumnFormLabel } from "../../admin-entity-column-form-label"
import type { AdminEntityColumn } from "../../admin-entity-types"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import { adminSelectAllOnInputFocus } from "../../admin-select-all-on-input-focus"

function adminEntityCrudNumericFormInputClassName(
  col: AdminEntityColumn,
): string | undefined {
  if (col.valueType === "integer" || col.valueType === "numeric") {
    return "text-right tabular-nums"
  }
  return undefined
}

export function AdminEntityCrudStringControl({
  slug,
  col,
  variant,
  htmlForId,
  fieldName,
  required,
  value,
  onBlur,
  onChange,
  readOnly,
}: {
  slug: AdminEntitySlug
  col: AdminEntityColumn
  variant: "create" | "edit"
  htmlForId: string
  fieldName: string
  required: boolean
  value: string
  onBlur: () => void
  onChange: (next: string) => void
  readOnly?: boolean
}) {
  const handleNumericBlur = () => {
    if (readOnly !== true) {
      const next = nextCoercedAdminEntityNumericStringOnBlur(col, variant, value)
      if (next != null) onChange(next)
    }
    onBlur()
  }

  const control = col.formControl ?? "input"
  const testIdBase =
    variant === "create" ? "admin-entity-create" : "admin-entity-edit"
  const dataTestId =
    control === "textarea"
      ? `${testIdBase}-textarea--${slug}--${col.key}`
      : `${testIdBase}-input--${slug}--${col.key}`

  if (control === "textarea") {
    return (
      <Textarea
        id={htmlForId}
        name={fieldName}
        data-testid={dataTestId}
        value={value}
        onBlur={onBlur}
        onChange={(e) => {
          const v = col.textUppercaseOnChange === true
            ? e.target.value.toUpperCase()
            : e.target.value
          onChange(v)
        }}
        onFocus={readOnly === true ? undefined : adminSelectAllOnInputFocus}
        placeholder={col.placeholder}
        aria-required={required}
        autoComplete={ADMIN_ENTITY_CRUD_AUTOCOMPLETE_NOPE}
        readOnly={readOnly === true}
        aria-readonly={readOnly === true ? true : undefined}
        className={cn(
          col.inputClassName,
          readOnly === true && "bg-muted/30",
        )}
      />
    )
  }

  const currencySym =
    col.valueType === "numeric" ? col.currencySymbol?.trim() : undefined
  if (currencySym) {
    return (
      <InputGroup className={cn("w-full", col.inputClassName)}>
        <InputGroupAddon>
          <InputGroupText className="tabular-nums text-foreground">
            {currencySym}
          </InputGroupText>
        </InputGroupAddon>
        <AdminEntityCrudCurrencyAmountTextInput
          id={htmlForId}
          name={fieldName}
          data-testid={dataTestId}
          allowLeadingMinus={col.currencyAmountAllowLeadingMinus === true}
          value={value}
          onBlur={handleNumericBlur}
          onChange={onChange}
          placeholder={col.placeholder}
          aria-required={required}
          autoComplete="off"
          inputMode={col.inputMode ?? "decimal"}
          readOnly={readOnly === true}
          aria-readonly={readOnly === true ? true : undefined}
          className={cn(
            adminEntityCrudNumericFormInputClassName(col),
            readOnly === true && "bg-muted/30",
          )}
        />
      </InputGroup>
    )
  }

  if (col.valueType === "numeric" && !currencySym) {
    return (
      <AdminEntityCrudPlainDecimalAmountTextInput
        id={htmlForId}
        name={fieldName}
        data-testid={dataTestId}
        allowLeadingMinus={col.numericInputAllowLeadingMinus === true}
        value={value}
        onBlur={handleNumericBlur}
        onChange={onChange}
        placeholder={col.placeholder}
        aria-required={required}
        autoComplete="off"
        inputMode={col.inputMode ?? "decimal"}
        readOnly={readOnly === true}
        aria-readonly={readOnly === true ? true : undefined}
        className={cn(
          adminEntityCrudNumericFormInputClassName(col),
          col.inputClassName,
          readOnly === true && "bg-muted/30",
        )}
      />
    )
  }

  if (col.valueType === "integer") {
    const opts = col.integerFormOptions
    if (
      opts != null &&
      opts.length > 0 &&
      !col.listRelation &&
      col.integerInputAllowLeadingMinus !== true &&
      col.integerInputAllowCommaSeparatedQuantities !== true
    ) {
      const selectTestId =
        variant === "create"
          ? `admin-entity-create-select--${slug}--${col.key}`
          : `admin-entity-edit-select--${slug}--${col.key}`
      return (
        <AdminEntityCrudIntegerSelectControl
          htmlForId={htmlForId}
          data-testid={selectTestId}
          ariaLabel={adminEntityColumnFormLabel(col)}
          required={required}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          emptyChoiceLabel={
            col.optionalOnCreate ? "None" : "Select…"
          }
          options={opts}
          disabled={readOnly === true}
        />
      )
    }
    const intOpts: AdminEntityIntegerInputOptions | undefined =
      col.integerInputAllowCommaSeparatedQuantities === true
        ? { allowCommaSeparatedQuantities: true }
        : col.integerInputAllowLeadingMinus
          ? { allowLeadingMinus: true }
          : undefined
    return (
      <Input
        id={htmlForId}
        name={fieldName}
        data-testid={dataTestId}
        value={value}
        onBlur={handleNumericBlur}
        onChange={(e) =>
          onChange(sanitizeAdminEntityIntegerInput(e.target.value, intOpts))
        }
        onFocus={readOnly === true ? undefined : adminSelectAllOnInputFocus}
        onKeyDown={(e) => {
          if (col.integerInputAllowCommaSeparatedQuantities === true) {
            return
          }
          if (!adminEntityIntegerInputKeyShouldPass(e, intOpts)) {
            e.preventDefault()
          }
        }}
        placeholder={col.placeholder}
        aria-required={required}
        autoComplete="off"
        type="text"
        inputMode={
          col.integerInputAllowCommaSeparatedQuantities === true
            ? "text"
            : (col.inputMode ?? "numeric")
        }
        readOnly={readOnly === true}
        aria-readonly={readOnly === true ? true : undefined}
        className={cn(
          adminEntityCrudNumericFormInputClassName(col),
          col.inputClassName,
          readOnly === true && "bg-muted/30",
        )}
      />
    )
  }

  if (col.valueType === "text") {
    const txtOpts = col.textFormOptions
    if (txtOpts != null && txtOpts.length > 0 && !col.listRelation) {
      const selectTestId =
        variant === "create"
          ? `admin-entity-create-select--${slug}--${col.key}`
          : `admin-entity-edit-select--${slug}--${col.key}`
      return (
        <AdminEntityCrudTextSelectControl
          htmlForId={htmlForId}
          data-testid={selectTestId}
          ariaLabel={adminEntityColumnFormLabel(col)}
          required={required}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          emptyChoiceLabel={
            variant === "create" && col.optionalOnCreate
              ? "Default (database)"
              : "Select…"
          }
          options={txtOpts}
          disabled={readOnly === true}
        />
      )
    }
  }

  return (
    <Input
      id={htmlForId}
      name={fieldName}
      data-testid={dataTestId}
      value={value}
      onBlur={onBlur}
      onChange={(e) => {
        const v = col.textUppercaseOnChange === true
          ? e.target.value.toUpperCase()
          : e.target.value
        onChange(v)
      }}
      onFocus={readOnly === true ? undefined : adminSelectAllOnInputFocus}
      placeholder={col.placeholder}
      aria-required={required}
      autoComplete={ADMIN_ENTITY_CRUD_AUTOCOMPLETE_NOPE}
      readOnly={readOnly === true}
      aria-readonly={readOnly === true ? true : undefined}
      className={cn(
        adminEntityCrudNumericFormInputClassName(col),
        col.inputClassName,
        readOnly === true && "bg-muted/30",
      )}
      {...adminEntityCrudInputHtmlProps(col)}
    />
  )
}
