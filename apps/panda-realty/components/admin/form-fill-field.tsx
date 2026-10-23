"use client"

import { type InputHTMLAttributes, type TextareaHTMLAttributes } from "react"
import { cn } from "@repo/ui/utils"

interface FormFieldProps {
  label: string
  children: React.ReactNode
  className?: string
}

export function FormField({ label, children, className }: FormFieldProps) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs font-medium text-foreground/70">{label}</span>
      {children}
    </label>
  )
}

type FormInputProps = InputHTMLAttributes<HTMLInputElement> & {
  "data-testid"?: string
}

export function FormInput({ className, ...props }: FormInputProps) {
  return (
    <input
      className={cn(
        "h-8 rounded border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring",
        className,
      )}
      {...props}
    />
  )
}

export function makeInputHandler(key: string, onChange: (key: string, value: string) => void) {
  return (e: React.ChangeEvent<HTMLInputElement>) => onChange(key, e.target.value)
}

type FormTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  "data-testid"?: string
}

export function FormTextarea({ className, ...props }: FormTextareaProps) {
  return (
    <textarea
      className={cn(
        "min-h-[80px] w-full rounded border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring",
        className,
      )}
      {...props}
    />
  )
}

interface FormCheckboxProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  "data-testid"?: string
}

export function FormCheckbox({ label, checked, onChange, "data-testid": testId }: FormCheckboxProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        data-testid={testId}
        className="h-4 w-4 border border-input accent-primary"
      />
      <span>{label}</span>
    </label>
  )
}

interface FormRadioProps {
  name: string
  label?: string
  options: { value: string; label: string; testid?: string }[]
  value: string
  onChange: (value: string) => void
  layout?: "row" | "col"
}

export function FormRadio({ name, label, options, value, onChange, layout = "row" }: FormRadioProps) {
  const radios = (
    <div className={layout === "col" ? "flex flex-col gap-1.5" : "flex flex-wrap gap-4"}>
      {options.map((opt) => (
        <label key={opt.value} className="flex cursor-pointer items-center gap-1.5 text-sm">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            data-testid={opt.testid}
            className="h-4 w-4 accent-primary"
          />
          <span>{opt.label}</span>
        </label>
      ))}
    </div>
  )
  if (!label) return radios
  return (
    <fieldset className="border-0 p-0 m-0">
      <legend className="sr-only">{label}</legend>
      {radios}
    </fieldset>
  )
}

interface FormSectionProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function FormSection({ title, children, className }: FormSectionProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="border-b border-border pb-1 text-xs font-semibold uppercase tracking-wider text-foreground/60">
        {title}
      </h3>
      {children}
    </div>
  )
}

interface FormCaptionProps {
  children: React.ReactNode
  "data-testid"?: string
}

export function FormCaption({ children, "data-testid": testId }: FormCaptionProps) {
  return (
    <p className="text-xs italic text-muted-foreground" data-testid={testId}>{children}</p>
  )
}
