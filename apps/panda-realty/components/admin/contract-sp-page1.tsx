"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/select"
import type { AgentRow } from "@/lib/admin/types"
import { FormCaption, FormField, FormInput, FormSection, makeInputHandler } from "./form-fill-field"

interface Props {
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  agents?: AgentRow[]
  selectedAgentId?: number | null
  onAgentChange?: (agentId: number) => void
}

const set = makeInputHandler

function PersonBlock({
  prefix,
  label,
  values,
  onChange,
  testidPrefix,
}: {
  prefix: string
  label: string
  values: Record<string, string>
  onChange: Props["onChange"]
  testidPrefix: string
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-foreground/80">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <FormField label="Name" className="col-span-2 sm:col-span-1">
          <FormInput value={values[`${prefix}Name`] ?? ""} onChange={set(`${prefix}Name`, onChange)} data-testid={`${testidPrefix}-name`} />
        </FormField>
        <FormField label="ABN">
          <FormInput value={values[`${prefix}Abn`] ?? ""} onChange={set(`${prefix}Abn`, onChange)} data-testid={`${testidPrefix}-abn`} />
        </FormField>
      </div>
      <FormField label="Address">
        <FormInput value={values[`${prefix}Address`] ?? ""} onChange={set(`${prefix}Address`, onChange)} data-testid={`${testidPrefix}-address`} />
      </FormField>
      <div className="grid grid-cols-3 gap-2">
        <FormField label="Suburb" className="col-span-1">
          <FormInput value={values[`${prefix}Suburb`] ?? ""} onChange={set(`${prefix}Suburb`, onChange)} data-testid={`${testidPrefix}-suburb`} />
        </FormField>
        <FormField label="State">
          <FormInput value={values[`${prefix}State`] ?? ""} onChange={set(`${prefix}State`, onChange)} data-testid={`${testidPrefix}-state`} />
        </FormField>
        <FormField label="Postcode">
          <FormInput value={values[`${prefix}Postcode`] ?? ""} onChange={set(`${prefix}Postcode`, onChange)} data-testid={`${testidPrefix}-postcode`} />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FormField label="Phone">
          <FormInput value={values[`${prefix}Phone`] ?? ""} onChange={set(`${prefix}Phone`, onChange)} data-testid={`${testidPrefix}-phone`} />
        </FormField>
        <FormField label="Mobile">
          <FormInput value={values[`${prefix}Mobile`] ?? ""} onChange={set(`${prefix}Mobile`, onChange)} data-testid={`${testidPrefix}-mobile`} />
        </FormField>
      </div>
      <FormField label="Email">
        <FormInput type="email" value={values[`${prefix}Email`] ?? ""} onChange={set(`${prefix}Email`, onChange)} data-testid={`${testidPrefix}-email`} />
      </FormField>
    </div>
  )
}

