"use client"

import { Input } from "@repo/ui/input"
import { Label } from "@repo/ui/label"
import { Textarea } from "@repo/ui/textarea"
import { AdminEntityCrudListRelationSelectControl } from "@repo/admin/components/admin/admin-entity-crud-list-relation-select-control"

import type { PandaEntitiesFormLike } from "./panda-entities-dialog-form-types"

export function PandaEntitiesFieldInput({
  form,
  name,
  label,
  required,
  type = "text",
  autoComplete,
  className,
}: {
  form: PandaEntitiesFormLike
  name: string
  label: string
  required?: boolean
  type?: string
  autoComplete?: string
  className?: string
}) {
  const htmlId = `panda-entities-form-field--${name}`
  return (
    <form.Field
      name={name}
      validators={
        required
          ? { onSubmit: ({ value }) => (value.trim() ? undefined : "Required") }
          : undefined
      }
    >
      {(field) => (
        <div className={`grid gap-1.5 ${className ?? ""}`}>
          <Label htmlFor={htmlId}>
            {label}
            {required && <span className="ml-0.5 text-destructive">*</span>}
          </Label>
          <Input
            id={htmlId}
            type={type}
            autoComplete={autoComplete}
            value={field.state.value ?? ""}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            data-testid={`panda-entities-form-field--${name}`}
          />
          {field.state.meta.errors[0] ? (
            <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
          ) : null}
        </div>
      )}
    </form.Field>
  )
}

export function PandaEntitiesFieldSelect({
  form,
  name,
  label,
  required,
  options,
  optionsPending,
  emptyChoiceLabel,
  className,
}: {
  form: PandaEntitiesFormLike
  name: string
  label: string
  required?: boolean
  options: readonly { value: string; label: string }[]
  optionsPending: boolean
  emptyChoiceLabel: string
  className?: string
}) {
  const htmlId = `panda-entities-form-select--${name}`
  return (
    <form.Field
      name={name}
      validators={
        required
          ? { onSubmit: ({ value }) => (value.trim() ? undefined : "Required") }
          : undefined
      }
    >
      {(field) => (
        <div className={`grid gap-1.5 ${className ?? ""}`}>
          <Label htmlFor={htmlId}>
            {label}
            {required && <span className="ml-0.5 text-destructive">*</span>}
          </Label>
          <AdminEntityCrudListRelationSelectControl
            htmlForId={htmlId}
            data-testid={`panda-entities-form-select--${name}`}
            ariaLabel={label}
            required={required ?? false}
            value={field.state.value ?? ""}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            emptyChoiceLabel={emptyChoiceLabel}
            baseOptions={options}
            optionsPending={optionsPending}
          />
          {field.state.meta.errors[0] ? (
            <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
          ) : null}
        </div>
      )}
    </form.Field>
  )
}

export function PandaEntitiesFieldTextarea({
  form,
  name,
  label,
  className,
}: {
  form: PandaEntitiesFormLike
  name: string
  label: string
  className?: string
}) {
  const htmlId = `panda-entities-form-field--${name}`
  return (
    <form.Field name={name}>
      {(field) => (
        <div className={`grid gap-1.5 ${className ?? ""}`}>
          <Label htmlFor={htmlId}>{label}</Label>
          <Textarea
            id={htmlId}
            value={field.state.value ?? ""}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            rows={3}
            className="resize-y"
            data-testid={`panda-entities-form-field--${name}`}
          />
        </div>
      )}
    </form.Field>
  )
}
