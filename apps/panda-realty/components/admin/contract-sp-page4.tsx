"use client"

import { FormCaption, FormField, FormInput, FormRadio, FormSection, FormTextarea, makeInputHandler } from "./form-fill-field"

interface Props {
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}

const set = makeInputHandler

export function ContractSpPage4({ values, onChange }: Props) {
  return (
    <div className="space-y-6 p-4">
      <FormSection title="Title Encumbrances">
        <FormCaption>The Encumbrances listed below will remain after settlement under clause 7.2.</FormCaption>
        <FormRadio
          name="disclosureOption"
          layout="col"
          options={[
            { value: "given", label: "Seller Disclosure Statement was given to Buyer", testid: "contract-sp-page4-disclosure-given" },
            { value: "not-given", label: "Seller Disclosure Statement was NOT given", testid: "contract-sp-page4-disclosure-not-given" },
          ]}
          value={values.disclosureOption ?? ""}
          onChange={(v) => onChange("disclosureOption", v)}
        />
        {values.disclosureOption === "not-given" && (
          <FormField label="Encumbrances (describe)">
            <FormTextarea
              value={values.encumbrancesText ?? ""}
              onChange={(e) => onChange("encumbrancesText", e.target.value)}
              data-testid="contract-sp-page4-encumbrances-text"
            />
          </FormField>
        )}
      </FormSection>

      <FormSection title="Tenancies">
        <FormRadio
          name="tenanciesOption"
          options={[
            { value: "no", label: "No", testid: "contract-sp-page4-tenancies-no" },
            { value: "yes", label: "Yes — details in Tenancies Schedule", testid: "contract-sp-page4-tenancies-yes" },
          ]}
          value={values.tenanciesOption ?? ""}
          onChange={(v) => onChange("tenanciesOption", v)}
        />
      </FormSection>

      <FormSection title="Rental History (last 12 months)">
        <FormRadio
          name="rentalHistoryOption"
          options={[
            { value: "no", label: "No", testid: "contract-sp-page4-rental-history-no" },
            { value: "yes", label: "Yes", testid: "contract-sp-page4-rental-history-yes" },
          ]}
          value={values.rentalHistoryOption ?? ""}
          onChange={(v) => onChange("rentalHistoryOption", v)}
        />
        {values.rentalHistoryOption === "yes" && (
          <FormField label="Date of last rent increase">
            <FormInput
              type="date"
              value={values.lastRentDate ?? ""}
              onChange={set("lastRentDate", onChange)}
              data-testid="contract-sp-page4-last-rent-date"
            />
          </FormField>
        )}
      </FormSection>

      <FormSection title="Tree Orders and Applications (QCAT)">
        <FormRadio
          name="treeOrdersOption"
          options={[
            { value: "no", label: "No", testid: "contract-sp-page4-tree-orders-no" },
            { value: "yes", label: "Yes", testid: "contract-sp-page4-tree-orders-yes" },
          ]}
          value={values.treeOrdersOption ?? ""}
          onChange={(v) => onChange("treeOrdersOption", v)}
        />
      </FormSection>

      <FormSection title="Pool Safety">
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground/70">Is there a pool on the lot or adjacent lot?</p>
          <FormRadio
            name="poolQ1Option"
            options={[
              { value: "no", label: "No", testid: "contract-sp-page4-pool-q1-no" },
              { value: "yes", label: "Yes", testid: "contract-sp-page4-pool-q1-yes" },
            ]}
            value={values.poolQ1Option ?? ""}
            onChange={(v) => onChange("poolQ1Option", v)}
          />
        </div>
        {values.poolQ1Option === "yes" && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground/70">Does the pool have a current pool safety certificate?</p>
            <FormRadio
              name="poolQ2Option"
              options={[
                { value: "no", label: "No", testid: "contract-sp-page4-pool-q2-no" },
                { value: "yes", label: "Yes", testid: "contract-sp-page4-pool-q2-yes" },
              ]}
              value={values.poolQ2Option ?? ""}
              onChange={(v) => onChange("poolQ2Option", v)}
            />
          </div>
        )}
      </FormSection>

      <FormSection title="Electrical Safety Switch and Smoke Alarms">
        <FormCaption>NOTE: This section must be completed if there is a domestic dwelling on or comprising the Lot.</FormCaption>
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground/70">Electrical Safety Switch</p>
          <FormRadio
            name="safetySwitchOption"
            options={[
              { value: "installed", label: "Installed", testid: "contract-sp-page4-safety-switch-installed" },
              { value: "not-installed", label: "Not installed", testid: "contract-sp-page4-safety-switch-not-installed" },
            ]}
            value={values.safetySwitchOption ?? ""}
            onChange={(v) => onChange("safetySwitchOption", v)}
          />
          <FormCaption>WARNING: for giving false or misleading information in this section, the Seller may be liable to penalty. The Seller should seek expert advice if they are unsure about completing this section and not rely on the Seller&apos;s Agent to complete this section.</FormCaption>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground/70">Smoke Alarms</p>
          <FormRadio
            name="smokeAlarmsOption"
            options={[
              { value: "installed", label: "Installed", testid: "contract-sp-page4-smoke-alarms-installed" },
              { value: "not-installed", label: "Not installed", testid: "contract-sp-page4-smoke-alarms-not-installed" },
            ]}
            value={values.smokeAlarmsOption ?? ""}
            onChange={(v) => onChange("smokeAlarmsOption", v)}
          />
          <FormCaption>WARNING: Under clause 7.8 the Seller must assist in achieving or complying with the Smoke Alarm Requirement Provision in relation to each dwelling on the Lot. Failure to do so is an offence under the Fire Services Act 1990.</FormCaption>
        </div>
      </FormSection>
    </div>
  )
}
