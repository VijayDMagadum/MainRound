import { test, expect } from "@playwright/test";

test.describe("Monsoon Saathi End-to-End Flow", () => {
  test("should load landing page successfully", async ({ page }) => {
    await page.goto("/");
    // Since page redirects to /en or /[locale], verify locale redirection
    await expect(page).toHaveURL(/\/en$/);
    
    // Verify hero text
    const title = page.locator("h1");
    await expect(title).toContainText("Monsoon Saathi");
  });

  test("should open demo mode successfully", async ({ page }) => {
    await page.goto("/en/dashboard?demo=true");
    await expect(page).toHaveURL(/demo=true/);
    
    // Verify demo banner is active
    const demoBanner = page.locator("text=Demo Mode Active");
    await expect(demoBanner).toBeVisible();

    // Verify location matches Mumbai
    const locText = page.locator("text=Mumbai");
    await expect(locText).toBeVisible();
  });

  test("should load onboarding wizard", async ({ page }) => {
    await page.goto("/en/onboarding");
    
    // Verify Step 1 heading
    const heading = page.locator("h2");
    await expect(heading).toContainText("Step 1");
  });

  test("should load safety checklist page", async ({ page }) => {
    await page.goto("/en/checklist");
    // Verify presence of reset or checklist items
    const title = page.locator("h1");
    await expect(title).toContainText("Emergency Checklist");
  });

  test("should load AI assistant interface", async ({ page }) => {
    await page.goto("/en/assistant");
    const input = page.locator("input[placeholder*='Ask about']");
    await expect(input).toBeVisible();
  });

  test("should load privacy and about pages", async ({ page }) => {
    await page.goto("/en/privacy");
    await expect(page.locator("h1")).toContainText("Privacy");

    await page.goto("/en/about");
    await expect(page.locator("h1")).toContainText("About");
  });
});
