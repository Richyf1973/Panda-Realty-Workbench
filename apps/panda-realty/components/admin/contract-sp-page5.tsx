"use client"

import { FormCaption, FormField, FormInput, FormSection, FormTextarea, makeInputHandler } from "./form-fill-field"

interface Props {
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}

const set = makeInputHandler

const COMMUNITY_TITLES_CAPTIONS: Record<string, string> = {
  a: "Name of body corporate manager",
  b: "Body corporate file/reference number",
  c: "Contact phone number",
  d: "Amount of levies per instalment",
  e: "Frequency of levy instalments",
  f: "Date of last instalment",
  g: "Arrears (if any)",
}

const BUILDING_UNITS_LABELS: Record<string, string> = {
  a: "(a) By-law changes",
  b: "(b) Unapproved improvements",
  c: "(c) Encumbrances on common property",
  d: "(d) Other matters affecting the lot",
}

export function ContractSpPage5({ values, onChange }: Props) {
  return (
    <div className="space-y-6 p-4">
      <FormSection title="Lots in a Community Titles Scheme (complete if applicable)">
        <div className="grid grid-cols-1 gap-3">
          {(["a", "b", "c", "d", "e", "f", "g"] as const).map((letter) => {
            const key = `communityTitles${letter.toUpperCase()}`
            const caption = COMMUNITY_TITLES_CAPTIONS[letter]
            return (
              <div key={letter} className="space-y-1">
                <FormCaption data-testid={`contract-sp-page5-community-titles-caption-${letter}`}>
                  ({letter}) {caption}
                </FormCaption>
                <FormTextarea
                  value={(values[key] as string) ?? ""}
                  onChange={(e) => onChange(key, e.target.value)}
                  data-testid={`contract-sp-page5-community-titles-${letter}`}
                  className="min-h-[48px]"
                />
              </div>
            )
          })}
          <FormField label="Records Inspection Date">
            <FormInput
              type="date"
              value={values.recordsInspectionDate ?? ""}
              onChange={set("recordsInspectionDate", onChange)}
              data-testid="contract-sp-page5-records-inspection-date"
            />
          </FormField>
          <FormCaption>If &apos;Records Inspection Date&apos; is not completed, the contract is not subject to a satisfactory inspection of records and clause 12.3 does not apply.</FormCaption>
        </div>
      </FormSection>

      <FormSection title="Lots in a Building Unit and Group Title Parcel (complete if applicable)">
        <div className="grid grid-cols-1 gap-2">
          {(["a", "b", "c", "d"] as const).map((letter) => {
            const key = `buildingUnitsNotice${letter.toUpperCase()}`
            return (
              <FormField key={letter} label={BUILDING_UNITS_LABELS[letter]}>
                <FormTextarea
                  value={(values[key] as string) ?? ""}
                  onChange={(e) => onChange(key, e.target.value)}
                  data-testid={`contract-sp-page5-building-units-notice-${letter}`}
                  className="min-h-[48px]"
                />
              </FormField>
            )
          })}
          <FormField label="Building Units Inspection Date">
            <FormInput
              type="date"
              value={values.buildingUnitsInspectionDate ?? ""}
              onChange={set("buildingUnitsInspectionDate", onChange)}
              data-testid="contract-sp-page5-building-units-inspection-date"
            />
          </FormField>
          <FormCaption>If &apos;Records Inspection Date&apos; is not completed, the contract is not subject to a satisfactory inspection of records and clause 13.3 does not apply.</FormCaption>
        </div>
      </FormSection>
    </div>
  )
}
