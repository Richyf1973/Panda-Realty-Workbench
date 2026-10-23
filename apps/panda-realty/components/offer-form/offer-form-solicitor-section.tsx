"use client"

import { FormField, inputClass } from "./offer-form-shared"

interface OfferFormSolicitorSectionProps {
  solicitorName: string
  setSolicitorName: (v: string) => void
  solicitorPhone: string
  setSolicitorPhone: (v: string) => void
  solicitorAddress: string
  setSolicitorAddress: (v: string) => void
  solicitorEmail: string
  setSolicitorEmail: (v: string) => void
  emailError?: string
}

export function OfferFormSolicitorSection({
  solicitorName,
  setSolicitorName,
  solicitorPhone,
  setSolicitorPhone,
  solicitorAddress,
  setSolicitorAddress,
  solicitorEmail,
  setSolicitorEmail,
  emailError,
}: OfferFormSolicitorSectionProps) {
  return (
    <section data-testid="offer-form-solicitor-section">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="Solicitor's Name">
          <input
            type="text"
            value={solicitorName}
            onChange={(e) => setSolicitorName(e.target.value)}
            className={inputClass()}
            data-testid="offer-form-solicitor-name"
          />
        </FormField>
        <FormField label="Solicitor's Phone">
          <input
            type="tel"
            value={solicitorPhone}
            onChange={(e) => setSolicitorPhone(e.target.value)}
            className={inputClass()}
            data-testid="offer-form-solicitor-phone"
          />
        </FormField>
        <FormField label="Solicitor's Legal Practice Address">
          <input
            type="text"
            value={solicitorAddress}
            onChange={(e) => setSolicitorAddress(e.target.value)}
            className={inputClass()}
            data-testid="offer-form-solicitor-address"
          />
        </FormField>
        <FormField label="Solicitor's Email" error={emailError}>
          <input
            type="email"
            value={solicitorEmail}
            onChange={(e) => setSolicitorEmail(e.target.value)}
            className={inputClass(emailError)}
            data-testid="offer-form-solicitor-email"
          />
        </FormField>
      </div>
    </section>
  )
}
