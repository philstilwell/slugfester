# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: site-quality.spec.mjs >> stays within its browser data budget: /reference/fallacy/equivocation/
- Location: tests/site-quality/site-quality.spec.mjs:87:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- main [ref=e3]:
  - paragraph [ref=e4]: Slugfester
  - heading "Equivocation" [level=1] [ref=e5]
  - paragraph [ref=e6]: "Equivocation: Shifting the meaning of a key word or phrase during the argument, making the reasoning seem stronger than it is."
  - navigation "Explore Slugfester" [ref=e7]:
    - link "Browse debates" [ref=e8] [cursor=pointer]:
      - /url: /
    - link "Search scorecards" [ref=e9] [cursor=pointer]:
      - /url: /search/
    - link "Browse topics" [ref=e10] [cursor=pointer]:
      - /url: /topics/
    - link "Compare interlocutors" [ref=e11] [cursor=pointer]:
      - /url: /rankings/
    - link "Read the assessment method" [ref=e12] [cursor=pointer]:
      - /url: /backend/
    - link "Explore research insights" [ref=e13] [cursor=pointer]:
      - /url: /insights/
    - link "Read the in-depth LogFall entry" [ref=e14] [cursor=pointer]:
      - /url: https://logfall.com/fallacies/equivocation/
  - generic [ref=e15]:
    - generic [ref=e16]:
      - heading "How to interpret this label" [level=2] [ref=e17]
      - paragraph [ref=e18]:
        - text: A label identifies a specific problem in the reasoning, not a judgment about the person. It adds no separate numerical penalty.
        - link "See the assessment standards" [ref=e19] [cursor=pointer]:
          - /url: /backend/
        - text: .
    - generic [ref=e20]:
      - heading "Examples from published debates" [level=2] [ref=e21]
      - paragraph [ref=e22]: 106 assessed occurrences in the current catalogue. These excerpts preserve the published wording and link to the complete assessment.
      - article [ref=e23]:
        - heading [level=3] [ref=e24]:
          - link "Randal Rauser vs Aron Ra — Biblical Violence and Divine Revelation · 2022" [ref=e25] [cursor=pointer]:
            - /url: /debate/rauser-aron-ra-biblical-violence-2022/
        - paragraph [ref=e26]: Aron Ra · Jesus's authority and historical reading · 40:35
        - blockquote [ref=e27]: Aron cites Jesus's teaching on ingestion and handwashing, ignorance of poisons and pathogens, and demon explanations of disease to challenge his broader authority.
        - paragraph [ref=e28]: A teaching about moral defilement becomes a claim that ingestion, pathogens, and hygiene cannot cause physical harm.
        - paragraph [ref=e29]:
          - link "Watch the original source" [ref=e30] [cursor=pointer]:
            - /url: https://www.youtube.com/watch?v=qvT2JHyxnz8
      - article [ref=e31]:
        - heading [level=3] [ref=e32]:
          - link "Trent Horn vs Dan Barker — Does the Christian God Exist? · 2018" [ref=e33] [cursor=pointer]:
            - /url: /debate/horn-barker-christian-god-2018/
        - paragraph [ref=e34]: Dan Barker · Origins, Change, and Necessary Explanation · 43:40
        - blockquote [ref=e35]: By defining power as physical work over time, Barker argues that an immaterial pure actuality cannot produce physical change, challenging Horn’s claim that a powerful divine actualizer exists.
        - paragraph [ref=e36]: Power is work over time. That’s the only way that you know what power is.
        - paragraph [ref=e37]:
          - link "Watch the original source" [ref=e38] [cursor=pointer]:
            - /url: https://www.youtube.com/watch?v=bIuDfh-6iUs
      - article [ref=e39]:
        - heading [level=3] [ref=e40]:
          - link "Trent Horn vs Dan Barker — Does the Christian God Exist? · 2018" [ref=e41] [cursor=pointer]:
            - /url: /debate/horn-barker-christian-god-2018/
        - paragraph [ref=e42]: Dan Barker · Origins, Change, and Necessary Explanation · 47:19
        - blockquote [ref=e43]: Because physical vacua yield particles without an external divine cause, the underdefined idea of something arising from nothing does not uniquely support Horn’s creation argument.
        - paragraph [ref=e44]: If you define nothing as a total empty volume of space, vacuum
        - paragraph [ref=e45]:
          - link "Watch the original source" [ref=e46] [cursor=pointer]:
            - /url: https://www.youtube.com/watch?v=bIuDfh-6iUs
      - article [ref=e47]:
        - heading [level=3] [ref=e48]:
          - link "Andrew Loke vs Dan Linford — Physical Reality, Causation, and Beginnings · 2023" [ref=e49] [cursor=pointer]:
            - /url: /debate/loke-linford-physical-reality-cause-beginning-2023/
        - paragraph [ref=e50]: Andrew Loke · Timeless grounding and physical totality · 73:52
        - blockquote [ref=e51]: Because creation, interference, and grounding are described as happenings, Loke treats them as events and argues that the proposed physical foundation remains temporal all the way down.
        - paragraph [ref=e52]: that grounding transition itself would also be a kind of event
        - paragraph [ref=e53]:
          - link "Watch the original source" [ref=e54] [cursor=pointer]:
            - /url: https://www.youtube.com/watch?v=WjVHREd0mvQ
      - article [ref=e55]:
        - heading [level=3] [ref=e56]:
          - link "Andrew Loke vs Dan Linford — Physical Reality, Causation, and Beginnings · 2023" [ref=e57] [cursor=pointer]:
            - /url: /debate/loke-linford-physical-reality-cause-beginning-2023/
        - paragraph [ref=e58]: Andrew Loke · Causal scope, design, and motion relevance · 23:32
        - blockquote [ref=e59]: Scientific interaction language and the occurrence of physical changes support treating fundamental events as causally relevant, although time-symmetric equations alone do not establish directed causation.
        - paragraph [ref=e60]: interaction in physical research is a causal term involving cause and effect
        - paragraph [ref=e61]:
          - link "Watch the original source" [ref=e62] [cursor=pointer]:
            - /url: https://www.youtube.com/watch?v=WjVHREd0mvQ
      - article [ref=e63]:
        - heading [level=3] [ref=e64]:
          - link "Christopher Hitchens vs Douglas Wilson — Truth, Goodness, and Beauty · 2008" [ref=e65] [cursor=pointer]:
            - /url: /debate/hitchens-wilson-truth-goodness-beauty-2008/
        - paragraph [ref=e66]: Douglas Wilson · Objective value and moral authority · 47:00
        - blockquote [ref=e67]: Wilson argues that although he accepts the Amalekite command as divine, naturalism's indifferent universe supplies no objective objection to the killing.
        - paragraph [ref=e68]: The universe does not care what happens, therefore Hitchens allegedly has no objection to killing.
        - paragraph [ref=e69]:
          - link "Watch the original source" [ref=e70] [cursor=pointer]:
            - /url: https://www.youtube.com/watch?v=g6UU9C-WmvM
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
  22  |   await page.waitForLoadState("networkidle");
  23  | }
  24  | 
  25  | for (const route of representativeRoutes) {
  26  |   test(`has no automatically detectable accessibility violations: ${route}`, async ({ page }) => {
  27  |     await openRenderedPage(page, route);
  28  |     const results = await new AxeBuilder({ page }).analyze();
  29  |     expect(results.violations).toEqual([]);
  30  |   });
  31  | }
  32  | 
  33  | for (const route of [
  34  |   "/",
  35  |   "/rankings/?compare-a=Alex+O%27Connor&compare-b=William+Lane+Craig",
  36  |   "/interlocutor/alex-carter/",
  37  |   "/debate/craig-oconnor-god-debate-2026/",
  38  |   "/backend/",
  39  |   "/insights/",
  40  |   "/insights/data-and-methods/",
  41  |   "/corrections/"
  42  | ]) {
  43  |   test(`fits a narrow phone viewport: ${route}`, async ({ page }) => {
  44  |     await page.setViewportSize({ width: route === "/" ? 320 : 390, height: 844 });
  45  |     await openRenderedPage(page, route);
  46  |     if (route === "/") await page.locator(".debate-card").first().scrollIntoViewIfNeeded();
  47  |     const widths = await page.evaluate(() => ({
  48  |       client: document.documentElement.clientWidth,
  49  |       scroll: document.documentElement.scrollWidth
  50  |     }));
  51  |     expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
  52  |   });
  53  | }
  54  | 
  55  | // Shared catalogue files grow with each published debate. Rebase the count and route bases
  56  | // together after a deliberate review instead of reacting to every expected small increase.
  57  | // Debate 270 measured review: docs/assessment-production/standalone-debates-v1/
  58  | // debate-270/validation/performance-review.json. All effective byte ceilings are unchanged.
  59  | const catalogueBudget = {
  60  |   baselineDebates: 270,
  61  |   bytesPerAddedDebate: 5_000,
  62  |   reviewAfterAddedDebates: 10
  63  | };
  64  | const addedDebates = Math.max(0, debateSummaries.length - catalogueBudget.baselineDebates);
  65  | const catalogueGrowthAllowance = addedDebates * catalogueBudget.bytesPerAddedDebate;
  66  | 
  67  | test("reviews the browser data baseline after ten added debates", () => {
  68  |   expect(addedDebates).toBeLessThanOrEqual(catalogueBudget.reviewAfterAddedDebates);
  69  | });
  70  | 
  71  | const routeBudgets = [
  72  |   { route: "/", baseDataBytes: 560_000, required: "debate-summaries.js" },
  73  |   { route: "/rankings/", baseDataBytes: 610_000, required: "debate-analytics.js" },
  74  |   {
  75  |     route: "/debate/craig-oconnor-god-debate-2026/",
  76  |     baseDataBytes: 645_000,
  77  |     required: "debate-details/craig-oconnor-god-debate-2026.js"
  78  |   },
  79  |   {
  80  |     route: "/reference/fallacy/equivocation/",
  81  |     baseDataBytes: 650_000,
  82  |     required: "reference-appearances/fallacy-equivocation.js"
  83  |   }
  84  | ];
  85  | 
  86  | for (const { route, baseDataBytes, required } of routeBudgets) {
  87  |   test(`stays within its browser data budget: ${route}`, async ({ page }) => {
  88  |     await openRenderedPage(page, route);
  89  |     const resources = await page.evaluate(() =>
  90  |       performance
  91  |         .getEntriesByType("resource")
  92  |         .filter((entry) => entry.name.includes("/src/data/"))
  93  |         .map((entry) => ({
  94  |           name: new URL(entry.name).pathname,
  95  |           bytes: entry.decodedBodySize
  96  |         }))
  97  |     );
  98  |     const loadedNames = resources.map(({ name }) => name);
  99  |     const loadedBytes = resources.reduce((total, resource) => total + resource.bytes, 0);
  100 | 
> 101 |     expect(loadedNames.some((name) => name.endsWith(required))).toBe(true);
      |                                                                 ^ Error: expect(received).toBe(expected) // Object.is equality
  102 |     expect(loadedNames.some((name) => name.endsWith("/src/data/debates.js"))).toBe(false);
  103 |     expect(loadedBytes).toBeLessThanOrEqual(baseDataBytes + catalogueGrowthAllowance);
  104 |   });
  105 | }
  106 | 
  107 | test("applies the generated content security policy without blocking site code", async ({ page }) => {
  108 |   const securityErrors = [];
  109 |   page.on("console", (message) => {
  110 |     if (message.type() === "error" && /Content Security Policy|Refused to/i.test(message.text())) {
  111 |       securityErrors.push(message.text());
  112 |     }
  113 |   });
  114 | 
  115 |   await openRenderedPage(page, "/debate/craig-oconnor-god-debate-2026/");
  116 |   await expect(page.locator("meta[http-equiv='Content-Security-Policy']")).toHaveCount(1);
  117 |   expect(securityErrors).toEqual([]);
  118 | });
  119 | 
  120 | test("links the Backend selection disclosure to the working Feedback recommendation form", async ({ page }) => {
  121 |   await openRenderedPage(page, "/");
  122 |   await page.getByRole("navigation", { name: "Primary", exact: true })
  123 |     .getByRole("link", { name: "Backend" }).click();
  124 | 
  125 |   await expect(page.locator(".backend-selection-copy")).toContainText(
  126 |     "not a random or representative sample"
  127 |   );
  128 | 
  129 |   await expect(page.locator(".backend-selection form")).toHaveCount(0);
  130 |   const recommendationLink = page.getByRole("link", { name: "Go to the Feedback form" });
  131 |   await expect(recommendationLink).toHaveAttribute("href", "/corrections/#recommend-a-debate");
  132 |   await recommendationLink.click();
  133 |   await expect(page).toHaveURL(/\/corrections\/#recommend-a-debate$/);
  134 |   await expect(page.locator("#feedback-recommendation-heading")).toBeInViewport();
  135 | 
  136 |   const form = page.locator(".feedback-recommendation-form");
  137 |   await expect(form).toHaveAttribute("method", "post");
  138 |   await expect(form).toHaveAttribute(
  139 |     "action",
  140 |     "https://formsubmit.co/44a747882839a1240511c0b4bca3bd95"
  141 |   );
  142 |   await expect(form.locator("input[name='debate_url']")).toHaveAttribute("required", "");
  143 |   await expect(form.locator("input[name='email']")).toHaveAttribute("required", "");
  144 | 
  145 |   const feedbackPolicy = await page
  146 |     .locator("meta[http-equiv='Content-Security-Policy']")
  147 |     .getAttribute("content");
  148 |   expect(feedbackPolicy).toContain("form-action 'self' https://formsubmit.co");
  149 | 
  150 |   let submitted;
  151 |   await page.route("https://formsubmit.co/**", async (route) => {
  152 |     submitted = route.request().postDataJSON();
  153 |     await route.fulfill({
  154 |       contentType: "text/html",
  155 |       body: "<h1>Submission intercepted</h1>"
  156 |     });
  157 |   });
  158 |   await form.locator("input[name='debate_url']").fill("https://www.youtube.com/watch?v=audit-only");
  159 |   await form.locator("input[name='email']").fill("audit@example.com");
  160 |   await form.getByRole("button", { name: "Send recommendation" }).click();
  161 |   await expect(page.getByRole("heading", { name: "Submission intercepted" })).toBeVisible();
  162 |   expect(submitted).toMatchObject({
  163 |     debate_url: "https://www.youtube.com/watch?v=audit-only",
  164 |     email: "audit@example.com",
  165 |     _next: "https://slugfester.com/corrections/?recommendation=sent#recommend-a-debate"
  166 |   });
  167 | 
  168 |   await openRenderedPage(page, "/");
  169 |   const landingPolicy = await page
  170 |     .locator("meta[http-equiv='Content-Security-Policy']")
  171 |     .getAttribute("content");
  172 |   expect(landingPolicy).toContain("form-action 'self'");
  173 |   expect(landingPolicy).toContain("form-action 'self' https://formsubmit.co");
  174 | });
  175 | 
  176 | test("the rubric quality check offers six closed-by-default section examples", async ({ page }) => {
  177 |   await openRenderedPage(page, "/backend/");
  178 | 
  179 |   const axisPeak = Number(
  180 |     (await page.locator(".section-score-y-axis span").first().textContent())?.replaceAll(",", "")
  181 |   );
  182 |   const barCounts = (await page.locator(".section-score-bar-column > span").allTextContents())
  183 |     .map((count) => Number(count.replaceAll(",", "")));
  184 |   expect(axisPeak).toBeGreaterThanOrEqual(Math.ceil(Math.max(...barCounts) * 1.1));
  185 | 
  186 |   const barStyles = await page.locator(".section-score-bar-column").evaluateAll((bars) =>
  187 |     bars.map((bar) => bar.getAttribute("style"))
  188 |   );
  189 |   const middleStart = Math.floor((barStyles.length - 1) / 2);
  190 |   const middleEnd = Math.ceil((barStyles.length - 1) / 2);
  191 |   const redExtensionIndex = Math.floor((barStyles.length - 1) * 0.65);
  192 |   const goldAnchorIndex = Math.round((barStyles.length - 1) * 0.7);
  193 |   const goldAnchorWeight = Number(
  194 |     barStyles.at(goldAnchorIndex)?.match(/var\(--gold\) ([\d.]+)%/)?.[1]
  195 |   );
  196 |   expect(barStyles.at(0)).toContain("var(--rubric-chart-red) 100.0%");
  197 |   expect(barStyles.at(redExtensionIndex)).toContain("var(--rubric-chart-red)");
  198 |   expect(goldAnchorWeight).toBeGreaterThan(99);
  199 |   expect(barStyles.slice(middleStart, middleEnd + 1).every((style) => style?.includes("var(--gold)"))).toBe(true);
  200 |   expect(barStyles.at(-1)).toContain("var(--teal) 100.0%");
  201 | 
```