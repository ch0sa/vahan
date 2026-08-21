import { expect, test } from "@playwright/test";

test("shows the honest prototype disclosure", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /move your vehicle paperwork forward/i })).toBeVisible();
  await expect(page.locator("footer")).toContainText(/sample data only.*not a government website/i);
});

test("offers a searchable research-backed service catalogue", async ({ page }) => {
  await page.goto("/services?vehicle=KA01AB1234");
  await expect(page.getByText("21 services shown")).toBeVisible();
  await page.getByRole("searchbox", { name: "Find a service" }).fill("hypothecation");
  await expect(page.getByText("2 services shown")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Add vehicle finance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Remove vehicle finance" })).toBeVisible();
});
