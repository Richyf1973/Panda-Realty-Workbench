"use client"

import { F6Caption, F6Field, F6Input, F6Section } from "./form6-field"

interface Props {
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}

export function Form6Part10Reappointment({ values, onChange }: Props) {
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange(key, e.target.value)

  return (
    <div className="space-y-6 p-4">
      <div className="rounded border border-border bg-muted/40 p-3 text-sm text-foreground/80 leading-relaxed">
        <p>
          A client may reappoint the same agent without completing a full new Form 6 if they
          use this reappointment section. Both parties must sign. The reappointment has the
          same terms as the original appointment unless otherwise agreed in writing.
        </p>
      </div>

      <F6Section title="Reappointment — Agent details">
        <F6Caption>
          I/we (the client) reappoint the following agent on the same terms as this appointment.
        </F6Caption>
        <div className="grid grid-cols-2 gap-2">
          <F6Field label="Agent name (line 1)">
            <F6Input value={values.reappointAgentName1 ?? ""} onChange={set("reappointAgentName1")} />
          </F6Field>
          <F6Field label="Agent name (line 2)">
            <F6Input value={values.reappointAgentName2 ?? ""} onChange={set("reappointAgentName2")} />
          </F6Field>
        </div>
        <F6Field label="Reappointment date">
          <F6Input
            type="date"
            value={values.reappointmentDate ?? ""}
            onChange={set("reappointmentDate")}
            className="w-40"
          />
        </F6Field>
      </F6Section>

      <F6Section title="Client 1 — Reappointment signature">
        <div className="grid grid-cols-2 gap-2">
          <F6Field label="Full name (line 1)">
            <F6Input value={values.reappointClient1Name1 ?? ""} onChange={set("reappointClient1Name1")} />
          </F6Field>
          <F6Field label="Full name (line 2)">
            <F6Input value={values.reappointClient1Name2 ?? ""} onChange={set("reappointClient1Name2")} />
          </F6Field>
        </div>
        <F6Field label="Date">
          <F6Input
            type="date"
            value={values.reappointClient1Date ?? ""}
            onChange={set("reappointClient1Date")}
            className="w-40"
          />
        </F6Field>
      </F6Section>

      <F6Section title="Client 2 — Reappointment signature">
        <div className="grid grid-cols-2 gap-2">
          <F6Field label="Full name (line 1)">
            <F6Input value={values.reappointClient2Name1 ?? ""} onChange={set("reappointClient2Name1")} />
          </F6Field>
          <F6Field label="Full name (line 2)">
            <F6Input value={values.reappointClient2Name2 ?? ""} onChange={set("reappointClient2Name2")} />
          </F6Field>
        </div>
        <F6Field label="Date">
          <F6Input
            type="date"
            value={values.reappointClient2Date ?? ""}
            onChange={set("reappointClient2Date")}
            className="w-40"
          />
        </F6Field>
      </F6Section>
    </div>
  )
}
