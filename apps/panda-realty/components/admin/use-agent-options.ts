"use client"

import { useEffect, useState } from "react"

export type AgentOption = {
  agentId: number
  agentName: string
  email: string | null
}

export function useAgentOptions(): AgentOption[] {
  const [agents, setAgents] = useState<AgentOption[]>([])

  useEffect(() => {
    void fetch("/api/admin/agents/options")
      .then((r) => r.json())
      .then((data: AgentOption[]) => setAgents(data))
      .catch((err) => console.error("[agents/options]", err))
  }, [])

  return agents
}
