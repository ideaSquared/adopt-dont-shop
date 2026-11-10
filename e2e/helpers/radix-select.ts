import type { Locator, Page } from '@playwright/test';

/**
 * Pick an option in the shared `SelectInput`, which is a Radix select: a
 * `combobox` trigger button that opens a listbox rendered in a portal outside
 * whatever dialog or form contains the trigger. `selectOption` only works on a
 * native `<select>`, so open the trigger and click the option by its visible
 * label instead.
 */
export async function chooseSelectOption(
  page: Page,
  trigger: Locator,
  optionLabel: string
): Promise<void> {
  await trigger.click();
  await page.getByRole('option', { name: optionLabel, exact: true }).click();
}
