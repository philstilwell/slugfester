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
  { route: "/", dataBytes: 375_000, required: "debate-summaries.js" },
  { route: "/rankings/", dataBytes: 425_000, required: "debate-analytics.js" },
  {
    route: "/debate/craig-oconnor-god-debate-2026/",
    dataBytes: 475_000,
    required: "debate-details/craig-oconnor-god-debate-2026.js"
  },
  {
    route: "/reference/fallacy/equivocation/",
    dataBytes: 465_000,
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