export function ContractSpPage1({ values, onChange, agents, selectedAgentId, onAgentChange }: Props) {
  return (
    <div className="space-y-6 p-4">
      <FormSection title="Contract Date">
        <FormField label="Contract Date">
          <FormInput
            type="date"
            value={values.contractDate ?? ""}
            onChange={set("contractDate", onChange)}
            data-testid="contract-sp-page1-contract-date"
          />
        </FormField>
      </FormSection>

      <FormSection title="Sellers">
        <FormCaption>or any other person authorised to act as Seller</FormCaption>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <PersonBlock
            prefix="seller1"
            label="Seller 1"
            values={values}
            onChange={onChange}
            testidPrefix="contract-sp-page1-seller1"
          />
          <PersonBlock
            prefix="seller2"
            label="Seller 2 (optional)"
            values={values}
            onChange={onChange}
            testidPrefix="contract-sp-page1-seller2"
          />
        </div>
      </FormSection>

      <FormSection title="Seller's Agent">
        {agents && agents.length > 0 && onAgentChange && (
          <Select
            value={selectedAgentId?.toString() ?? ""}
            onValueChange={(v) => onAgentChange(Number(v))}
          >
            <SelectTrigger data-testid="contract-sp-page1-agent-select" className="w-64">
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
        <div className="grid grid-cols-2 gap-2">
          <FormField label="Name" className="col-span-2 sm:col-span-1">
            <FormInput value={values.agentName ?? ""} onChange={set("agentName", onChange)} data-testid="contract-sp-page1-agent-name" />
          </FormField>
          <FormField label="ABN">
            <FormInput value={values.agentAbn ?? ""} onChange={set("agentAbn", onChange)} data-testid="contract-sp-page1-agent-abn" />
          </FormField>
          <FormField label="Licence Number">
            <FormInput value={values.agentLicenceNumber ?? ""} onChange={set("agentLicenceNumber", onChange)} data-testid="contract-sp-page1-agent-licence-number" />
          </FormField>
        </div>
        <FormField label="Address">
          <FormInput value={values.agentAddress ?? ""} onChange={set("agentAddress", onChange)} data-testid="contract-sp-page1-agent-address" />
        </FormField>
        <div className="grid grid-cols-3 gap-2">
          <FormField label="Suburb">
            <FormInput value={values.agentSuburb ?? ""} onChange={set("agentSuburb", onChange)} data-testid="contract-sp-page1-agent-suburb" />
          </FormField>
          <FormField label="State">
            <FormInput value={values.agentState ?? ""} onChange={set("agentState", onChange)} data-testid="contract-sp-page1-agent-state" />
          </FormField>
          <FormField label="Postcode">
            <FormInput value={values.agentPostcode ?? ""} onChange={set("agentPostcode", onChange)} data-testid="contract-sp-page1-agent-postcode" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="Phone">
            <FormInput value={values.agentPhone ?? ""} onChange={set("agentPhone", onChange)} data-testid="contract-sp-page1-agent-phone" />
          </FormField>
          <FormField label="Mobile">
            <FormInput value={values.agentMobile ?? ""} onChange={set("agentMobile", onChange)} data-testid="contract-sp-page1-agent-mobile" />
          </FormField>
        </div>
        <FormField label="Email">
          <FormInput type="email" value={values.agentEmail ?? ""} onChange={set("agentEmail", onChange)} data-testid="contract-sp-page1-agent-email" />
        </FormField>
      </FormSection>

      <FormSection title="Seller's Solicitor">
        <FormCaption>or any other solicitor notified to the buyer</FormCaption>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="Name" className="col-span-2 sm:col-span-1">
            <FormInput value={values.sellerSolicitorName ?? ""} onChange={set("sellerSolicitorName", onChange)} data-testid="contract-sp-page1-seller-solicitor-name" />
          </FormField>
          <FormField label="Reference">
            <FormInput value={values.sellerSolicitorRef ?? ""} onChange={set("sellerSolicitorRef", onChange)} data-testid="contract-sp-page1-seller-solicitor-ref" />
          </FormField>
        </div>
        <FormField label="Address">
          <FormInput value={values.sellerSolicitorAddress ?? ""} onChange={set("sellerSolicitorAddress", onChange)} data-testid="contract-sp-page1-seller-solicitor-address" />
        </FormField>
        <div className="grid grid-cols-3 gap-2">
          <FormField label="Suburb">
            <FormInput value={values.sellerSolicitorSuburb ?? ""} onChange={set("sellerSolicitorSuburb", onChange)} data-testid="contract-sp-page1-seller-solicitor-suburb" />
          </FormField>
          <FormField label="State">
            <FormInput value={values.sellerSolicitorState ?? ""} onChange={set("sellerSolicitorState", onChange)} data-testid="contract-sp-page1-seller-solicitor-state" />
          </FormField>
          <FormField label="Postcode">
            <FormInput value={values.sellerSolicitorPostcode ?? ""} onChange={set("sellerSolicitorPostcode", onChange)} data-testid="contract-sp-page1-seller-solicitor-postcode" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="Phone">
            <FormInput value={values.sellerSolicitorPhone ?? ""} onChange={set("sellerSolicitorPhone", onChange)} data-testid="contract-sp-page1-seller-solicitor-phone" />
          </FormField>
          <FormField label="Mobile">
            <FormInput value={values.sellerSolicitorMobile ?? ""} onChange={set("sellerSolicitorMobile", onChange)} data-testid="contract-sp-page1-seller-solicitor-mobile" />
          </FormField>
        </div>
        <FormField label="Email">
          <FormInput type="email" value={values.sellerSolicitorEmail ?? ""} onChange={set("sellerSolicitorEmail", onChange)} data-testid="contract-sp-page1-seller-solicitor-email" />
        </FormField>
      </FormSection>

      <FormSection title="Buyers">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <PersonBlock
            prefix="buyer1"
            label="Buyer 1"
            values={values}
            onChange={onChange}
            testidPrefix="contract-sp-page1-buyer1"
          />
          <PersonBlock
            prefix="buyer2"
            label="Buyer 2 (optional)"
            values={values}
            onChange={onChange}
            testidPrefix="contract-sp-page1-buyer2"
          />
        </div>
      </FormSection>
    </div>
  )
}
