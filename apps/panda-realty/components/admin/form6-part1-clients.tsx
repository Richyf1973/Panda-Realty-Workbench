"use client"

import { F6Caption, F6Field, F6Input, F6Radio, F6Section } from "./form6-field"

interface Props {
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}

interface ClientSectionProps {
  num: 1 | 2 | 3
  title: string
  caption: string
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}

function ClientSection({ num, title, caption, values, onChange }: ClientSectionProps) {
  const p = `seller${num}`
  const tid = (field: string) => `form6-part1-client${num}-${field}`
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => onChange(key, e.target.value)

  return (
    <F6Section title={title}>
      <F6Caption>{caption}</F6Caption>
      <div className="grid grid-cols-2 gap-2">
        <F6Field label="Name (line 1)">
          <F6Input value={values[`${p}Name`] ?? ""} onChange={set(`${p}Name`)} data-testid={tid("name")} />
        </F6Field>
        <F6Field label="Name (line 2)">
          <F6Input value={values[`${p}NameLine2`] ?? ""} onChange={set(`${p}NameLine2`)} data-testid={tid("nameline2")} />
        </F6Field>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <F6Field label="ABN">
          <F6Input value={values[`${p}Abn`] ?? ""} onChange={set(`${p}Abn`)} data-testid={tid("abn")} />
        </F6Field>
        <F6Field label="ACN">
          <F6Input value={values[`${p}Acn`] ?? ""} onChange={set(`${p}Acn`)} data-testid={tid("acn")} />
        </F6Field>
        <F6Field label="GST registered?">
          <div data-testid={tid("gst-registered")}>
            <F6Radio
              name={`${p}Gst`}
              options={[
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ]}
              value={values[`${p}GstRegistered`] ?? ""}
              onChange={(v) => onChange(`${p}GstRegistered`, v)}
            />
          </div>
        </F6Field>
      </div>
      <F6Field label="Address (line 1)">
        <F6Input value={values[`${p}Address`] ?? ""} onChange={set(`${p}Address`)} data-testid={tid("address")} />
      </F6Field>
      <F6Field label="Address (line 2)">
        <F6Input value={values[`${p}Address2`] ?? ""} onChange={set(`${p}Address2`)} data-testid={tid("address2")} />
      </F6Field>
      <div className="grid grid-cols-3 gap-2">
        <F6Field label="Suburb">
          <F6Input value={values[`${p}Suburb`] ?? ""} onChange={set(`${p}Suburb`)} data-testid={tid("suburb")} />
        </F6Field>
        <F6Field label="State">
          <F6Input value={values[`${p}State`] ?? ""} onChange={set(`${p}State`)} data-testid={tid("state")} />
        </F6Field>
        <F6Field label="Postcode">
          <F6Input value={values[`${p}Postcode`] ?? ""} onChange={set(`${p}Postcode`)} data-testid={tid("postcode")} />
        </F6Field>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <F6Field label="Phone">
          <F6Input value={values[`${p}Phone`] ?? ""} onChange={set(`${p}Phone`)} data-testid={tid("phone")} />
        </F6Field>
        <F6Field label="Fax">
          <F6Input value={values[`${p}Fax`] ?? ""} onChange={set(`${p}Fax`)} data-testid={tid("fax")} />
        </F6Field>
        <F6Field label="Mobile">
          <F6Input value={values[`${p}Mobile`] ?? ""} onChange={set(`${p}Mobile`)} data-testid={tid("mobile")} />
        </F6Field>
      </div>
      <F6Field label="Email">
        <F6Input value={values[`${p}Email`] ?? ""} onChange={set(`${p}Email`)} data-testid={tid("email")} />
      </F6Field>
    </F6Section>
  )
}

export function Form6Part1Clients({ values, onChange }: Props) {
  return (
    <div className="flex flex-col gap-6 p-4 sm:flex-row">
      <div className="flex-1 space-y-3 min-w-0">
        <ClientSection
          num={1}
          title="Client 1"
          caption="The client is the person or entity appointing the agent to act in relation to the property."
          values={values}
          onChange={onChange}
        />
      </div>

      <div className="w-px bg-border shrink-0" />

      <div className="flex-1 space-y-3 min-w-0">
        <ClientSection
          num={2}
          title="Client 2 (optional)"
          caption="Leave blank if there is only one client."
          values={values}
          onChange={onChange}
        />
      </div>

      <div className="w-px bg-border shrink-0" />

      <div className="flex-1 space-y-3 min-w-0">
        <ClientSection
          num={3}
          title="Client 3 (optional)"
          caption="Leave blank if there is no third client."
          values={values}
          onChange={onChange}
        />
      </div>
    </div>
  )
}
