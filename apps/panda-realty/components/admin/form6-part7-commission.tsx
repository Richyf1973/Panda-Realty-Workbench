"use client"

import { F6Caption, F6Checkbox, F6Field, F6Input, F6Section, F6Textarea } from "./form6-field"

interface Props {
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}

export function Form6Part7Commission({ values, onChange }: Props) {
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange(key, e.target.value)

  const checked = (key: string) => values[key] === "true"
  const setCheck = (key: string) => (v: boolean) => onChange(key, v ? "true" : "false")

  return (
    <div className="space-y-6 p-4">
      <F6Section title="Commission">
        <F6Caption>
          The client and the agent agree that the commission including GST payable for the
          service to be performed by the agent is:
        </F6Caption>
        <div className="flex items-center justify-end gap-2 mb-1">
          <span className="text-xs text-muted-foreground">PDF font size</span>
          <select
            value={values.commissionFontSize ?? "10"}
            onChange={(e) => onChange("commissionFontSize", e.target.value)}
            className="text-xs border border-border rounded px-1 py-0.5 bg-background"
            data-testid="form6-part7-commission-font-size"
          >
            {[8, 9, 10, 11, 12].map((s) => (
              <option key={s} value={String(s)}>{s}pt</option>
            ))}
          </select>
        </div>
        <F6Textarea
          value={values.commission ?? ""}
          onChange={set("commission")}
          rows={3}
          placeholder="e.g. 2.5% of the sale price"
          data-testid="form6-part7-commission"
        />
      </F6Section>

      <F6Section title="When commission is payable">
        <div className="space-y-2">
          <F6Checkbox
            label="For sales, including auctions — commission is payable if a contract is entered into and settlement of the contract occurs"
            checked={checked("commissionWhenSettlement")}
            onChange={setCheck("commissionWhenSettlement")}
          />
          <div className="flex items-center gap-2">
            <F6Checkbox
              label="Other"
              checked={checked("commissionWhenOther")}
              onChange={setCheck("commissionWhenOther")}
            />
            {checked("commissionWhenOther") && (
              <F6Input
                placeholder="Specify…"
                value={values.commissionWhenOtherText ?? ""}
                onChange={(e) => onChange("commissionWhenOtherText", e.target.value)}
                className="flex-1"
              />
            )}
          </div>
        </div>
      </F6Section>

      <F6Section title="For all other types of appointments">
        <F6Field label="Commission payable when:">
          <F6Input
            value={values.commissionOtherAppointments ?? ""}
            onChange={(e) => onChange("commissionOtherAppointments", e.target.value)}
          />
        </F6Field>
      </F6Section>
    </div>
  )
}
