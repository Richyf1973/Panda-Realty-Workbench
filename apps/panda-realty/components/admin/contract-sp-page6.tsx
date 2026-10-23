"use client"

import { FormCaption, FormField, FormInput, FormSection, FormTextarea, makeInputHandler } from "./form-fill-field"

interface Props {
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}

const set = makeInputHandler

function SigningRow({
  label,
  nameKey,
  dateKey,
  witnessKey,
  testidPrefix,
  role,
  values,
  onChange,
}: {
  label: string
  nameKey: string
  dateKey: string
  witnessKey: string
  testidPrefix: string
  role: "Buyer" | "Seller"
  values: Record<string, string>
  onChange: Props["onChange"]
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-foreground/80">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        <FormField label="Name">
          <FormInput value={values[nameKey] ?? ""} onChange={set(nameKey, onChange)} data-testid={`${testidPrefix}-signing-name`} />
        </FormField>
        <FormField label="Date">
          <FormInput type="date" value={values[dateKey] ?? ""} onChange={set(dateKey, onChange)} data-testid={`${testidPrefix}-signing-date`} />
        </FormField>
        <FormField label="Witness">
          <FormInput value={values[witnessKey] ?? ""} onChange={set(witnessKey, onChange)} data-testid={`${testidPrefix}-witness`} />
        </FormField>
      </div>
      <FormCaption>By placing my signature above, I warrant that I am the {role} named in the Reference Schedule or authorised by the {role} to sign. Note: No witness is required if the {role} signs using an Electronic Signature.</FormCaption>
    </div>
  )
}

export function ContractSpPage6({ values, onChange }: Props) {
  // The resolved cooling-off days (manufactured 21/7, else 5/0) is carried into the prefill
  // values so this caption matches the "Cooling Off" special condition above. Falls back to the
  // statutory residential wording when no value is present (e.g. a blank/manual contract).
  const coolingOffDays = values.coolingOffDays?.trim()
  const coolingOffPeriodText = coolingOffDays
    ? `a statutory cooling-off period of ${coolingOffDays} day(s)`
    : "a 5 business day statutory cooling-off period"
  return (
    <div className="space-y-6 p-4">
      <FormSection title="Special Conditions">
        <FormCaption>The REIQ Terms of Contract for the Sale and Purchase of Residential Real Estate (Pages 7-18) (First Edition) contain the Terms of this Contract.</FormCaption>
        <FormField label="Special Conditions">
          <FormTextarea
            value={values.specialConditions ?? ""}
            onChange={(e) => onChange("specialConditions", e.target.value)}
            data-testid="contract-sp-page6-special-conditions"
            className="min-h-[120px]"
          />
        </FormField>
      </FormSection>

      <FormSection title="Buyer Signatures">
        <FormCaption>The contract may be subject to {coolingOffPeriodText}. A termination penalty of 0.25% of the purchase price applies if the Buyer terminates the contract during the statutory cooling-off period. It is recommended the Buyer obtain an independent property valuation and independent legal advice about the contract and his or her cooling-off rights, before signing.</FormCaption>
        <SigningRow
          label="Buyer 1"
          nameKey="buyer1SigningName"
          dateKey="buyer1SigningDate"
          witnessKey="buyer1Witness"
          testidPrefix="contract-sp-page6-buyer1"
          role="Buyer"
          values={values}
          onChange={onChange}
        />
        <SigningRow
          label="Buyer 2 (optional)"
          nameKey="buyer2SigningName"
          dateKey="buyer2SigningDate"
          witnessKey="buyer2Witness"
          testidPrefix="contract-sp-page6-buyer2"
          role="Buyer"
          values={values}
          onChange={onChange}
        />
      </FormSection>

      <FormSection title="Seller Signatures">
        <SigningRow
          label="Seller 1"
          nameKey="seller1SigningName"
          dateKey="seller1SigningDate"
          witnessKey="seller1Witness"
          testidPrefix="contract-sp-page6-seller1"
          role="Seller"
          values={values}
          onChange={onChange}
        />
        <SigningRow
          label="Seller 2 (optional)"
          nameKey="seller2SigningName"
          dateKey="seller2SigningDate"
          witnessKey="seller2Witness"
          testidPrefix="contract-sp-page6-seller2"
          role="Seller"
          values={values}
          onChange={onChange}
        />
      </FormSection>
    </div>
  )
}
