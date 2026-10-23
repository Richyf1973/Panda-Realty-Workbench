"use client"

import { useCallback, useState } from "react"

import type { AgentRow } from "@/lib/admin/types"
import { PREFILL_STRATEGY_CONTRACT_SALE_PURCHASE, PREFILL_STRATEGY_FORM6 } from "@/lib/admin/constants"
import { mapContractSpData, mapForm6Data, mapProFormaData } from "./prefill-mappers"
import type { ContractSpApiData, Form6ApiData, ProFormaApiData } from "./prefill-mappers"

interface PropertyFormRow {
  propertyFormId: number
  prefillStrategy: string | null
}

export function usePropertyFormPrefill({
  form,
  propertyListId,
  propertyAddress,
}: {
  form: PropertyFormRow | null
  propertyListId: number
  propertyAddress?: string
}) {
  const [prefillValues, setPrefillValues] = useState<Record<string, string>>({})
  const [loadingPrefill, setLoadingPrefill] = useState(false)
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const setPrefill = (key: string) => (value: string) =>
    setPrefillValues((prev) => ({ ...prev, [key]: value }))

  const loadPrefillData = useCallback(async (initialValues?: Record<string, string>) => {
    if (!form?.prefillStrategy || !propertyListId) return
    setLoadingPrefill(true)
    try {
      const res = await fetch(
        `/api/admin/property-forms/prefill-data?propertyListId=${propertyListId}&prefillStrategy=${form.prefillStrategy}`,
      )
      if (!res.ok) {
        setError("Failed to load prefill data — please close and try again")
        return
      }

      if (form.prefillStrategy === PREFILL_STRATEGY_FORM6) {
        const data = (await res.json()) as Form6ApiData
        setPrefillValues(mapForm6Data(data, initialValues, propertyAddress))
      } else if (form.prefillStrategy === PREFILL_STRATEGY_CONTRACT_SALE_PURCHASE) {
        const data = (await res.json()) as ContractSpApiData
        setPrefillValues(mapContractSpData(data, initialValues))
      } else {
        const data = (await res.json()) as ProFormaApiData
        setPrefillValues(mapProFormaData(data, propertyAddress))
      }
    } catch {
      setError("Failed to load prefill data — please close and try again")
    } finally {
      setLoadingPrefill(false)
    }
  }, [form?.prefillStrategy, propertyListId, propertyAddress])

  const loadTemplate = useCallback(async (propertyFormId: number): Promise<Record<string, string> | null> => {
    try {
      const res = await fetch(`/api/admin/property-forms/template?propertyFormId=${propertyFormId}`)
      if (!res.ok) return null
      const data = (await res.json()) as { templateValues: Record<string, string> | null }
      return data.templateValues
    } catch {
      return null
    }
  }, [])

  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/agents/options")
      if (!res.ok) return
      const data = (await res.json()) as AgentRow[]
      setAgents(data)
    } catch {
      // silently ignore agent load errors
    }
  }, [])

  const handleAgentChange = useCallback((agentId: number) => {
    const agent = agents.find((a) => a.agentId === agentId)
    if (!agent) return
    setSelectedAgentId(agentId)
    setPrefillValues((prev) => ({
      ...prev,
      agentName: agent.agentName ?? "",
      agentTradingName: agent.tradingName ?? "",
      agentLicenceNumber: agent.licenceNumber ?? "",
      agentPhone: agent.phone ?? "",
      agentFax: agent.fax ?? "",
      agentMobile: agent.mobile?.trim() || agent.phone?.trim() || "",
      agentEmail: agent.email ?? "",
      agentAddress: agent.address ?? "",
      agentSuburb: agent.suburb ?? "",
      agentState: agent.state ?? "",
      agentPostcode: agent.postcode ?? "",
      agentLicenceExpiry: agent.licenceExpiry ?? "",
      agentLicenseeType: agent.licenseeType ?? "",
      part6AgentName: agent.agentName ?? "",
      agentFullName1: agent.agentName ?? "",
    }))
  }, [agents])

  function reset({ keepLoading = false }: { keepLoading?: boolean } = {}) {
    setPrefillValues({})
    setLoadingPrefill(keepLoading)
    setAgents([])
    setSelectedAgentId(null)
    setError(null)
  }

  return {
    prefillValues,
    setPrefill,
    setAllPrefillValues: setPrefillValues,
    loadingPrefill,
    agents,
    selectedAgentId,
    setSelectedAgentId,
    handleAgentChange,
    loadPrefillData,
    loadAgents,
    loadTemplate,
    prefillError: error,
    reset,
  }
}
