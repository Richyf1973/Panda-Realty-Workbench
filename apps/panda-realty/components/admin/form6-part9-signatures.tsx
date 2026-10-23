"use client"

import { F6Caption, F6Field, F6Input, F6Section } from "./form6-field"

interface Props {
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}

function SignatureBlock({
  title,
  nameKey1,
  nameKey2,
  dateKey,
  values,
  onChange,
  testId1,
  testId2,
}: {
  title: string
  nameKey1: string
  nameKey2: string
  dateKey: string
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  testId1?: string
  testId2?: string
}) {
  return (
    <F6Section title={title}>
      <div className="grid grid-cols-2 gap-2">
        <F6Field label="Full name (line 1)">
          <F6Input
            data-testid={testId1}
            value={values[nameKey1] ?? ""}
            onChange={(e) => onChange(nameKey1, e.target.value)}
          />
        </F6Field>
        <F6Field label="Full name (line 2)">
          <F6Input
            data-testid={testId2}
            value={values[nameKey2] ?? ""}
            onChange={(e) => onChange(nameKey2, e.target.value)}
          />
        </F6Field>
      </div>
      <F6Field label="Date">
        <F6Input
          type="date"
          value={values[dateKey] ?? ""}
          onChange={(e) => onChange(dateKey, e.target.value)}
          className="w-40"
        />
      </F6Field>
    </F6Section>
  )
}

export function Form6Part9Signatures({ values, onChange }: Props) {
  return (
    <div className="space-y-6 p-4">
      <F6Caption>
        Signatures are applied on the printed form. Enter the full names and dates below for
        reference — they will be filled into the PDF text fields.
      </F6Caption>

      <SignatureBlock
        title="Client 1 signature block"
        nameKey1="client1FullName1"
        nameKey2="client1FullName2"
        dateKey="client1SignatureDate"
        values={values}
        onChange={onChange}
        testId1="form6-part9-client1-fullname1"
        testId2="form6-part9-client1-fullname2"
      />

      <SignatureBlock
        title="Client 2 signature block"
        nameKey1="client2FullName1"
        nameKey2="client2FullName2"
        dateKey="client2SignatureDate"
        values={values}
        onChange={onChange}
        testId1="form6-part9-client2-fullname1"
      />

      <SignatureBlock
        title="Agent / licensee signature block"
        nameKey1="agentFullName1"
        nameKey2="agentFullName2"
        dateKey="agentSignatureDate"
        values={values}
        onChange={onChange}
        testId1="form6-part9-agent-fullname1"
      />
    </div>
  )
}
