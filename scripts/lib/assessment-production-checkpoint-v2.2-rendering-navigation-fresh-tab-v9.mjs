import { assertV4 } from "./v4-lean-production.mjs";

async function waitForExactLoadedUrl(tab, url, timeoutMs, stats) {
  const startedAt = performance.now();
  let lastObservation = null;
  while (performance.now() - startedAt < timeoutMs) {
    stats.exactUrlReadyStatePolls += 1;
    try {
      lastObservation = await tab.playwright.evaluate(() => ({
        href: location.href,
        readyState: document.readyState
      }));
    } catch {
      lastObservation = null;
    }
    if (
      lastObservation?.href === url &&
      lastObservation?.readyState === "complete"
    ) {
      return Number((performance.now() - startedAt).toFixed(2));
    }
    await tab.playwright.waitForTimeout(50);
  }
  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for exact loaded URL: ` +
      JSON.stringify(lastObservation)
  );
}

function wrapFreshKeyboardTab(actualTab, timeoutMs, stats) {
  let navigationIndex = 0;
  let closed = false;
  return {
    get playwright() { return actualTab.playwright; },
    get dev() { return actualTab.dev; },
    get capabilities() { return actualTab.capabilities; },
    get cua() { return actualTab.cua; },
    get dom_cua() { return actualTab.dom_cua; },
    async goto(url) {
      navigationIndex += 1;
      assertV4(
        navigationIndex <= 2,
        "remedy-v9 fresh keyboard tab permits exactly two documents"
      );
      if (navigationIndex === 1) {
        const startedAt = performance.now();
        await actualTab.goto(url);
        stats.initialPageNavigateCalls += 1;
        stats.initialPageNavigateMilliseconds.push(
          Number((performance.now() - startedAt).toFixed(2))
        );
        stats.navigationUrls.push({ method: "Page.navigate", url });
        return;
      }
      const cdp = await actualTab.capabilities.get("cdp");
      const startedAt = performance.now();
      const response = await cdp.send("Runtime.evaluate", {
        expression: `location.assign(${JSON.stringify(url)}); true`,
        returnByValue: true
      });
      assertV4(
        !response.exceptionDetails,
        "remedy-v9 Runtime.evaluate location.assign failed"
      );
      const exactLoadMilliseconds = await waitForExactLoadedUrl(
        actualTab,
        url,
        timeoutMs,
        stats
      );
      stats.runtimeLocationAssignCalls += 1;
      stats.runtimeLocationAssignMilliseconds.push(
        Number((performance.now() - startedAt).toFixed(2))
      );
      stats.exactLoadedUrlMilliseconds.push(exactLoadMilliseconds);
      stats.navigationUrls.push({
        method: "Runtime.evaluate-location.assign-exact-url-readyState-poll",
        url
      });
    },
    async close() {
      if (closed) return;
      closed = true;
      await actualTab.close();
      stats.tabsClosed += 1;
    }
  };
}

export function createCheckpointV22RenderingRemedyV9FreshKeyboardBrowser({
  browser,
  timeoutMs = 15000
}) {
  assertV4(browser?.tabs && browser?.capabilities, "keyboard browser required");
  assertV4(
    timeoutMs === 15000,
    "frozen 15000-millisecond exact-document deadline required"
  );
  const stats = {
    tabRequests: 0,
    tabsClosed: 0,
    initialPageNavigateCalls: 0,
    initialPageNavigateMilliseconds: [],
    runtimeLocationAssignCalls: 0,
    runtimeLocationAssignMilliseconds: [],
    exactLoadedUrlMilliseconds: [],
    exactUrlReadyStatePolls: 0,
    navigationUrls: []
  };
  return {
    browser: {
      capabilities: browser.capabilities,
      tabs: {
        async new() {
          stats.tabRequests += 1;
          return wrapFreshKeyboardTab(
            await browser.tabs.new(),
            timeoutMs,
            stats
          );
        }
      }
    },
    snapshot() {
      return structuredClone(stats);
    }
  };
}
