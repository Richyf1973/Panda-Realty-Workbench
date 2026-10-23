"use client"

import { F6Caption, F6Checkbox, F6Field, F6Input, F6Radio, F6Section } from "./form6-field"

interface Props {
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}

export function Form6Part6Agency({ values, onChange }: Props) {
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange(key, e.target.value)

  const checked = (key: string) => values[key] === "true"
  const setCheck = (key: string) => (v: boolean) => onChange(key, v ? "true" : "false")

  return (
    <div className="space-y-6 p-4">
      <F6Section title="Agency type">
        <F6Caption>Tick one. The type of agency determines termination rights.</F6Caption>
        <div className="flex flex-wrap gap-4">
          <F6Checkbox
            label="Open listing"
            checked={checked("agencyTypeOpen")}
            onChange={setCheck("agencyTypeOpen")}
            data-testid="form6-part6-agency-open"
          />
          <F6Checkbox
            label="Sole agency"
            checked={checked("agencyTypeSole")}
            onChange={setCheck("agencyTypeSole")}
            data-testid="form6-part6-agency-sole"
          />
          <F6Checkbox
            label="Exclusive agency"
            checked={checked("agencyTypeExclusive")}
            onChange={setCheck("agencyTypeExclusive")}
            data-testid="form6-part6-agency-exclusive"
          />
        </div>
      </F6Section>

      <F6Section title="At the end of sole or exclusive agency">
        <F6Caption>
          At the end of the sole or exclusive agency, the parties agree that the appointment
          will continue as an open listing. (Please tick whichever is relevant.)
        </F6Caption>
        <F6Radio
          name="agencyEndAgreement"
          label="At the end of sole or exclusive agency"
          options={[
            { value: "Agree", label: "Agree" },
            { value: "Do not agree", label: "Do not agree" },
          ]}
          value={values.agencyEndAgreement ?? ""}
          onChange={(v) => onChange("agencyEndAgreement", v)}
        />
      </F6Section>

      <F6Section title="Acknowledgement — Client">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-36">
            <F6Field label="Client name">
              <F6Input data-testid="form6-part6-client-name" value={values.part6ClientName ?? ""} onChange={set("part6ClientName")} />
            </F6Field>
          </div>
          <span data-testid="form6-part6-client-and-label" className="pb-1 text-sm font-medium text-muted-foreground shrink-0">AND</span>
          <div className="flex-1 min-w-36">
            <F6Field label="Client name" hideLabel>
              <F6Input data-testid="form6-part6-client-name-2" value={values.part6ClientName2 ?? ""} onChange={set("part6ClientName2")} />
            </F6Field>
          </div>
          <span data-testid="form6-part6-client-and-label" className="pb-1 text-sm font-medium text-muted-foreground shrink-0">AND</span>
          <div className="flex-1 min-w-36">
            <F6Field label="Client name" hideLabel>
              <F6Input data-testid="form6-part6-client-name-3" value={values.part6ClientName3 ?? ""} onChange={set("part6ClientName3")} />
            </F6Field>
          </div>
        </div>
        <div className="mt-2">
          <F6Field label="Date">
            <F6Input
              type="date"
              value={values.part6ClientDate ?? ""}
              onChange={set("part6ClientDate")}
              className="w-40"
            />
          </F6Field>
        </div>
      </F6Section>

      <F6Section title="Acknowledgement — Agent">
        <div className="grid grid-cols-2 gap-2">
          <F6Field label="Agent name">
            <F6Input data-testid="form6-part6-agent-name" value={values.part6AgentName ?? ""} onChange={set("part6AgentName")} />
          </F6Field>
          <F6Field label="Date">
            <F6Input
              type="date"
              value={values.part6AgentDate ?? ""}
              onChange={set("part6AgentDate")}
            />
          </F6Field>
        </div>
      </F6Section>
    </div>
  )
}
