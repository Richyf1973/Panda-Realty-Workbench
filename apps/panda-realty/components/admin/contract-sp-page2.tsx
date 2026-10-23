"use client"

import { FormCaption, FormField, FormInput, FormRadio, FormSection, FormTextarea, makeInputHandler } from "./form-fill-field"

interface Props {
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}

const set = makeInputHandler

export function ContractSpPage2({ values, onChange }: Props) {
  return (
    <div className="space-y-6 p-4">
      <FormSection title="Buyer's Agent">
        <div className="grid grid-cols-2 gap-2">
          <FormField label="Name" className="col-span-2 sm:col-span-1">
            <FormInput value={values.buyerAgentName ?? ""} onChange={set("buyerAgentName", onChange)} data-testid="contract-sp-page2-buyer-agent-name" />
          </FormField>
          <FormField label="ABN">
            <FormInput value={values.buyerAgentAbn ?? ""} onChange={set("buyerAgentAbn", onChange)} data-testid="contract-sp-page2-buyer-agent-abn" />
          </FormField>
          <FormField label="Licence Number">
            <FormInput value={values.buyerAgentLicenceNumber ?? ""} onChange={set("buyerAgentLicenceNumber", onChange)} data-testid="contract-sp-page2-buyer-agent-licence-number" />
          </FormField>
        </div>
        <FormField label="Address">
          <FormInput value={values.buyerAgentAddress ?? ""} onChange={set("buyerAgentAddress", onChange)} data-testid="contract-sp-page2-buyer-agent-address" />
        </FormField>
        <div className="grid grid-cols-3 gap-2">
          <FormField label="Suburb">
            <FormInput value={values.buyerAgentSuburb ?? ""} onChange={set("buyerAgentSuburb", onChange)} data-testid="contract-sp-page2-buyer-agent-suburb" />
          </FormField>
          <FormField label="State">
            <FormInput value={values.buyerAgentState ?? ""} onChange={set("buyerAgentState", onChange)} data-testid="contract-sp-page2-buyer-agent-state" />
          </FormField>
          <FormField label="Postcode">
            <FormInput value={values.buyerAgentPostcode ?? ""} onChange={set("buyerAgentPostcode", onChange)} data-testid="contract-sp-page2-buyer-agent-postcode" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="Phone">
            <FormInput value={values.buyerAgentPhone ?? ""} onChange={set("buyerAgentPhone", onChange)} data-testid="contract-sp-page2-buyer-agent-phone" />
          </FormField>
          <FormField label="Mobile">
            <FormInput value={values.buyerAgentMobile ?? ""} onChange={set("buyerAgentMobile", onChange)} data-testid="contract-sp-page2-buyer-agent-mobile" />
          </FormField>
        </div>
        <FormField label="Email">
          <FormInput type="email" value={values.buyerAgentEmail ?? ""} onChange={set("buyerAgentEmail", onChange)} data-testid="contract-sp-page2-buyer-agent-email" />
        </FormField>
      </FormSection>

      <FormSection title="Buyer's Solicitor">
        <FormCaption>or any other solicitor notified to the Seller</FormCaption>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="Name" className="col-span-2 sm:col-span-1">
            <FormInput value={values.buyerSolicitorName ?? ""} onChange={set("buyerSolicitorName", onChange)} data-testid="contract-sp-page2-buyer-solicitor-name" />
          </FormField>
          <FormField label="Reference">
            <FormInput value={values.buyerSolicitorRef ?? ""} onChange={set("buyerSolicitorRef", onChange)} data-testid="contract-sp-page2-buyer-solicitor-ref" />
          </FormField>
        </div>
        <FormField label="Address">
          <FormInput value={values.buyerSolicitorAddress ?? ""} onChange={set("buyerSolicitorAddress", onChange)} data-testid="contract-sp-page2-buyer-solicitor-address" />
        </FormField>
        <div className="grid grid-cols-3 gap-2">
          <FormField label="Suburb">
            <FormInput value={values.buyerSolicitorSuburb ?? ""} onChange={set("buyerSolicitorSuburb", onChange)} data-testid="contract-sp-page2-buyer-solicitor-suburb" />
          </FormField>
          <FormField label="State">
            <FormInput value={values.buyerSolicitorState ?? ""} onChange={set("buyerSolicitorState", onChange)} data-testid="contract-sp-page2-buyer-solicitor-state" />
          </FormField>
          <FormField label="Postcode">
            <FormInput value={values.buyerSolicitorPostcode ?? ""} onChange={set("buyerSolicitorPostcode", onChange)} data-testid="contract-sp-page2-buyer-solicitor-postcode" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="Phone">
            <FormInput value={values.buyerSolicitorPhone ?? ""} onChange={set("buyerSolicitorPhone", onChange)} data-testid="contract-sp-page2-buyer-solicitor-phone" />
          </FormField>
          <FormField label="Mobile">
            <FormInput value={values.buyerSolicitorMobile ?? ""} onChange={set("buyerSolicitorMobile", onChange)} data-testid="contract-sp-page2-buyer-solicitor-mobile" />
          </FormField>
        </div>
        <FormField label="Email">
          <FormInput type="email" value={values.buyerSolicitorEmail ?? ""} onChange={set("buyerSolicitorEmail", onChange)} data-testid="contract-sp-page2-buyer-solicitor-email" />
        </FormField>
      </FormSection>

      <FormSection title="The Property">
        <FormField label="Street Address">
          <FormInput value={values.address ?? ""} onChange={set("address", onChange)} data-testid="contract-sp-page2-address" />
        </FormField>
        <div className="grid grid-cols-3 gap-2">
          <FormField label="Suburb">
            <FormInput value={values.suburb ?? ""} onChange={set("suburb", onChange)} data-testid="contract-sp-page2-suburb" />
          </FormField>
          <FormField label="State">
            <FormInput value={values.state ?? ""} onChange={set("state", onChange)} data-testid="contract-sp-page2-state" />
          </FormField>
          <FormField label="Postcode">
            <FormInput value={values.postcode ?? ""} onChange={set("postcode", onChange)} data-testid="contract-sp-page2-postcode" />
          </FormField>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <FormField label="Lot">
            <FormInput value={values.lot ?? ""} onChange={set("lot", onChange)} data-testid="contract-sp-page2-lot" />
          </FormField>
          <FormField label="Plan">
            <FormInput value={values.plan ?? ""} onChange={set("plan", onChange)} data-testid="contract-sp-page2-plan" />
          </FormField>
          <FormField label="Area (m²)">
            <FormInput value={values.area ?? ""} onChange={set("area", onChange)} data-testid="contract-sp-page2-area" />
          </FormField>
        </div>
        <FormField label="Title Reference">
          <FormInput value={values.titleReference ?? ""} onChange={set("titleReference", onChange)} data-testid="contract-sp-page2-title-reference" />
        </FormField>
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-foreground/70">Sold As</p>
          <FormRadio
            name="soldAsOption"
            options={[
              { value: "freehold", label: "Freehold", testid: "contract-sp-page2-sold-as-freehold" },
              { value: "leasehold", label: "Leasehold", testid: "contract-sp-page2-sold-as-leasehold" },
            ]}
            value={values.soldAsOption ?? ""}
            onChange={(v) => onChange("soldAsOption", v)}
          />
          <FormCaption>If neither is selected, the Lot is treated as being Freehold.</FormCaption>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-foreground/70">Land Use</p>
          <FormRadio
            name="landUseOption"
            options={[
              { value: "builtOn", label: "Built On", testid: "contract-sp-page2-land-use-built-on" },
              { value: "vacant", label: "Vacant", testid: "contract-sp-page2-land-use-vacant" },
            ]}
            value={values.landUseOption ?? ""}
            onChange={(v) => onChange("landUseOption", v)}
          />
        </div>
        <FormField label="Present Use">
          <FormInput value={values.presentUse ?? ""} onChange={set("presentUse", onChange)} data-testid="contract-sp-page2-present-use" />
        </FormField>
        <FormField label="Local Government">
          <FormInput value={values.localGovernment ?? ""} onChange={set("localGovernment", onChange)} data-testid="contract-sp-page2-local-government" />
        </FormField>
        <FormField label="Excluded Fixtures">
          <FormTextarea
            value={values.excludedFixtures ?? ""}
            onChange={(e) => onChange("excludedFixtures", e.target.value)}
            data-testid="contract-sp-page2-excluded-fixtures"
            className="min-h-[48px]"
          />
        </FormField>
        <FormCaption>attach annexure for additional space</FormCaption>
        <FormField label="Included Chattels">
          <FormTextarea
            value={values.includedChattels ?? ""}
            onChange={(e) => onChange("includedChattels", e.target.value)}
            data-testid="contract-sp-page2-included-chattels"
            className="min-h-[48px]"
          />
        </FormField>
        <FormCaption>attach annexure for additional space</FormCaption>
      </FormSection>

      <FormSection title="Price & Deposit">
        <FormCaption>Cyber criminals are targeting real estate transactions by sending fraudulent electronic communications (emails) impersonating lawyers and real estate agents. BEFORE you pay any funds to another person or company using information that has been emailed to you or contained in this Contract, you should contact the intended recipient by telephone to verify and confirm the account details that have been provided to you.</FormCaption>
        <FormField label="Purchase Price ($)">
          <FormInput value={values.purchasePrice ?? ""} onChange={set("purchasePrice", onChange)} data-testid="contract-sp-page2-purchase-price" />
        </FormField>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="Deposit Initial ($)">
            <FormInput value={values.depositInitial ?? ""} onChange={set("depositInitial", onChange)} data-testid="contract-sp-page2-deposit-initial" />
          </FormField>
          <FormField label="Deposit Balance ($)">
            <FormInput value={values.depositBalance ?? ""} onChange={set("depositBalance", onChange)} data-testid="contract-sp-page2-deposit-balance" />
          </FormField>
        </div>
        <FormCaption>payable on the day the Buyer signs this Contract unless another time is specified below</FormCaption>
        <FormField label="Deposit Payable On">
          <FormInput type="date" value={values.depositPayableOn ?? ""} onChange={set("depositPayableOn", onChange)} data-testid="contract-sp-page2-deposit-payable-on" />
        </FormField>
        <FormCaption>NOTE: failure to pay the deposit on the date(s) specified may result in termination of the contract and forfeiture of the deposit to the Seller.</FormCaption>
        <FormField label="Deposit Holder">
          <FormInput value={values.depositHolder ?? ""} onChange={set("depositHolder", onChange)} data-testid="contract-sp-page2-deposit-holder" />
        </FormField>
        <FormField label="Deposit Holder Trust Account">
          <FormInput value={values.depositHolderTrustAccount ?? ""} onChange={set("depositHolderTrustAccount", onChange)} data-testid="contract-sp-page2-deposit-holder-trust-account" />
        </FormField>
        <FormCaption>Banking details for the trust account where the deposit will be held.</FormCaption>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="Bank">
            <FormInput value={values.depositBank ?? ""} onChange={set("depositBank", onChange)} data-testid="contract-sp-page2-deposit-bank" />
          </FormField>
          <FormField label="BSB">
            <FormInput value={values.depositBsb ?? ""} onChange={set("depositBsb", onChange)} data-testid="contract-sp-page2-deposit-bsb" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="Account No.">
            <FormInput value={values.depositAccountNo ?? ""} onChange={set("depositAccountNo", onChange)} data-testid="contract-sp-page2-deposit-account-no" />
          </FormField>
          <FormField label="Default Interest Rate (% p.a.)">
            <FormInput value={values.defaultInterestRate ?? ""} onChange={set("defaultInterestRate", onChange)} data-testid="contract-sp-page2-default-interest-rate" />
          </FormField>
        </div>
        <FormCaption>If no figure is inserted, the Contract Rate applying at the Contract Date published by the Queensland Law Society Inc will apply.</FormCaption>
      </FormSection>
    </div>
  )
}
