# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: site-quality.spec.mjs >> fits a narrow phone viewport: /backend/
- Location: tests/site-quality/site-quality.spec.mjs:45:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('nav[aria-label="Primary"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('nav[aria-label="Primary"]')

```

```yaml
- main:
  - paragraph: Slugfester
  - heading "Backend" [level=1]
  - paragraph: Backend explains Slugfester's full-transcript review, independent judgments, deterministic scoring, validation controls, update plans, and campaign compute estimate.
  - navigation "Explore Slugfester":
    - link "Browse debates":
      - /url: /
    - link "Search scorecards":
      - /url: /search/
    - link "Browse topics":
      - /url: /topics/
    - link "Compare interlocutors":
      - /url: /rankings/
    - link "Read the assessment method":
      - /url: /backend/
    - link "Explore research insights":
      - /url: /insights/
    - link "Explore argument charts":
      - /url: /charts/
    - 'link "PDF report: Why Do the Theist Sides Score Lower?"':
      - /url: /output/pdf/why-do-the-theist-sides-score-lower.pdf
    - 'link "PDF report: Where Is the Theist Disadvantage Largest?"':
      - /url: /output/pdf/where-is-the-theist-disadvantage-largest.pdf
    - 'link "PDF report: Are Theist Arguments More Often Slogan-Like?"':
      - /url: /output/pdf/are-theist-arguments-more-often-slogan-like.pdf
    - 'link "PDF report: Does the CON Side Have an Inherent Advantage?"':
      - /url: /output/pdf/does-the-con-side-have-an-inherent-advantage.pdf
    - 'link "PDF report: Beyond the Fallacy Count"':
      - /url: /output/pdf/debates-are-usually-lost-without-a-named-fallacy.pdf
    - 'link "PDF report: Are All Slugfester Assessments on the Same Scale?"':
      - /url: /output/pdf/are-all-slugfester-assessments-on-the-same-scale.pdf
    - 'link "PDF report: Do Slugfester Rankings Measure Stable Performance?"':
      - /url: /output/pdf/do-slugfester-rankings-measure-stable-performance.pdf
  - region "From debate to scorecard":
    - heading "From debate to scorecard" [level=2]
    - paragraph: The standard one-on-one workflow · September 2026. Earlier scorecards may use different controls. Select a panel to enlarge it.
    - link "Download PDF (3.6 MB)":
      - /url: /assets/assessment-process/slugfester-assessment-process.pdf
    - link "Skip to the rubric quality check":
      - /url: "#rubric-quality-check"
    - group:
      - strong: Prefer text? Read the complete guide
    - figure "Part 1 of 3 · Evidence before verdicts Back to guide options":
      - 'link "View part 1 at full size: Evidence before verdicts"':
        - /url: /assets/assessment-process/panel-1.webp
        - 'img "Part 1: Evidence before verdicts. Define the debate, secure the complete source, lock the argument map, and resolve two isolated reviews. Full text is available in the reading option above."'
      - text: Part 1 of 3 · Evidence before verdicts
      - link "Back to guide options":
        - /url: "#assessment-process"
    - figure "Part 2 of 3 · Judgments become scores Back to guide options":
      - 'link "View part 2 at full size: Judgments become scores"':
        - /url: /assets/assessment-process/panel-2.webp
        - 'img "Part 2: Judgments become scores. The six weighted dimensions, move-to-section-to-overall calculations, worked examples, and stability checks. Full text is available in the reading option above."'
      - text: Part 2 of 3 · Judgments become scores
      - link "Back to guide options":
        - /url: "#assessment-process"
    - figure "Part 3 of 3 · Explain. Challenge. Verify Back to guide options":
      - 'link "View part 3 at full size: Explain. Challenge. Verify"':
        - /url: /assets/assessment-process/panel-3.webp
        - 'img "Part 3: Explain. Challenge. Verify. Explain the scores, review fallacies and biases separately, distinguish AI contributions, and verify publication. Full text is available in the reading option above."'
      - text: Part 3 of 3 · Explain. Challenge. Verify
      - link "Back to guide options":
        - /url: "#assessment-process"
  - heading "Explore the assessments" [level=2]
  - paragraph:
    - text: The live distribution graph is available with JavaScript enabled.
    - link "Read the research methods and limitations":
      - /url: /insights/data-and-methods/
    - text: ","
    - link "browse all debate summaries":
      - /url: /search/
    - text: ", or"
    - link "report a possible scorecard issue":
      - /url: /corrections/
    - text: .
  - paragraph:
    - text: Have a debate in mind?
    - link "See which debates qualify and suggest a debate on the Feedback page":
      - /url: /corrections/#recommend-a-debate
    - text: .
```

# Test source

```ts
  1   | import AxeBuilder from "@axe-core/playwright";
  2   | import { expect, test } from "@playwright/test";
  3   | import { debateSummaries } from "../../src/data/debate-summaries.js";
  4   | 
  5   | const representativeRoutes = [
  6   |   "/",
  7   |   "/search/?q=god",
  8   |   "/rankings/?compare-a=Alex+O%27Connor&compare-b=William+Lane+Craig",
  9   |   "/interlocutor/alex-carter/",
  10  |   "/debate/craig-oconnor-god-debate-2026/",
  11  |   "/debate/horn-bertuzzi-oconnor-schmid-problem-evil-2022/",
  12  |   "/backend/",
  13  |   "/insights/",
  14  |   "/insights/data-and-methods/",
  15  |   "/corrections/",
  16  |   "/reference/fallacy/equivocation/"
  17  | ];
  18  | 
  19  | async function openRenderedPage(page, route) {
  20  |   await page.goto(route, { waitUntil: "domcontentloaded" });
  21  |   await page.locator("main h1").first().waitFor();
  22  |   // The first heading can belong to the static fallback; wait for the live shell.
> 23  |   await expect(page.locator('nav[aria-label="Primary"]')).toBeVisible();
      |                                                           ^ Error: expect(locator).toBeVisible() failed
  24  |   await page.waitForLoadState("networkidle");
  25  | }
  26  | 
  27  | for (const route of representativeRoutes) {
  28  |   test(`has no automatically detectable accessibility violations: ${route}`, async ({ page }) => {
  29  |     await openRenderedPage(page, route);
  30  |     const results = await new AxeBuilder({ page }).analyze();
  31  |     expect(results.violations).toEqual([]);
  32  |   });
  33  | }
  34  | 
  35  | for (const route of [
  36  |   "/",
  37  |   "/rankings/?compare-a=Alex+O%27Connor&compare-b=William+Lane+Craig",
  38  |   "/interlocutor/alex-carter/",
  39  |   "/debate/craig-oconnor-god-debate-2026/",
  40  |   "/backend/",
  41  |   "/insights/",
  42  |   "/insights/data-and-methods/",
  43  |   "/corrections/"
  44  | ]) {
  45  |   test(`fits a narrow phone viewport: ${route}`, async ({ page }) => {
  46  |     await page.setViewportSize({ width: route === "/" ? 320 : 390, height: 844 });
  47  |     await openRenderedPage(page, route);
  48  |     if (route === "/") await page.locator(".debate-card").first().scrollIntoViewIfNeeded();
  49  |     const widths = await page.evaluate(() => ({
  50  |       client: document.documentElement.clientWidth,
  51  |       scroll: document.documentElement.scrollWidth
  52  |     }));
  53  |     expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
  54  |   });
  55  | }
  56  | 
  57  | // Shared catalogue files grow with each published debate. Rebase the count and route bases
  58  | // together after a deliberate review instead of reacting to every expected small increase.
  59  | // Debate 303 measured review: docs/assessment-production/standalone-debates-v1/
  60  | // debate-303/validation/performance-review.json. All effective byte ceilings are unchanged.
  61  | const catalogueBudget = {
  62  |   baselineDebates: 303,
  63  |   bytesPerAddedDebate: 5_000,
  64  |   reviewAfterAddedDebates: 10
  65  | };
  66  | const addedDebates = Math.max(0, debateSummaries.length - catalogueBudget.baselineDebates);
  67  | const catalogueGrowthAllowance = addedDebates * catalogueBudget.bytesPerAddedDebate;
  68  | 
  69  | test("reviews the browser data baseline after ten added debates", () => {
  70  |   expect(addedDebates).toBeLessThanOrEqual(catalogueBudget.reviewAfterAddedDebates);
  71  | });
  72  | 
  73  | const routeBudgets = [
  74  |   { route: "/", baseDataBytes: 725_000, required: "debate-summaries.js" },
  75  |   { route: "/rankings/", baseDataBytes: 775_000, required: "debate-analytics.js" },
  76  |   {
  77  |     route: "/debate/craig-oconnor-god-debate-2026/",
  78  |     baseDataBytes: 810_000,
  79  |     required: "debate-details/craig-oconnor-god-debate-2026.js"
  80  |   },
  81  |   {
  82  |     route: "/reference/fallacy/equivocation/",
  83  |     baseDataBytes: 815_000,
  84  |     required: "reference-appearances/fallacy-equivocation.js"
  85  |   }
  86  | ];
  87  | 
  88  | for (const { route, baseDataBytes, required } of routeBudgets) {
  89  |   test(`stays within its browser data budget: ${route}`, async ({ page }) => {
  90  |     await openRenderedPage(page, route);
  91  |     const resources = await page.evaluate(() =>
  92  |       performance
  93  |         .getEntriesByType("resource")
  94  |         .filter((entry) => entry.name.includes("/src/data/"))
  95  |         .map((entry) => ({
  96  |           name: new URL(entry.name).pathname,
  97  |           bytes: entry.decodedBodySize
  98  |         }))
  99  |     );
  100 |     const loadedNames = resources.map(({ name }) => name);
  101 |     const loadedBytes = resources.reduce((total, resource) => total + resource.bytes, 0);
  102 | 
  103 |     expect(loadedNames.some((name) => name.endsWith(required))).toBe(true);
  104 |     expect(loadedNames.some((name) => name.endsWith("/src/data/debates.js"))).toBe(false);
  105 |     expect(loadedBytes).toBeLessThanOrEqual(baseDataBytes + catalogueGrowthAllowance);
  106 |   });
  107 | }
  108 | 
  109 | test("applies the generated content security policy without blocking site code", async ({ page }) => {
  110 |   const securityErrors = [];
  111 |   page.on("console", (message) => {
  112 |     if (message.type() === "error" && /Content Security Policy|Refused to/i.test(message.text())) {
  113 |       securityErrors.push(message.text());
  114 |     }
  115 |   });
  116 | 
  117 |   await openRenderedPage(page, "/debate/craig-oconnor-god-debate-2026/");
  118 |   await expect(page.locator("meta[http-equiv='Content-Security-Policy']")).toHaveCount(1);
  119 |   expect(securityErrors).toEqual([]);
  120 | });
  121 | 
  122 | test("links the Backend selection disclosure to the working Feedback recommendation form", async ({ page }) => {
  123 |   await openRenderedPage(page, "/");
```