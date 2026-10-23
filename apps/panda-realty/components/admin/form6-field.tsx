"use client"

import { type InputHTMLAttributes, type TextareaHTMLAttributes } from "react"
import { cn } from "@repo/ui/utils"

interface F6FieldProps {
  label: string
  children: React.ReactNode
  className?: string
  hideLabel?: boolean
}

export function F6Field({ label, children, className, hideLabel }: F6FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label className={cn("text-xs font-medium text-foreground/70", hideLabel && "invisible")} aria-hidden={hideLabel}>
        {label || " "}
      </label>
      {children}
    </div>
  )
}

type F6InputProps = InputHTMLAttributes<HTMLInputElement> & {
  "data-testid"?: string
}

export function F6Input({ className, ...props }: F6InputProps) {
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

type F6TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  "data-testid"?: string
}

export function F6Textarea({ className, ...props }: F6TextareaProps) {
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

interface F6CheckboxProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  "data-testid"?: string
}

export function F6Checkbox({ label, checked, onChange, "data-testid": testId }: F6CheckboxProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        data-testid={testId}
        className="h-4 w-4 rounded border border-input accent-primary"
      />
      <span>{label}</span>
    </label>
  )
}

interface F6RadioProps {
  name: string
  label?: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}

export function F6Radio({ name, label, options, value, onChange }: F6RadioProps) {
  const radios = (
    <div className="flex flex-wrap gap-4">
      {options.map((opt) => (
        <label key={opt.value} className="flex cursor-pointer items-center gap-1.5 text-sm">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
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

interface F6SectionProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function F6Section({ title, children, className }: F6SectionProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="border-b border-border pb-1 text-xs font-semibold uppercase tracking-wider text-foreground/60">
        {title}
      </h3>
      {children}
    </div>
  )
}

interface F6CaptionProps {
  children: React.ReactNode
}

export function F6Caption({ children }: F6CaptionProps) {
  return (
    <p className="text-xs italic text-muted-foreground">{children}</p>
  )
}
