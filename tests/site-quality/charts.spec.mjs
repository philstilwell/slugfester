import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chartSnapshot } from "../../src/data/chart-snapshot.js";
import { chartSnapshotName } from "../../src/data/charts.js";

async function openCharts(page, path = "/backend/#charts") {
  await page.goto(path);
  await expect(page.locator('nav[aria-label="Primary"] a[aria-current="page"]')).toHaveText("Backend");
  await expect(page.locator('nav[aria-label="Primary"]').getByRole("link", { name: "Charts", exact: true })).toHaveCount(0);
}
test("charts expose all four views, frozen coverage, filters and evidence", async ({ page }) => {
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await openCharts(page);
  await expect(page.locator(".chart-panel")).toHaveCount(4);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator(".backend-report")).toHaveCount(0);
  await page.getByText("Classifications and exclusions", { exact: true }).click();
  await expect(page.locator(".chart-review-status")).toBeVisible();
  await expect(page.getByRole("link", { name: "Download the complete dated snapshot (JSON)", exact: true })).toHaveAttribute("href", `/docs/charts/snapshots/${chartSnapshotName(chartSnapshot)}.json`);
  await expect(page.locator(".charts-snapshot-line")).toContainText(new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "America/New_York" }).format(new Date(`${chartSnapshot.date}T12:00:00Z`)));
  await page.getByRole("combobox", { name: "Question in the debate", exact: true }).selectOption("all");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator(".chart-selection-summary")).toContainText(`${chartSnapshot.debates.length} debates in scope`);
  await expect(page.locator(".chart-selection-summary")).toContainText(`${chartSnapshot.moves.length.toLocaleString("en-US")} assessed moves`);
  await page.locator('#chart-frequency h4 a').filter({ hasText: "Divine hiddenness" }).click();
  await expect(page).toHaveURL(/family=hiddenness/);
  await expect(page.locator('#chart-frequency .chart-family-row')).toHaveCount(1);
  await expect(page.locator(".chart-evidence-list article")).toHaveCount(20);
  const first = page.locator(".chart-evidence-list article h4 a").first();
  const href = await first.getAttribute("href");
  await first.click();
  await expect(page).toHaveURL(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  await expect(page.locator(href.slice(href.indexOf("#")))).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("combobox", { name: "Argument family", exact: true })).toHaveValue("hiddenness");
  expect(errors).toEqual([]);
});
test("charts filters and pagination survive direct links and history", async ({ page }) => {
  await openCharts(page, "/charts/?scope=religion&generation=standalone&family=history&threshold=80#chart-dimensions");
  await expect(page).toHaveURL(/\/backend\/\?scope=religion&family=history&threshold=80#chart-dimensions$/);
  await expect(page.getByRole("slider", { name: "Score threshold", exact: true })).toHaveValue("80");
  await expect(page.getByRole("combobox", { name: "Assessment generation", exact: true })).toHaveCount(0);
  await expect(page).not.toHaveURL(/generation=/);
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
test("dimension threshold updates every five points, preserves focus and filters, and resets to 70", async ({ page }) => {
  await openCharts(page);
  const slider = page.getByRole("slider", { name: "Score threshold", exact: true });
  await expect(slider).toHaveValue("70");
  await expect(slider).toHaveAttribute("min", "50");
  await expect(slider).toHaveAttribute("max", "100");
  await expect(slider).toHaveAttribute("step", "5");
  for (let threshold = 50; threshold <= 100; threshold += 5) {
    await slider.press(threshold === 50 ? "Home" : "ArrowRight");
    await expect(slider).toHaveValue(String(threshold));
    await expect(slider).toBeFocused();
    await expect(page.locator("#chart-threshold-value")).toHaveText(String(threshold));
    await expect(page.locator(".chart-heatmap caption")).toContainText(`below ${threshold},`);
    const groups = new Map();
    for (const m of chartSnapshot.moves.filter((m) => chartSnapshot.debates[m.d].scope === "god" && m.p === 0 && m.f.includes("morality"))) {
      if (!groups.has(m.d)) groups.set(m.d, []);
      groups.get(m.d).push(m.x[0]);
    }
    const expected = [...groups.values()].reduce((total, values) => total + values.filter((v) => v < threshold).length / values.length * 100, 0) / groups.size;
    await expect(page.locator(".chart-heatmap tbody tr").first().locator("td").first()).toHaveText(`${Number(expected.toFixed(1))}%`);
    expect(new URL(page.url()).searchParams.get("threshold")).toBe(threshold === 70 ? null : String(threshold));
  }
  await page.getByRole("combobox", { name: "Question in the debate", exact: true }).selectOption("all");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(slider).toHaveValue("100");
  await page.locator('#chart-frequency h4 a').filter({ hasText: "Divine hiddenness" }).click();
  await expect(slider).toHaveValue("100");
  await page.reload();
  await expect(slider).toHaveValue("100");
  await page.getByRole("link", { name: "Reset", exact: true }).click();
  await expect(slider).toHaveValue("70");
});
test("charts remain readable without JavaScript and preserve the manual snapshot", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}/backend/`);
  await expect(page.locator("h1")).toHaveText("Backend");
  await expect(page.locator(".chart-panel")).toHaveCount(4);
  await expect(page.getByRole("slider")).toHaveCount(0);
  await expect(page.locator(".chart-heatmap caption")).toContainText("below 70,");
  await expect(page.locator(".chart-evidence-list article")).toHaveCount(20);
  await expect(page.getByText("These charts change only when a new snapshot is deliberately published.", { exact: false })).toBeVisible();
  await context.close();
});
