import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const representativeRoutes = [
  "/",
  "/search/?q=god",
  "/rankings/?compare-a=Alex+O%27Connor&compare-b=William+Lane+Craig",
  "/interlocutor/alex-carter/",
  "/debate/craig-oconnor-god-debate-2026/",
  "/debate/horn-bertuzzi-oconnor-schmid-problem-evil-2022/",
  "/backend/",
  "/corrections/",
  "/reference/fallacy/equivocation/"
];

async function openRenderedPage(page, route) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.locator("main h1").first().waitFor();
  await page.waitForLoadState("networkidle");
}

for (const route of representativeRoutes) {
  test(`has no automatically detectable accessibility violations: ${route}`, async ({ page }) => {
    await openRenderedPage(page, route);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}

for (const route of [
  "/",
  "/rankings/?compare-a=Alex+O%27Connor&compare-b=William+Lane+Craig",
  "/interlocutor/alex-carter/",
  "/debate/craig-oconnor-god-debate-2026/",
  "/backend/",
  "/corrections/"
]) {
  test(`fits a narrow phone viewport: ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openRenderedPage(page, route);
    const widths = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
  });
}

const routeBudgets = [
  { route: "/", dataBytes: 395_000, required: "debate-summaries.js" },
  { route: "/rankings/", dataBytes: 445_000, required: "debate-analytics.js" },
  {
    route: "/debate/craig-oconnor-god-debate-2026/",
    dataBytes: 480_000,
    required: "debate-details/craig-oconnor-god-debate-2026.js"
  },
  {
    route: "/reference/fallacy/equivocation/",
    dataBytes: 470_000,
    required: "reference-appearances/fallacy-equivocation.js"
  }
];

for (const { route, dataBytes, required } of routeBudgets) {
  test(`stays within its browser data budget: ${route}`, async ({ page }) => {
    await openRenderedPage(page, route);
    const resources = await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .filter((entry) => entry.name.includes("/src/data/"))
        .map((entry) => ({
          name: new URL(entry.name).pathname,
          bytes: entry.decodedBodySize
        }))
    );
    const loadedNames = resources.map(({ name }) => name);
    const loadedBytes = resources.reduce((total, resource) => total + resource.bytes, 0);

    expect(loadedNames.some((name) => name.endsWith(required))).toBe(true);
    expect(loadedNames.some((name) => name.endsWith("/src/data/debates.js"))).toBe(false);
    expect(loadedBytes).toBeLessThanOrEqual(dataBytes);
  });
}

test("applies the generated content security policy without blocking site code", async ({ page }) => {
  const securityErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /Content Security Policy|Refused to/i.test(message.text())) {
      securityErrors.push(message.text());
    }
  });

  await openRenderedPage(page, "/debate/craig-oconnor-god-debate-2026/");
  await expect(page.locator("meta[http-equiv='Content-Security-Policy']")).toHaveCount(1);
  expect(securityErrors).toEqual([]);
});

test("clearly limits the catalogue sample and provides a valid debate recommendation form", async ({ page }) => {
  await openRenderedPage(page, "/backend/");

  await expect(page.locator(".backend-selection-copy")).toContainText(
    "not a random or representative sample"
  );

  const form = page.locator(".backend-recommendation-form");
  await expect(form).toHaveAttribute("method", "post");
  await expect(form).toHaveAttribute(
    "action",
    "https://formsubmit.co/44a747882839a1240511c0b4bca3bd95"
  );
  await expect(form.locator("input[name='debate_url']")).toHaveAttribute("required", "");
  await expect(form.locator("input[name='email']")).toHaveAttribute("required", "");

  const backendPolicy = await page
    .locator("meta[http-equiv='Content-Security-Policy']")
    .getAttribute("content");
  expect(backendPolicy).toContain("form-action 'self' https://formsubmit.co");

  await openRenderedPage(page, "/");
  const landingPolicy = await page
    .locator("meta[http-equiv='Content-Security-Policy']")
    .getAttribute("content");
  expect(landingPolicy).toContain("form-action 'self'");
  expect(landingPolicy).not.toContain("form-action 'self' https://formsubmit.co");
});

test("the rubric quality check offers six closed-by-default section examples", async ({ page }) => {
  await openRenderedPage(page, "/backend/");

  const accordion = page.locator(".rubric-extremes-accordion");
  await expect(accordion).not.toHaveAttribute("open", "");
  await accordion.locator("summary").click();
  await expect(accordion).toHaveAttribute("open", "");
  await expect(accordion.locator(".rubric-extremes-column--top .rubric-extreme-card")).toHaveCount(3);
  await expect(accordion.locator(".rubric-extremes-column--bottom .rubric-extreme-card")).toHaveCount(3);
  await expect(accordion).toContainText("section-side scores, not overall debate results");
});

test("carries a scorecard into the issue-report form and confirms delivery", async ({ page }) => {
  const debatePath = "/debate/craig-oconnor-god-debate-2026/";
  await openRenderedPage(page, debatePath);

  const reportLink = page.getByRole("link", { name: "Report a possible scorecard issue" });
  await expect(reportLink).toHaveAttribute(
    "href",
    "/corrections/?debate=craig-oconnor-god-debate-2026#report-scorecard-issue"
  );
  await reportLink.click();
  await expect(page).toHaveURL(/\/corrections\/\?debate=craig-oconnor-god-debate-2026#report-scorecard-issue$/);

  const form = page.locator(".correction-report-form");
  await expect(form).toHaveAttribute("method", "post");
  await expect(form).toHaveAttribute(
    "action",
    "https://formsubmit.co/44a747882839a1240511c0b4bca3bd95"
  );
  await expect(form.locator("input[name='page_url']")).toHaveValue(
    `https://slugfester.com${debatePath}`
  );
  await expect(form.locator("input[name='_subject']")).toHaveValue(
    "Slugfester scorecard issue: Debate 01"
  );
  await expect(form.locator("input[name='debate_id']")).toHaveValue(
    "craig-oconnor-god-debate-2026"
  );

  for (const field of ["page_url", "issue_type", "observed_problem", "supporting_evidence", "email"]) {
    await expect(form.locator(`[name='${field}']`)).toHaveAttribute("required", "");
  }

  const correctionsPolicy = await page
    .locator("meta[http-equiv='Content-Security-Policy']")
    .getAttribute("content");
  expect(correctionsPolicy).toContain("form-action 'self' https://formsubmit.co");

  await openRenderedPage(page, "/corrections/?report=sent#report-scorecard-issue");
  await expect(page.locator(".correction-report-success")).toContainText("Report sent");
});

test("serves every URL advertised in the sitemap", async ({ request }) => {
  test.setTimeout(120_000);
  const sitemapResponse = await request.get("/sitemap.xml");
  expect(sitemapResponse.ok()).toBe(true);
  const sitemap = await sitemapResponse.text();
  const paths = [...sitemap.matchAll(/<loc>https:\/\/slugfester\.com([^<]+)<\/loc>/g)].map(
    (match) => match[1]
  );

  expect(paths.length).toBeGreaterThan(400);
  for (const path of paths) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
  }

  for (const path of ["/feed.xml", "/robots.txt", "/site.webmanifest"]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
  }
});

test("keyboard users can skip directly to the main content", async ({ page }) => {
  await openRenderedPage(page, "/");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("the selected primary navigation item has a thin black border", async ({ page }) => {
  await openRenderedPage(page, "/search/");
  const selectedLink = page.locator('nav[aria-label="Primary"] [aria-current="page"]');
  await expect(selectedLink).toHaveText("Search");
  await expect(selectedLink).toHaveCSS("border-top-width", "1px");
  await expect(selectedLink).toHaveCSS("border-top-color", "rgb(0, 0, 0)");
});

for (const route of ["/", "/rankings/", "/interlocutor/alex-o-connor/", "/corrections/"]) {
  test(`remains usable with text enlarged to 200 percent: ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openRenderedPage(page, route);
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    const widths = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
  });
}

test("core navigation remains available in forced-colors mode", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await openRenderedPage(page, "/corrections/");
  await expect(page.getByRole("link", { name: "Debates", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Report a possible correction" })).toBeVisible();
});
