import { assertV4 } from "./v4-lean-production.mjs";

async function waitForExactLoadedUrl(tab, url, timeoutMs) {
  const startedAt = performance.now();
  let lastObservation = null;
  while (performance.now() - startedAt < timeoutMs) {
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

async function runtimeLocationAssign(tab, url, timeoutMs) {
  const cdp = await tab.capabilities.get("cdp");
  const startedAt = performance.now();
  const response = await cdp.send("Runtime.evaluate", {
    expression: `location.assign(${JSON.stringify(url)}); true`,
    returnByValue: true
  });
  if (response.exceptionDetails) {
    throw new Error("Runtime.evaluate location.assign failed");
  }
  await waitForExactLoadedUrl(tab, url, timeoutMs);
  return Number((performance.now() - startedAt).toFixed(2));
}

function buildMemoizedCapabilities(actualTab, stats) {
  const enabledDomains = new Set();
  let cdpProxy = null;
  return {
    async get(name) {
      const capability = await actualTab.capabilities.get(name);
      if (name !== "cdp") return capability;
      if (!cdpProxy) {
        cdpProxy = {
          async send(method, parameters = {}) {
            if (/^(Runtime|Log|Network|Page)\.enable$/.test(method)) {
              if (enabledDomains.has(method)) {
                stats.memoizedDomainEnableCalls += 1;
                return {};
              }
              const response = await capability.send(method, parameters);
              enabledDomains.add(method);
              stats.actualDomainEnableCalls += 1;
              return response;
            }
            return capability.send(method, parameters);
          },
          readEvents(options) {
            return capability.readEvents(options);
          }
        };
      }
      return cdpProxy;
    }
  };
}

function buildPersistentPhaseTab({ browser, phase, stats, timeoutMs }) {
  let actualTab = null;
  let memoizedCapabilities = null;
  return {
    phase,
    async goto(url) {
      const documentPhase = new URL(url).searchParams.get("renderingPhase");
      if (!actualTab) {
        actualTab = await browser.tabs.new();
        memoizedCapabilities = buildMemoizedCapabilities(actualTab, stats);
        const startedAt = performance.now();
        await actualTab.goto(url);
        stats.initialPageNavigateCalls += 1;
        stats.initialPageNavigateMilliseconds.push(
          Number((performance.now() - startedAt).toFixed(2))
        );
        stats.navigationUrls.push({
          phase: documentPhase,
          method: "Page.navigate",
          url
        });
        return;
      }
      const elapsed = await runtimeLocationAssign(actualTab, url, timeoutMs);
      stats.runtimeLocationAssignCalls += 1;
      stats.runtimeLocationAssignMilliseconds.push(elapsed);
      stats.navigationUrls.push({
        phase: documentPhase,
        method: "Runtime.evaluate-location.assign",
        url
      });
    },
    get playwright() {
      assertV4(actualTab, `${phase}: tab not initialized`);
      return actualTab.playwright;
    },
    get capabilities() {
      assertV4(actualTab, `${phase}: tab not initialized`);
      return memoizedCapabilities;
    },
    get dev() {
      assertV4(actualTab, `${phase}: tab not initialized`);
      return actualTab.dev;
    },
    async close() {
      stats.runnerCloseCallsSuppressed += 1;
    },
    async finalize() {
      if (actualTab) {
        await actualTab.close();
        actualTab = null;
        stats.phaseTabsClosed += 1;
      }
    }
  };
}

export function createCheckpointV22RenderingRemedyV7NavigationSession({
  browser,
  timeoutMs = 15000
}) {
  assertV4(browser?.tabs && browser?.capabilities, "browser binding required");
  assertV4(
    Number.isInteger(timeoutMs) && timeoutMs === 15000,
    "frozen 15000-millisecond exact-document deadline required"
  );
  const stats = {
    initialPageNavigateCalls: 0,
    initialPageNavigateMilliseconds: [],
    runtimeLocationAssignCalls: 0,
    runtimeLocationAssignMilliseconds: [],
    navigationUrls: [],
    runnerTabRequests: 0,
    runnerCloseCallsSuppressed: 0,
    phaseTabsClosed: 0,
    viewportCalls: 0,
    actualDomainEnableCalls: 0,
    memoizedDomainEnableCalls: 0
  };
  const serial = buildPersistentPhaseTab({
    browser,
    phase: "serial-pointer-keyboard",
    stats,
    timeoutMs
  });
  let phaseIndex = 0;
  let finalized = false;
  const browserAdapter = {
    capabilities: browser.capabilities,
    tabs: {
      async new() {
        assertV4(!finalized, "navigation session already finalized");
        phaseIndex += 1;
        stats.runnerTabRequests += 1;
        return serial;
      }
    }
  };
  return {
    browser: browserAdapter,
    beginViewport() {
      assertV4(!finalized, "navigation session already finalized");
      assertV4(
        phaseIndex === stats.viewportCalls * 2,
        "prior viewport did not request exactly two phase tabs"
      );
      stats.viewportCalls += 1;
      return structuredClone(stats);
    },
    snapshot() {
      return structuredClone(stats);
    },
    async finalize() {
      if (finalized) return;
      finalized = true;
      await serial.finalize();
    }
  };
}
