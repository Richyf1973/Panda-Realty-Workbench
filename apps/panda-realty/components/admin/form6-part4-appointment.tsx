"use client"

import { F6Caption, F6Checkbox, F6Field, F6Input, F6Section, F6Textarea } from "./form6-field"

interface Props {
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}

export function Form6Part4Appointment({ values, onChange }: Props) {
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange(key, e.target.value)

  const checked = (key: string) => values[key] === "true"
  const setCheck = (key: string) => (v: boolean) => onChange(key, v ? "true" : "false")

  return (
    <div className="space-y-6 p-4">
      <F6Section title="Section 1 — Performance of service">
        <F6Caption>
          Tick all services the agent is appointed to perform.
        </F6Caption>
        <div className="flex flex-wrap gap-4">
          <F6Checkbox
            label="Sale"
            checked={checked("serviceTypeSale")}
            onChange={setCheck("serviceTypeSale")}
            data-testid="form6-part4-service-sale"
          />
          <F6Checkbox
            label="Purchase"
            checked={checked("serviceTypePurchase")}
            onChange={setCheck("serviceTypePurchase")}
            data-testid="form6-part4-service-purchase"
          />
          <F6Checkbox
            label="Letting / collection of rent / management"
            checked={checked("serviceTypeLetting")}
            onChange={setCheck("serviceTypeLetting")}
            data-testid="form6-part4-service-letting"
          />
          <div className="flex items-center gap-2">
            <F6Checkbox
              label="Auction"
              checked={checked("serviceTypeAuction")}
              onChange={setCheck("serviceTypeAuction")}
              data-testid="form6-part4-service-auction"
            />
            {checked("serviceTypeAuction") && (
              <F6Field label="Auction date">
                <F6Input
                  type="date"
                  value={values.auctionDate ?? ""}
                  onChange={set("auctionDate")}
                />
              </F6Field>
            )}
          </div>
          <div className="flex items-center gap-2">
            <F6Checkbox
              label="Other"
              checked={checked("serviceTypeOther")}
              onChange={setCheck("serviceTypeOther")}
            />
            {checked("serviceTypeOther") && (
              <F6Input
                placeholder="Specify…"
                value={values.serviceTypeOtherText ?? ""}
                onChange={(e) => onChange("serviceTypeOtherText", e.target.value)}
              />
            )}
          </div>
        </div>
      </F6Section>

      <F6Section title="Section 2 — Term of appointment">
        <F6Caption>
          A single appointment is for one specific transaction. A continuing appointment covers
          a period of time.
        </F6Caption>
        <div className="space-y-3">
          <div className="flex items-start gap-4">
            <F6Checkbox
              label="Single appointment"
              checked={checked("termTypeSingle")}
              onChange={setCheck("termTypeSingle")}
            />
            {checked("termTypeSingle") && (
              <div className="flex gap-2">
                <F6Field label="Start date">
                  <F6Input
                    type="date"
                    value={values.appointmentStartDate ?? ""}
                    onChange={set("appointmentStartDate")}
                  />
                </F6Field>
                <F6Field label="End date">
                  <F6Input
                    type="date"
                    value={values.appointmentEndDate ?? ""}
                    onChange={set("appointmentEndDate")}
                  />
                </F6Field>
              </div>
            )}
          </div>
          <div className="flex items-start gap-4">
            <F6Checkbox
              label="Continuing appointment"
              checked={checked("termTypeContinuing")}
              onChange={setCheck("termTypeContinuing")}
            />
            {checked("termTypeContinuing") && (
              <F6Field label="Start date">
                <F6Input
                  type="date"
                  value={values.continuingStartDate ?? ""}
                  onChange={set("continuingStartDate")}
                />
              </F6Field>
            )}
          </div>
        </div>
      </F6Section>

      <F6Section title="Section 3 — Price">
        <div className="flex flex-wrap gap-4 items-start">
          <F6Checkbox
            label="Reserve"
            checked={checked("priceTypeReserve")}
            onChange={setCheck("priceTypeReserve")}
          />
          <F6Checkbox
            label="List"
            checked={checked("priceTypeList")}
            onChange={setCheck("priceTypeList")}
            data-testid="form6-part4-price-list"
          />
          <F6Checkbox
            label="Letting"
            checked={checked("priceTypeLetting")}
            onChange={setCheck("priceTypeLetting")}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <F6Field label="$ amount">
            <F6Input value={values.priceAmount ?? ""} onChange={set("priceAmount")} data-testid="form6-part4-price-amount" />
          </F6Field>
          <F6Field label="Search criteria $">
            <F6Input
              value={values.priceSearchCriteria ?? ""}
              onChange={set("priceSearchCriteria")}
              data-testid="form6-part4-price-search-criteria"
            />
          </F6Field>
        </div>
      </F6Section>

      <F6Section title="Section 4 — Instructions / conditions">
        <F6Textarea
          value={values.instructions ?? ""}
          onChange={set("instructions")}
          rows={4}
          placeholder="Any special instructions or conditions…"
        />
      </F6Section>
    </div>
  )
}
