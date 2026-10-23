"use client"

import React, { type ReactNode } from "react"

export function OfferFormHeader() {
  return (
    <div
      data-testid="offer-form-header"
      className="flex flex-col items-start justify-between gap-4 border-b-4 border-emerald-500 bg-slate-900 px-8 py-7 text-white sm:flex-row sm:items-center print:hidden"
    >
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">PRO FORMA CONTRACT</h1>
        <p className="mt-1 text-xs font-medium text-slate-400 sm:text-sm">Real Estate Offer Submission Framework</p>
      </div>
      <div className="text-left sm:text-right">
        <span
          data-testid="offer-form-brand-name"
          className="block whitespace-nowrap text-2xl font-black tracking-widest text-emerald-500 sm:text-[45px]"
        >
          MY PANDA REALTY
        </span>
      </div>
    </div>
  )
}

export function OfferFormFooter() {
  return (
    <div
      data-testid="offer-form-footer"
      className="grid grid-cols-1 gap-4 border-t border-slate-800 bg-slate-950 px-8 py-5 text-[11px] text-slate-400 sm:grid-cols-2 sm:text-xs"
    >
      <div className="space-y-1">
        <strong className="block text-xs font-semibold text-slate-200">Sales Agent:</strong>
        <p>Maria Koch — Senior Relationship Associate</p>
        <p><strong>Direct Line:</strong> 0493 635 666 | <strong className="ml-1">Email:</strong> maria@mypandarealty.com.au</p>
      </div>
      <div className="space-y-1">
        <strong className="block text-xs font-semibold text-slate-200">Sales Agent:</strong>
        <p>Richard Falzon — Principal Director</p>
        <p><strong>Direct Line:</strong> 0490 456 959 | <strong className="ml-1">Email:</strong> richard@mypandarealty.com.au</p>
      </div>
    </div>
  )
}

export function SectionHeading({ number, title, variant }: { number: number; title: string; variant?: "dark" }) {
  const badgeClass =
    variant === "dark"
      ? "flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold"
      : "flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold"
  return (
    <h2 className="mb-4 flex items-center gap-2 border-b pb-2 text-lg font-bold text-slate-900">
      <span className={badgeClass}>{number}</span>
      {title}
    </h2>
  )
}

export function FormField({
  label,
  error,
  children,
}: {
  label: string | React.ReactNode
  error?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">{label}</span>
        {children}
      </label>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

export function inputClass(error?: string) {
  return `mt-1 block w-full rounded-md border p-2.5 text-sm text-gray-900 focus:border-slate-500 focus:ring-slate-500 ${
    error ? "border-red-300 bg-red-50" : "border-gray-300 bg-white"
  }`
}

export function OfferRadio({
  name, value, checked, onChange, disabled, testId, labelTestId, className, children,
}: {
  name: string
  value?: string
  checked: boolean
  onChange: () => void
  disabled?: boolean
  testId?: string
  labelTestId?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={`inline-flex items-center${disabled ? " cursor-not-allowed" : " cursor-pointer"}${className ? ` ${className}` : ""}`}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mr-2 h-4 w-4 accent-slate-900"
        data-testid={testId}
      />
      <span data-testid={labelTestId}>{children}</span>
    </label>
  )
}
