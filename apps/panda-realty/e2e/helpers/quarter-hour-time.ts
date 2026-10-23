import type { Locator, Page } from "@playwright/test"

/**
 * Sets hour + quarter-minute via board meeting/reminder Radix Selects.
 * Hour list shows "00".."23"; minute list shows "00","15","30","45".
 */
export async function pickQuarterHourTime(
  page: Page,
  scope: Locator,
  hourTestId: string,
  minuteTestId: string,
  timeHm: string,
) {
  const [hs, ms] = timeHm.split(":")
  if (hs == null || ms == null) throw new Error(`pickQuarterHourTime: expected HH:MM, got "${timeHm}"`)
  const hourLabel = hs.padStart(2, "0")
  const minuteLabel = ms.padStart(2, "0")

  await scope.getByTestId(hourTestId).click()
  await page.getByRole("option", { name: hourLabel, exact: true }).click()
  await scope.getByTestId(minuteTestId).click()
  await page.getByRole("option", { name: minuteLabel, exact: true }).click()
}
