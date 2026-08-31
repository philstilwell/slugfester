import { expect, test } from "@playwright/test";

const visualRoutes = [
  { name: "landing", path: "/" },
  {
    name: "rankings-comparison",
    path: "/rankings/?compare-a=Alex+O%27Connor&compare-b=William+Lane+Craig"
  },
  { name: "interlocutor-profile", path: "/interlocutor/alex-o-connor/" },
  { name: "debate-scorecard", path: "/debate/craig-oconnor-god-debate-2026/" },
  { name: "backend", path: "/backend/" },
  { name: "corrections", path: "/corrections/" }
];

async function prepareVisualPage(page, path) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.locator("main h1").first().waitFor();
  await page.waitForLoadState("networkidle");
  await page.addStyleTag({
    content: `
      *, *::before, *::after { animation: none !important; caret-color: transparent !important; transition: none !important; }
      ::-webkit-scrollbar { display: none !important; }
    `
  });
}

for (const { name, path } of visualRoutes) {
  test(`desktop visual contract: ${name}`, async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await prepareVisualPage(page, path);
    await expect(page).toHaveScreenshot(`${name}-desktop.png`, {
      animations: "disabled",
      maxDiffPixelRatio: 0.06,
      threshold: 0.3
    });
  });

  test(`mobile visual contract: ${name}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await prepareVisualPage(page, path);
    await expect(page).toHaveScreenshot(`${name}-mobile.png`, {
      animations: "disabled",
      maxDiffPixelRatio: 0.06,
      threshold: 0.3
    });
  });
}
