"use client"

import { FormCaption, FormField, FormInput, FormRadio, FormSection, makeInputHandler } from "./form-fill-field"

interface Props {
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}

const set = makeInputHandler

export function ContractSpPage3({ values, onChange }: Props) {
  return (
    <div className="space-y-6 p-4">
      <FormSection title="Settlement">
        <FormField label="Settlement Date">
          <FormInput
            value={values.settlementDate ?? ""}
            onChange={set("settlementDate", onChange)}
            data-testid="contract-sp-page3-settlement-date"
            placeholder="e.g. 25/06/2026 or 30 Days from Contract Date"
          />
        </FormField>
        <FormCaption>or any later date for settlement in accordance with clause 6.2, 6.3 or 11.1(f)(i) or a special condition of this contract or under s79, s80 or s81 of the Property Law Act 2023. WARNING: The Settlement Date as stated may change. If you require settlement on a particular date, seek legal advice prior to signing.</FormCaption>
      </FormSection>

      <FormSection title="GST">
        <FormRadio
          name="gstOption"
          layout="col"
          options={[
            { value: "no-gst", label: "No GST is payable on this supply", testid: "contract-sp-page3-gst-no-gst" },
            { value: "buyer-pays", label: "Buyer pays GST", testid: "contract-sp-page3-gst-buyer-pays" },
            { value: "margin-scheme", label: "Margin Scheme applies", testid: "contract-sp-page3-gst-margin-scheme" },
            { value: "going-concern", label: "Going concern exemption", testid: "contract-sp-page3-gst-going-concern" },
            { value: "farm-land", label: "Farm land exemption", testid: "contract-sp-page3-gst-farm-land" },
          ]}
          value={values.gstOption ?? ""}
          onChange={(v) => onChange("gstOption", v)}
        />
        <FormCaption>[Select one. For sale of house or residential land or residential unit between parties who are not registered or required to be registered for GST, select first option.] Completing the GST items may have significant consequences for the Seller and Buyer. The Seller and Buyer should seek professional advice about completion of the GST item and should not rely on the Agent to complete.</FormCaption>
      </FormSection>

      <FormSection title="GST Withholding">
        <p className="text-xs font-medium text-foreground/70">Is the Buyer registered for GST?</p>
        <FormRadio
          name="gstWithholdingOption"
          options={[
            { value: "no", label: "No", testid: "contract-sp-page3-gst-withholding-no" },
            { value: "yes", label: "Yes", testid: "contract-sp-page3-gst-withholding-yes" },
          ]}
          value={values.gstWithholdingOption ?? ""}
          onChange={(v) => onChange("gstWithholdingOption", v)}
        />
      </FormSection>

      <FormSection title="GST Withholding Obligation">
        <FormCaption>Applies when the supply is new residential premises or potential residential land.</FormCaption>
        <FormRadio
          name="gstWithholdingObligationOption"
          layout="col"
          options={[
            { value: "not-required", label: "Withholding not required", testid: "contract-sp-page3-gst-withholding-obligation-not-required" },
            { value: "required", label: "Withholding required", testid: "contract-sp-page3-gst-withholding-obligation-required" },
          ]}
          value={values.gstWithholdingObligationOption ?? ""}
          onChange={(v) => onChange("gstWithholdingObligationOption", v)}
        />
      </FormSection>

      <FormSection title="Land Tax">
        <FormCaption>NOTE: This item must be completed if: the Property is not the Seller&apos;s principal place of residence (their home); and the Seller is not otherwise exempt from paying land tax in connection with this Property.</FormCaption>
        <FormRadio
          name="landTaxOption"
          layout="col"
          options={[
            { value: "no-adjustment", label: "No adjustment for land tax", testid: "contract-sp-page3-land-tax-no-adjustment" },
            { value: "single-holding", label: "Adjustment on single holding basis", testid: "contract-sp-page3-land-tax-single-holding" },
            { value: "actual-liability", label: "Adjustment on actual liability basis", testid: "contract-sp-page3-land-tax-actual-liability" },
          ]}
          value={values.landTaxOption ?? ""}
          onChange={(v) => onChange("landTaxOption", v)}
        />
      </FormSection>

      <FormSection title="Finance">
        <div className="grid grid-cols-2 gap-2">
          <FormField label="Finance Amount ($)">
            <FormInput
              value={values.financeAmount ?? ""}
              onChange={set("financeAmount", onChange)}
              data-testid="contract-sp-page3-finance-amount"
            />
          </FormField>
          <FormField label="Financier">
            <FormInput
              value={values.financier ?? ""}
              onChange={set("financier", onChange)}
              data-testid="contract-sp-page3-financier"
            />
          </FormField>
          <FormField label="Finance Date">
            <FormInput
              value={values.financeDate ?? ""}
              onChange={set("financeDate", onChange)}
              data-testid="contract-sp-page3-finance-date"
              placeholder="e.g. 14 Days from Contract Date"
            />
          </FormField>
        </div>
        <FormCaption>Unless all of &apos;Finance Amount&apos;, &apos;Financier&apos; and &apos;Finance Date&apos; are completed, this contract is not subject to finance and clause 4.1 does not apply.</FormCaption>
      </FormSection>

      <FormSection title="Building and/or Pest Inspection">
        <FormField label="Inspection Date">
          <FormInput
            value={values.inspectionDate ?? ""}
            onChange={set("inspectionDate", onChange)}
            data-testid="contract-sp-page3-inspection-date"
            placeholder="e.g. 14 Days from Contract Date"
          />
        </FormField>
        <FormCaption>If &apos;Inspection Date&apos; is not completed, the contract is not subject to an inspection report and clause 4.2 does not apply.</FormCaption>
      </FormSection>
    </div>
  )
}
