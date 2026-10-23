"use client"

import { F6Caption, F6Field, F6Input, F6Section } from "./form6-field"

interface Props {
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}

export function Form6Part3Property({ values, onChange }: Props) {
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange(key, e.target.value)

  return (
    <div className="space-y-6 p-4">
      <F6Section title="Property description">
        <F6Caption>
          Describe the property the subject of this appointment. Include the street address and
          any relevant lot/plan or title reference.
        </F6Caption>
        <F6Field label="Description 1">
          <F6Input
            value={values.propertyDescription1 ?? ""}
            onChange={set("propertyDescription1")}
            data-testid="form6-part3-description1"
          />
        </F6Field>
      </F6Section>

      <F6Section title="Address">
        <F6Field label="Address">
          <F6Input
            value={values.propertyStreetAddress ?? ""}
            onChange={set("propertyStreetAddress")}
            data-testid="form6-part3-address"
          />
        </F6Field>
        <F6Field label="Suburb">
          <F6Input
            value={values.propertySuburb ?? ""}
            onChange={set("propertySuburb")}
            data-testid="form6-part3-address-suburb"
          />
        </F6Field>
        <div className="grid grid-cols-2 gap-2">
          <F6Field label="State">
            <F6Input
              value={values.propertyState ?? ""}
              onChange={set("propertyState")}
              data-testid="form6-part3-state"
            />
          </F6Field>
          <F6Field label="Postcode">
            <F6Input
              value={values.propertyPostcode ?? ""}
              onChange={set("propertyPostcode")}
              data-testid="form6-part3-postcode"
            />
          </F6Field>
        </div>
      </F6Section>

      <F6Section title="Title details">
        <div className="grid grid-cols-3 gap-2">
          <F6Field label="Lot">
            <F6Input value={values.propertyLot ?? ""} onChange={set("propertyLot")} data-testid="form6-part3-lot" />
          </F6Field>
          <F6Field label="Plan">
            <F6Input
              value={values.propertyPlan ?? ""}
              onChange={set("propertyPlan")}
              data-testid="form6-part3-plan"
            />
          </F6Field>
          <F6Field label="Title reference">
            <F6Input
              value={values.propertyTitleReference ?? ""}
              onChange={set("propertyTitleReference")}
              data-testid="form6-part3-title-reference"
            />
          </F6Field>
        </div>
      </F6Section>
    </div>
  )
}
