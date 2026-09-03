import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

async function openPage(page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("main h1").first().waitFor();
  return {
    trigger: page.getByRole("button", { name: "External Sites" }),
    links: page.locator("#external-sites-links")
  };
}

test("external sites stay hidden until hover and remain usable inside the dropdown", async ({ page }) => {
  const { trigger, links } = await openPage(page);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(links).toBeHidden();
  await trigger.hover();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(links).toBeVisible();
  await expect(links).toContainText("Logical fallacies explained with examples and practice tools.");
  await expect(links).toContainText("Cognitive biases explained, with tools for clearer judgment.");

  for (const name of ["LogFall", "CogBias"]) {
    const link = links.getByRole("link", { name });
    await link.hover();
    await expect(links).toBeVisible();
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(links).toBeHidden();
  await page.locator("main h1").first().hover();
  await trigger.hover();
  await expect(links).toBeVisible();
  await page.locator("main h1").first().hover();
  await expect(links).toBeHidden();

  await page.getByRole("navigation", { name: "Primary", exact: true }).getByRole("link", { name: "Backend" }).click();
  await expect(page).toHaveURL(/\/backend\//);
  await expect(links).toBeHidden();
  await trigger.hover();
  await expect(links).toBeVisible();
});

test("external sites support keyboard activation, tabbing, and Escape", async ({ page }) => {
  const { trigger, links } = await openPage(page);
  await trigger.focus();
  await expect(links).toBeHidden();
  await page.keyboard.press("Enter");
  await expect(links).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(links.getByRole("link", { name: "LogFall" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(links.getByRole("link", { name: "CogBias" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(links).toBeHidden();
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Space");
  await expect(links).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  await expect(links).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("the dropdown stays on screen when the navigation wraps", async ({ page }) => {
  for (const width of [641, 760, 820, 900]) {
    await page.setViewportSize({ width, height: 1000 });
    const { trigger, links } = await openPage(page);
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(links).toBeVisible();
    const bounds = await links.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    await links.getByRole("link", { name: "LogFall" }).hover();
    await expect(links).toBeVisible();
  }
});

test.describe("external sites on touchscreens", () => {
  test.use({ hasTouch: true, viewport: { width: 900, height: 1000 } });

  test("tap toggles the dropdown, outside tap closes it, and it fits the screen", async ({ page }) => {
    const { trigger, links } = await openPage(page);
    await expect(trigger).toBeVisible();
    await expect(links).toBeHidden();
    await trigger.tap();
    await expect(links).toBeVisible();
    const bounds = await links.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(900);
    await trigger.tap();
    await expect(links).toBeHidden();
    await trigger.tap();
    await expect(links).toBeVisible();
    await page.touchscreen.tap(5, Math.ceil(bounds.y + bounds.height + 20));
    await expect(links).toBeHidden();
  });

  test("the compact phone header keeps its existing footer links", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const { trigger, links } = await openPage(page);
    await expect(trigger).toBeHidden();
    await expect(links).toBeHidden();
    const footer = page.getByRole("navigation", { name: "Footer" });
    await expect(footer.getByRole("link", { name: "LogFall" })).toHaveAttribute("href", "https://logfall.com/");
    await expect(footer.getByRole("link", { name: "CogBias" })).toHaveAttribute("href", "https://cogbias.site/");
  });
});
