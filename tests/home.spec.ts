import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("should display the title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Trading Platform/);
  });

  test("should have a link to trading dashboard", async ({ page }) => {
    await page.goto("/");
    const dashboardLink = page.getByRole("link", { name: /open dashboard/i });
    await expect(dashboardLink).toBeVisible();
  });
});

test.describe("Trading Dashboard", () => {
  test("should load the trading page", async ({ page }) => {
    await page.goto("/trading");
    await expect(page.getByRole("heading", { name: /trading dashboard/i })).toBeVisible();
  });
});
