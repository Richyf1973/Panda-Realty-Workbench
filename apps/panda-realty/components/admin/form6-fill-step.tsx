"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs"
import type { AgentRow } from "@/lib/admin/types"
import { Form6Part1Clients } from "./form6-part1-clients"
import { Form6Part2Licensee } from "./form6-part2-licensee"
import { Form6Part3Property } from "./form6-part3-property"
import { Form6Part4Appointment } from "./form6-part4-appointment"
import { Form6Part6Agency } from "./form6-part6-agency"
import { Form6Part7Commission } from "./form6-part7-commission"
import { Form6Part8Fees } from "./form6-part8-fees"
import { Form6Part9Signatures } from "./form6-part9-signatures"
import { Form6Part10Reappointment } from "./form6-part10-reappointment"

interface Props {
  prefillValues: Record<string, string>
  agents: AgentRow[]
  selectedAgentId: number | null
  onAgentChange: (agentId: number) => void
  onValuesChange: (values: Record<string, string>) => void
}

const TABS = [
  { value: "1", label: "1 Clients" },
  { value: "2", label: "2 Licensee" },
  { value: "3", label: "3 Property" },
  { value: "4", label: "4 Appointment" },
  { value: "6", label: "6 Agency" },
  { value: "7", label: "7 Commission" },
  { value: "8", label: "8 Fees" },
  { value: "9", label: "9 Signatures" },
  { value: "10", label: "10 Reappt." },
] as const

export function Form6FillStep({ prefillValues, agents, selectedAgentId, onAgentChange, onValuesChange }: Props) {
  function handleChange(key: string, value: string) {
    onValuesChange({ ...prefillValues, [key]: value })
  }

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      data-testid="form6-fill-step"
    >
      <Tabs defaultValue="1" className="flex h-full flex-col overflow-hidden">
        <TabsList className="shrink-0 overflow-x-auto justify-start gap-1 rounded-none border-b border-border bg-background px-4 py-2 h-auto">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              data-testid={`form6-tab-trigger--${tab.value}`}
              className="rounded px-3 py-1 text-xs"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="1" className="m-0 h-full">
            <Form6Part1Clients values={prefillValues} onChange={handleChange} />
          </TabsContent>

          <TabsContent value="2" className="m-0 h-full">
            <Form6Part2Licensee
              values={prefillValues}
              onChange={handleChange}
              agents={agents}
              selectedAgentId={selectedAgentId}
              onAgentChange={onAgentChange}
            />
          </TabsContent>

          <TabsContent value="3" className="m-0 h-full">
            <Form6Part3Property values={prefillValues} onChange={handleChange} />
          </TabsContent>

          <TabsContent value="4" className="m-0 h-full">
            <Form6Part4Appointment values={prefillValues} onChange={handleChange} />
          </TabsContent>

          <TabsContent value="6" className="m-0 h-full">
            <Form6Part6Agency values={prefillValues} onChange={handleChange} />
          </TabsContent>

          <TabsContent value="7" className="m-0 h-full">
            <Form6Part7Commission values={prefillValues} onChange={handleChange} />
          </TabsContent>

          <TabsContent value="8" className="m-0 h-full">
            <Form6Part8Fees values={prefillValues} onChange={handleChange} />
          </TabsContent>

          <TabsContent value="9" className="m-0 h-full">
            <Form6Part9Signatures values={prefillValues} onChange={handleChange} />
          </TabsContent>

          <TabsContent value="10" className="m-0 h-full">
            <Form6Part10Reappointment values={prefillValues} onChange={handleChange} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
