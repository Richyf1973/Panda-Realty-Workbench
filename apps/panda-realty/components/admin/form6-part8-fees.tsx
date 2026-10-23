"use client"

import { F6Caption, F6Field, F6Input, F6Section, F6Textarea } from "./form6-field"

interface Props {
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}

export function Form6Part8Fees({ values, onChange }: Props) {
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange(key, e.target.value)

  return (
    <div className="space-y-6 p-4">
      <F6Section title="Section 1 — Advertising and marketing expenses">
        <F6Caption>
          The client authorises the agent to incur the following advertising and marketing
          expenses in relation to the performance of the service/s.
        </F6Caption>
        <div className="flex items-center justify-end gap-2 mb-1">
          <span className="text-xs text-muted-foreground">PDF font size</span>
          <select
            value={values.advertisingTextFontSize ?? "10"}
            onChange={(e) => onChange("advertisingTextFontSize", e.target.value)}
            className="text-xs border border-border rounded px-1 py-0.5 bg-background"
            data-testid="form6-part8-advertising-text-font-size"
          >
            {[8, 9, 10, 11, 12].map((s) => (
              <option key={s} value={String(s)}>{s}pt</option>
            ))}
          </select>
        </div>
        <F6Textarea
          value={values.advertisingText ?? ""}
          onChange={set("advertisingText")}
          rows={2}
          placeholder="Describe authorised advertising expenses…"
          data-testid="form6-part8-advertising-text"
        />
        <div className="grid grid-cols-2 gap-2">
          <F6Field label="Authorised amount ($)">
            <F6Input value={values.advertisingAmount ?? ""} onChange={set("advertisingAmount")} data-testid="form6-part8-advertising-amount" />
          </F6Field>
          <F6Field label="When payable">
            <F6Input
              type="date"
              value={values.advertisingWhenPayable ?? ""}
              onChange={set("advertisingWhenPayable")}
            />
          </F6Field>
        </div>
      </F6Section>

      <F6Section title="Section 2 — Repairs and maintenance">
        <div className="grid grid-cols-2 gap-2">
          <F6Field label="Max value without prior approval (Residential sales)">
            <F6Input
              value={values.repairsResidentialMax ?? ""}
              onChange={set("repairsResidentialMax")}
            />
          </F6Field>
          <F6Field label="Max value without prior approval (Property management)">
            <F6Input
              value={values.repairsPropertyMgmtMax ?? ""}
              onChange={set("repairsPropertyMgmtMax")}
            />
          </F6Field>
        </div>
      </F6Section>

      <F6Section title="Section 3 — Other fees and charges">
        <F6Caption>Up to 4 additional fee items.</F6Caption>
        <div className="space-y-2">
          {([1, 2, 3, 4] as const).map((n) => (
            <div key={n} className="grid grid-cols-3 gap-2">
              <F6Field label={`Description ${n}`}>
                <F6Input
                  value={values[`otherFee${n}Desc`] ?? ""}
                  onChange={(e) => onChange(`otherFee${n}Desc`, e.target.value)}
                  data-testid={`form6-part8-other-fee${n}-desc`}
                />
              </F6Field>
              <F6Field label="Amount ($)">
                <F6Input
                  value={values[`otherFee${n}Amount`] ?? ""}
                  onChange={(e) => onChange(`otherFee${n}Amount`, e.target.value)}
                  data-testid={`form6-part8-other-fee${n}-amount`}
                />
              </F6Field>
              <F6Field label="When payable">
                <F6Input
                  value={values[`otherFee${n}When`] ?? ""}
                  onChange={(e) => onChange(`otherFee${n}When`, e.target.value)}
                />
              </F6Field>
            </div>
          ))}
        </div>
      </F6Section>

      <F6Section title="Section 4 — Agent rebates / discounts / commissions">
        <F6Caption>Disclose any rebates, discounts, or commissions received from third parties.</F6Caption>
        <div className="space-y-2">
          {([1, 2, 3, 4] as const).map((n) => (
            <div key={n} className="grid grid-cols-3 gap-2">
              <F6Field label={`Service ${n}`}>
                <F6Input
                  value={values[`rebate${n}Service`] ?? ""}
                  onChange={(e) => onChange(`rebate${n}Service`, e.target.value)}
                />
              </F6Field>
              <F6Field label="Source">
                <F6Input
                  value={values[`rebate${n}Source`] ?? ""}
                  onChange={(e) => onChange(`rebate${n}Source`, e.target.value)}
                />
              </F6Field>
              <F6Field label="Estimated amount ($)">
                <F6Input
                  value={values[`rebate${n}Amount`] ?? ""}
                  onChange={(e) => onChange(`rebate${n}Amount`, e.target.value)}
                />
              </F6Field>
            </div>
          ))}
        </div>
      </F6Section>
    </div>
  )
}
