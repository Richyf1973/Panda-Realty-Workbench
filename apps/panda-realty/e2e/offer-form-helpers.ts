import type { Page } from "@playwright/test"

import type { PrefillData } from "../components/offer-form/offer-form-types"

export const OFFER_FORM_PREFILL = {
  propertyAddress: "195/46 Amy Street, Morayfield, QLD, 4506",
  buyers: [{ name: "Sandesh Panta", phone: "0449 192 053", email: "sandesh.panta15@gmail.com", address: "12 Smith Street, Brisbane" }],
  rep: null,
  solicitorName: null,
  solicitorPhone: null,
  solicitorAddress: null,
  solicitorEmail: null,
} satisfies Pick<PrefillData, "propertyAddress" | "buyers" | "rep" | "solicitorName" | "solicitorPhone" | "solicitorAddress" | "solicitorEmail">

export function mockOfferFormGet(page: Page) {
  return page.route("**/api/offer-form/abc123token**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_PREFILL) })
      return
    }
    await route.fallback()
  })
}

export async function checkMultiOfferBoxes(page: Page) {
  await page.getByTestId("offer-form-multi-offer-highest").check()
  await page.getByTestId("offer-form-multi-offer-discretion").check()
  await page.getByTestId("offer-form-multi-offer-confidential").check()
}

export function mockOfferFormGetAndPost(
  page: Page,
  captured: { body: Record<string, unknown> | null },
) {
  return page.route("**/api/offer-form/abc123token**", async (route) => {
    if (route.request().method() === "POST") {
      captured.body = (await route.request().postDataJSON()) as Record<string, unknown>
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER_FORM_PREFILL) })
  })
}
