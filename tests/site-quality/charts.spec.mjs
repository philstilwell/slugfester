import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chartSnapshot } from "../../src/data/chart-snapshot.js";

async function openCharts(page, path = "/charts/") {
  await page.goto(path);
  await expect(page.locator('nav[aria-label="Primary"] a[aria-current="page"]')).toHaveText("Charts");
}
test("charts expose all four views, frozen coverage, filters and evidence", async ({ page }) => {
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await openCharts(page);
  await expect(page.locator(".chart-panel")).toHaveCount(4);
  await expect(page.locator(".charts-snapshot-line")).toContainText(new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "America/New_York" }).format(new Date(`${chartSnapshot.date}T12:00:00Z`)));
  await page.getByRole("combobox", { name: "Question in the debate", exact: true }).selectOption("all");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator(".chart-selection-summary")).toContainText(`${chartSnapshot.debates.length} debates in scope`);
  await expect(page.locator(".chart-selection-summary")).toContainText(`${chartSnapshot.moves.length.toLocaleString("en-US")} assessed moves`);
  await page.locator('#chart-frequency h3 a').filter({ hasText: "Divine hiddenness" }).click();
  await expect(page).toHaveURL(/family=hiddenness/);
  await expect(page.locator('#chart-frequency .chart-family-row')).toHaveCount(1);
  await expect(page.locator(".chart-evidence-list article")).toHaveCount(20);
  const first = page.locator(".chart-evidence-list article h3 a").first();
  const href = await first.getAttribute("href");
  await first.click();
  await expect(page).toHaveURL(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  await expect(page.locator(href.slice(href.indexOf("#")))).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("combobox", { name: "Argument family", exact: true })).toHaveValue("hiddenness");
  expect(errors).toEqual([]);
});
test("charts filters and pagination survive direct links and history", async ({ page }) => {
  await openCharts(page, "/charts/?scope=religion&generation=standalone&family=history");
  await expect(page.getByRole("combobox", { name: "Assessment generation", exact: true })).toHaveValue("standalone");
  const first = await page.locator(".chart-evidence-list article p").first().textContent();
  await page.getByRole("link", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  expect(await page.locator(".chart-evidence-list article p").first().textContent()).not.toBe(first);
  await page.goBack();
  await expect(page.locator(".chart-evidence-list article p").first()).toHaveText(first);
  await page.getByRole("link", { name: "Reset", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Question in the debate", exact: true })).toHaveValue("god");
});
test("charts fit a phone, enlarged text, and have accessible chart labels", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCharts(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const audit = await new AxeBuilder({ page }).analyze();
  expect(audit.violations).toEqual([]);
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await expect(page.getByRole("button", { name: "Apply filters" })).toBeVisible();
});
test("charts remain readable without JavaScript and preserve the manual snapshot", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}/charts/`);
  await expect(page.locator("h1")).toHaveText("Charts");
  await expect(page.locator(".chart-panel")).toHaveCount(4);
  await expect(page.locator(".chart-evidence-list article")).toHaveCount(20);
  await expect(page.getByText("This page changes only when a new snapshot is deliberately published.", { exact: false })).toBeVisible();
  await context.close();
});
