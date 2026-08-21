import { test, expect } from "@playwright/test";
test.describe("public accessibility baseline", () => {
  test("public page has landmarks, a skip link, and no horizontal overflow", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("a.skip-link")).toBeVisible();
    await expect(page.locator("main#main")).toBeVisible();
    const mobileNavigation = page.getByRole("navigation", { name: "Mobile navigation" });
    if ((page.viewportSize()?.width ?? 1000) <= 900) await expect(mobileNavigation).toBeVisible();
    else await expect(mobileNavigation).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  });
  test("locale persists and Kannada critical disclosure is visible", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("combobox", { name: "Language" }).selectOption("kn");
    await expect(page.locator("html")).toHaveAttribute("lang", "kn");
    await expect(page.locator("footer")).toContainText(/ಮಾದರಿ ಮಾಹಿತಿ ಮಾತ್ರ.*ಸರ್ಕಾರಿ ಜಾಲತಾಣವಲ್ಲ/);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "kn");
  });
  test("unauthenticated users cannot enter a protected seller route", async ({ page }) => {
    await page.goto("/seller");
    await expect(page).toHaveURL(/\/auth\/sign-in\?error=session-required/);
    await expect(page.locator("p.form-alert")).toBeVisible();
  });
});
