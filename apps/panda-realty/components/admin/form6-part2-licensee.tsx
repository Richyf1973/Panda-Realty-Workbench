"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/select"
import type { AgentRow } from "@/lib/admin/types"
import { F6Caption, F6Checkbox, F6Field, F6Input, F6Section } from "./form6-field"

interface Props {
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  agents: AgentRow[]
  selectedAgentId: number | null
  onAgentChange: (agentId: number) => void
}

export function Form6Part2Licensee({ values, onChange, agents, selectedAgentId, onAgentChange }: Props) {
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange(key, e.target.value)

  const licenseeType = values.agentLicenseeType ?? ""

  return (
    <div className="space-y-6 p-4">
      <F6Section title="Licensee type">
        <F6Caption>More than one may be ticked if applicable.</F6Caption>
        <div className="flex flex-wrap gap-4">
          <F6Checkbox
            label="Real estate agent"
            checked={licenseeType === "real-estate-agent"}
            onChange={(checked) =>
              onChange("agentLicenseeType", checked ? "real-estate-agent" : "")
            }
          />
          <F6Checkbox
            label="Resident letting agent"
            checked={licenseeType === "resident-letting-agent"}
            onChange={(checked) =>
              onChange("agentLicenseeType", checked ? "resident-letting-agent" : "")
            }
          />
          <F6Checkbox
            label="Property auctioneer"
            checked={licenseeType === "property-auctioneer"}
            onChange={(checked) =>
              onChange("agentLicenseeType", checked ? "property-auctioneer" : "")
            }
          />
        </div>
      </F6Section>

      <F6Section title="Agent">
        <F6Caption>
          Selecting an agent auto-fills the licensee details below. You can edit any field
          manually.
        </F6Caption>
        {agents.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="form6-part2-no-agents-message">
            No agents found — add an agent in Admin → Agents first.
          </p>
        ) : (
          <Select
            value={selectedAgentId?.toString() ?? ""}
            onValueChange={(v) => onAgentChange(Number(v))}
          >
            <SelectTrigger data-testid="form6-part2-agent-select" className="w-64">
              <SelectValue placeholder="Select agent…" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((a) => (
                <SelectItem key={a.agentId} value={a.agentId.toString()}>
                  {a.agentName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </F6Section>

      <F6Section title="Licensee details">
        <div className="grid grid-cols-2 gap-2">
          <F6Field label="Trading name">
            <F6Input
              value={values.agentTradingName ?? ""}
              onChange={set("agentTradingName")}
              data-testid="form6-part2-trading-name"
            />
          </F6Field>
          <F6Field label="Licensee name (corporation, line 1)">
            <F6Input value={values.agentName ?? ""} onChange={set("agentName")} />
          </F6Field>
          <F6Field label="Licensee name (line 2)">
            <F6Input value={values.agentNameLine2 ?? ""} onChange={set("agentNameLine2")} />
          </F6Field>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <F6Field label="ABN">
            <F6Input
              value={values.agentAbn ?? ""}
              onChange={set("agentAbn")}
              data-testid="form6-part2-abn"
            />
          </F6Field>
          <F6Field label="ACN">
            <F6Input
              value={values.agentAcn ?? ""}
              onChange={set("agentAcn")}
              data-testid="form6-part2-acn"
            />
          </F6Field>
          <F6Field label="Licence number">
            <F6Input
              value={values.agentLicenceNumber ?? ""}
              onChange={set("agentLicenceNumber")}
              data-testid="form6-part2-licence-number"
            />
          </F6Field>
          <F6Field label="Licence expiry">
            <F6Input
              type="date"
              value={values.agentLicenceExpiry ?? ""}
              onChange={set("agentLicenceExpiry")}
            />
          </F6Field>
        </div>
        <F6Field label="Address">
          <F6Input
            value={values.agentAddress ?? ""}
            onChange={set("agentAddress")}
            data-testid="form6-part2-address"
          />
        </F6Field>
        <div className="grid grid-cols-3 gap-2">
          <F6Field label="Suburb">
            <F6Input value={values.agentSuburb ?? ""} onChange={set("agentSuburb")} />
          </F6Field>
          <F6Field label="State">
            <F6Input value={values.agentState ?? ""} onChange={set("agentState")} />
          </F6Field>
          <F6Field label="Postcode">
            <F6Input value={values.agentPostcode ?? ""} onChange={set("agentPostcode")} />
          </F6Field>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <F6Field label="Phone">
            <F6Input
              value={values.agentPhone ?? ""}
              onChange={set("agentPhone")}
              data-testid="form6-part2-phone"
            />
          </F6Field>
          <F6Field label="Fax">
            <F6Input value={values.agentFax ?? ""} onChange={set("agentFax")} />
          </F6Field>
          <F6Field label="Mobile">
            <F6Input value={values.agentMobile ?? ""} onChange={set("agentMobile")} data-testid="form6-part2-mobile" />
          </F6Field>
          <F6Field label="Email">
            <F6Input
              value={values.agentEmail ?? ""}
              onChange={set("agentEmail")}
              data-testid="form6-part2-email"
            />
          </F6Field>
        </div>
      </F6Section>
    </div>
  )
}
