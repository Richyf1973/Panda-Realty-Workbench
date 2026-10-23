"use client"

import { Label } from "@repo/ui/label"

import type { PrefillData } from "@/components/offer-form/offer-form-types"

import {
  NativeField,
  NativeRadioGroup,
  SALE_STATUS_OPTIONS,
  UNDER_CONTRACT_CONDITIONS,
} from "./buyer-offer-native-view-helpers"

type SetDraftField = (path: string, value: unknown) => void

export function NativeFinancePanel({
  prefill,
  setDraftField,
}: {
  prefill: PrefillData
  setDraftField?: SetDraftField
}) {
  const editable = !!setDraftField
  const isSubjectToFinance = prefill.isSubjectToFinance === true
  return (
    <div
      data-testid="buyer-offer-native--finance-panel"
      className="space-y-3 rounded-md border border-border p-3"
    >
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">
          Is this offer subject to finance approval?
        </Label>
        <NativeRadioGroup
          name="native-subject-to-finance"
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]}
          selected={
            prefill.isSubjectToFinance === true
              ? "yes"
              : prefill.isSubjectToFinance === false
                ? "no"
                : undefined
          }
          testId="buyer-offer-native--subject-to-finance-radios"
          editable={editable}
          onSelect={
            editable
              ? (v) => setDraftField!("isSubjectToFinance", v === "yes")
              : undefined
          }
        />
      </div>
      {isSubjectToFinance && (
        <div
          data-testid="buyer-offer-native--finance-details"
          className="space-y-3 border-t border-border pt-3"
        >
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Pre-approved?</Label>
            <NativeRadioGroup
              name="native-finance-preapproved"
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
              selected={
                prefill.financePreApproved === true
                  ? "yes"
                  : prefill.financePreApproved === false
                    ? "no"
                    : undefined
              }
              testId="buyer-offer-native--finance-preapproved-radios"
              editable={editable}
              onSelect={
                editable
                  ? (v) => setDraftField!("financePreApproved", v === "yes")
                  : undefined
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <NativeField
              label="Days required to get full Bank Approval"
              testId="buyer-offer-native--finance-approval-days"
              value={prefill.financeApprovalDays ?? ""}
              editable={editable}
              onChange={editable ? (v) => setDraftField!("financeApprovalDays", v) : undefined}
            />
            <NativeField
              label="Financier / Banking Institution"
              testId="buyer-offer-native--finance-bank"
              value={prefill.financeBank ?? ""}
              editable={editable}
              onChange={editable ? (v) => setDraftField!("financeBank", v) : undefined}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <NativeField
              label="Bank Contact Name"
              testId="buyer-offer-native--finance-bank-contact-name"
              value={prefill.financeBankContactName ?? ""}
              editable={editable}
              onChange={
                editable ? (v) => setDraftField!("financeBankContactName", v) : undefined
              }
            />
            <NativeField
              label="Bank Contact Phone"
              testId="buyer-offer-native--finance-bank-contact-phone"
              value={prefill.financeBankContactPhone ?? ""}
              editable={editable}
              onChange={
                editable ? (v) => setDraftField!("financeBankContactPhone", v) : undefined
              }
            />
            <NativeField
              label="Bank Contact Email"
              testId="buyer-offer-native--finance-bank-contact-email"
              value={prefill.financeBankContactEmail ?? ""}
              editable={editable}
              onChange={
                editable ? (v) => setDraftField!("financeBankContactEmail", v) : undefined
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function NativeBuildingPestPanel({
  prefill,
  setDraftField,
}: {
  prefill: PrefillData
  setDraftField?: SetDraftField
}) {
  const editable = !!setDraftField
  const hasBP = (prefill.buildingPestDays ?? 0) > 0
  const bpDaysStr = prefill.buildingPestDays != null ? String(prefill.buildingPestDays) : undefined
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">
        Do you require a building and pest inspection contingency?
      </Label>
      <NativeRadioGroup
        name="native-building-pest"
        options={[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ]}
        selected={hasBP ? "yes" : "no"}
        testId="buyer-offer-native--building-pest-radios"
        editable={editable}
        onSelect={
          editable
            ? (v) =>
                setDraftField!(
                  "buildingPestDays",
                  v === "yes" ? 7 : 0,
                )
            : undefined
        }
      />
      {hasBP && (
        <div
          data-testid="buyer-offer-native--building-pest-panel"
          className="space-y-3 rounded-md border border-border p-3"
        >
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Inspection Timeline</Label>
            <NativeRadioGroup
              name="native-bp-days"
              options={[
                { value: "7", label: "7 Calendar Days" },
                { value: "14", label: "14 Calendar Days" },
              ]}
              selected={bpDaysStr}
              testId="buyer-offer-native--building-pest-days-radios"
              editable={editable}
              onSelect={
                editable
                  ? (v) => setDraftField!("buildingPestDays", parseInt(v, 10))
                  : undefined
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Suggest building inspection companies?
            </Label>
            <NativeRadioGroup
              name="native-suggest-bp"
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
              selected={
                prefill.suggestBuildingCompanies === true
                  ? "yes"
                  : prefill.suggestBuildingCompanies === false
                    ? "no"
                    : undefined
              }
              testId="buyer-offer-native--suggest-bp-radios"
              editable={editable}
              onSelect={
                editable
                  ? (v) => setDraftField!("suggestBuildingCompanies", v === "yes")
                  : undefined
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function NativeSalePanel({
  prefill,
  setDraftField,
}: {
  prefill: PrefillData
  setDraftField?: SetDraftField
}) {
  const editable = !!setDraftField
  const isSubjectToSale = prefill.isSubjectToSale === true
  const stage = prefill.subjectToSaleStage ?? ""
  const showTimeline = stage === "to_be_listed" || stage === "on_the_market"
  const showUnderContractConditional = stage === "under_contract_conditional"
  const showUnderContractUnconditional = stage === "under_contract_unconditional"
  const activeConditions = prefill.saleActiveConditions ?? []
  return (
    <div
      data-testid="buyer-offer-native--sale-panel"
      className="space-y-3 rounded-md border border-border p-3"
    >
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">
          Will this offer be contingent upon the sale of another property?
        </Label>
        <NativeRadioGroup
          name="native-subject-to-sale"
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]}
          selected={
            prefill.isSubjectToSale === true
              ? "yes"
              : prefill.isSubjectToSale === false
                ? "no"
                : undefined
          }
          testId="buyer-offer-native--subject-to-sale-radios"
          editable={editable}
          onSelect={
            editable
              ? (v) => setDraftField!("isSubjectToSale", v === "yes")
              : undefined
          }
        />
      </div>
      {isSubjectToSale && (
        <div
          data-testid="buyer-offer-native--sale-details"
          className="space-y-3 border-t border-border pt-3"
        >
          <NativeField
            label="Full Address of the Asset to be Sold"
            testId="buyer-offer-native--sale-property-address"
            value={prefill.subjectToSaleAddress ?? ""}
            editable={editable}
            onChange={
              editable ? (v) => setDraftField!("subjectToSaleAddress", v) : undefined
            }
          />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Current Status</Label>
            {editable ? (
              <select
                data-testid="buyer-offer-native--sale-status-select"
                value={stage}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                onChange={(e) => setDraftField!("subjectToSaleStage", e.target.value)}
              >
                <option value="">— Select status —</option>
                {SALE_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <div
                data-testid="buyer-offer-native--sale-status"
                className="min-h-[36px] rounded-lg border border-input bg-input/50 px-2.5 py-1 text-sm text-muted-foreground"
              >
                {SALE_STATUS_OPTIONS.find((o) => o.value === stage)?.label ?? stage}
              </div>
            )}
          </div>
          {showTimeline && (
            <div
              data-testid="buyer-offer-native--sale-timeline"
              className="grid grid-cols-1 gap-3 rounded-md border border-border bg-muted/10 p-3 md:grid-cols-2"
            >
              {stage === "to_be_listed" && (
                <NativeField
                  label="Days before listing is live"
                  testId="buyer-offer-native--sale-days-before-listing"
                  value={prefill.saleDaysBeforeListing ?? ""}
                  editable={editable}
                  onChange={
                    editable
                      ? (v) => setDraftField!("saleDaysBeforeListing", v)
                      : undefined
                  }
                />
              )}
              <NativeField
                label="Days to get a sale contract"
                testId="buyer-offer-native--sale-days-to-contract"
                value={prefill.saleDaysToContract ?? ""}
                editable={editable}
                onChange={
                  editable
                    ? (v) => setDraftField!("saleDaysToContract", v)
                    : undefined
                }
              />
              <NativeField
                label="Days from contract to unconditional"
                testId="buyer-offer-native--sale-days-to-unconditional"
                value={prefill.saleDaysToUnconditional ?? ""}
                editable={editable}
                onChange={
                  editable
                    ? (v) => setDraftField!("saleDaysToUnconditional", v)
                    : undefined
                }
              />
              <NativeField
                label="Days from contract to settle"
                testId="buyer-offer-native--sale-days-to-settle"
                value={prefill.saleDaysToSettle ?? ""}
                editable={editable}
                onChange={
                  editable
                    ? (v) => setDraftField!("saleDaysToSettle", v)
                    : undefined
                }
              />
            </div>
          )}
          {showUnderContractConditional && (
            <div
              data-testid="buyer-offer-native--sale-under-contract"
              className="space-y-3 rounded-md border border-border bg-muted/10 p-3"
            >
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Active conditions on this contract
                </Label>
                <div className="grid grid-cols-1 gap-2 rounded-md border border-border bg-muted/5 p-2 sm:grid-cols-2">
                  {UNDER_CONTRACT_CONDITIONS.map(({ value, label, testId }) => (
                    <label
                      key={value}
                      className="inline-flex items-center gap-2 text-sm text-foreground"
                    >
                      <input
                        type="checkbox"
                        checked={activeConditions.includes(value)}
                        disabled={!editable}
                        onChange={
                          editable
                            ? (e) => {
                                const next = e.target.checked
                                  ? [...activeConditions, value]
                                  : activeConditions.filter((c) => c !== value)
                                setDraftField!("saleActiveConditions", next)
                              }
                            : () => {}
                        }
                        data-testid={testId}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              {activeConditions.includes("other") && (editable || prefill.saleConditionsElaboration) && (
                <NativeField
                  label="Other conditions elaboration"
                  testId="buyer-offer-native--sale-conditions-elaboration"
                  value={prefill.saleConditionsElaboration ?? ""}
                  editable={editable}
                  onChange={
                    editable
                      ? (v) => setDraftField!("saleConditionsElaboration", v)
                      : undefined
                  }
                />
              )}
              <NativeField
                label="Target date for contract becoming unconditional"
                testId="buyer-offer-native--sale-unconditional-date"
                value={prefill.saleUnconditionalDate ?? ""}
                type="text"
                editable={editable}
                onChange={
                  editable
                    ? (v) => setDraftField!("saleUnconditionalDate", v)
                    : undefined
                }
              />
              <NativeField
                label="Scheduled settlement calendar date"
                testId="buyer-offer-native--sale-buyer-settlement-date"
                value={prefill.saleBuyerSettlementDate ?? ""}
                type="text"
                editable={editable}
                onChange={
                  editable
                    ? (v) => setDraftField!("saleBuyerSettlementDate", v)
                    : undefined
                }
              />
            </div>
          )}
          {showUnderContractUnconditional && (
            <div className="space-y-3 rounded-md border border-border bg-muted/10 p-3">
              <NativeField
                label="Scheduled settlement calendar date"
                testId="buyer-offer-native--sale-buyer-settlement-date"
                value={prefill.saleBuyerSettlementDate ?? ""}
                type="text"
                editable={editable}
                onChange={
                  editable
                    ? (v) => setDraftField!("saleBuyerSettlementDate", v)
                    : undefined
                }
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
