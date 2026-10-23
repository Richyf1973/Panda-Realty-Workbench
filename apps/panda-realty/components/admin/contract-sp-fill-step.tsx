"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs"
import type { AgentRow } from "@/lib/admin/types"
import { ContractSpPage1 } from "./contract-sp-page1"
import { ContractSpPage2 } from "./contract-sp-page2"
import { ContractSpPage3 } from "./contract-sp-page3"
import { ContractSpPage4 } from "./contract-sp-page4"
import { ContractSpPage5 } from "./contract-sp-page5"
import { ContractSpPage6 } from "./contract-sp-page6"

interface Props {
  prefillValues: Record<string, string>
  agents: AgentRow[]
  selectedAgentId: number | null
  onAgentChange: (agentId: number) => void
  onValuesChange: (values: Record<string, string>) => void
}

const TABS = [
  { value: "1", label: "Page 1" },
  { value: "2", label: "Page 2" },
  { value: "3", label: "Page 3" },
  { value: "4", label: "Page 4" },
  { value: "5", label: "Page 5" },
  { value: "6", label: "Page 6" },
] as const

export function ContractSpFillStep({ prefillValues, agents, selectedAgentId, onAgentChange, onValuesChange }: Props) {
  function handleChange(key: string, value: string) {
    onValuesChange({ ...prefillValues, [key]: value })
  }

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      data-testid="contract-sp-fill-step"
    >
      <Tabs defaultValue="1" className="flex h-full flex-col overflow-hidden">
        <TabsList className="shrink-0 overflow-x-auto justify-start gap-1 rounded-none border-b border-border bg-background px-4 py-2 h-auto">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              data-testid={`contract-sp-tab-trigger--${tab.value}`}
              className="rounded px-3 py-1 text-xs"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="1" className="m-0 h-full">
            <ContractSpPage1
              values={prefillValues}
              onChange={handleChange}
              agents={agents}
              selectedAgentId={selectedAgentId}
              onAgentChange={onAgentChange}
            />
          </TabsContent>

          <TabsContent value="2" className="m-0 h-full">
            <ContractSpPage2 values={prefillValues} onChange={handleChange} />
          </TabsContent>

          <TabsContent value="3" className="m-0 h-full">
            <ContractSpPage3 values={prefillValues} onChange={handleChange} />
          </TabsContent>

          <TabsContent value="4" className="m-0 h-full">
            <ContractSpPage4 values={prefillValues} onChange={handleChange} />
          </TabsContent>

          <TabsContent value="5" className="m-0 h-full">
            <ContractSpPage5 values={prefillValues} onChange={handleChange} />
          </TabsContent>

          <TabsContent value="6" className="m-0 h-full">
            <ContractSpPage6 values={prefillValues} onChange={handleChange} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
