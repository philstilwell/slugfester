import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const EVENT_METHODS = Object.freeze([
  "Runtime.exceptionThrown",
  "Log.entryAdded",
  "Network.requestWillBeSent",
  "Network.loadingFailed",
  "Network.responseReceived"
]);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function enableDiagnostics(tab) {
  const cdp = await tab.capabilities.get("cdp");
  for (const method of ["Runtime.enable", "Log.enable", "Network.enable", "Page.enable"]) {
    await cdp.send(method);
  }
  const version = await cdp.send("Runtime.evaluate", {
    expression: "navigator.userAgent",
    returnByValue: true
  });
  const userAgent = version?.result?.value;
  if (typeof userAgent !== "string" || !userAgent.trim()) {
    throw new Error("Runtime.evaluate did not return navigator.userAgent");
  }
  const seed = await cdp.readEvents({
    methods: EVENT_METHODS,
    limit: 1000,
    timeoutMs: 1
  });
  return { cdp, cursor: seed.cursor, userAgent };
}

async function readDiagnostics(cdp, initialCursor) {
  let cursor = initialCursor;
  let page;
  const events = [];
  do {
    page = await cdp.readEvents({
      afterSequence: cursor,
      methods: EVENT_METHODS,
      limit: 1000,
      timeoutMs: 1
    });
    events.push(...page.events);
    cursor = page.cursor;
  } while (page.hasMore);

  const requests = new Map();
  for (const event of events) {
    if (event.method === "Network.requestWillBeSent") {
      requests.set(event.params?.requestId, event.params?.request?.url ?? null);
    }
  }
  const failedRequestDetails = events.flatMap((event) => {
    if (event.method === "Network.loadingFailed") {
      return [{
        url: requests.get(event.params?.requestId) ?? null,
        reason: event.params?.errorText ?? "loading-failed",
        status: null
      }];
    }
    if (
      event.method === "Network.responseReceived" &&
      Number(event.params?.response?.status) >= 400
    ) {
      return [{
        url: event.params?.response?.url ?? requests.get(event.params?.requestId) ?? null,
        reason: "http-error",
        status: Number(event.params.response.status)
      }];
    }
    return [];
  });
  const pageErrors = events.filter(
    (event) =>
      event.method === "Runtime.exceptionThrown" ||
      (event.method === "Log.entryAdded" && event.params?.entry?.level === "error")
  );
  return {
    events,
    pageErrors,
    failedRequestDetails
  };
}

async function waitForAccordion(tab, timeoutMs) {
  const details = tab.playwright.locator("details.ai-extension-accordion");
  const summary = tab.playwright.locator("details.ai-extension-accordion > summary");
  await details.waitFor({ state: "attached", timeoutMs });
  await summary.waitFor({ state: "attached", timeoutMs });
  const visible = await tab.playwright.evaluate(() => {
    const detailsElement = document.querySelector("details.ai-extension-accordion");
    const summaryElement = detailsElement?.querySelector(":scope > summary");
    return Boolean(
      detailsElement &&
      summaryElement &&
      detailsElement.getClientRects().length > 0 &&
      summaryElement.getClientRects().length > 0
    );
  });
  if (!visible) throw new Error("AI Extension accordion is attached but not visible");
  return { details, summary };
}

async function collectRuntime(tab, diagnostics, settleMs) {
  await tab.playwright.waitForTimeout(settleMs);
  const [logs, captured] = await Promise.all([
    tab.dev.logs({ levels: ["error", "warn", "warning"], limit: 1000 }),
    readDiagnostics(diagnostics.cdp, diagnostics.cursor)
  ]);
  const consoleErrors = logs.filter((entry) => entry.level === "error");
  const consoleWarnings = logs.filter(
    (entry) => entry.level === "warn" || entry.level === "warning"
  );
  return {
    counts: {
      consoleErrors: consoleErrors.length,
      consoleWarnings: consoleWarnings.length,
      pageErrors: captured.pageErrors.length,
      failedRequests: captured.failedRequestDetails.length
    },
    details: {
      consoleErrors,
      consoleWarnings,
      pageErrors: captured.pageErrors,
      failedRequests: captured.failedRequestDetails
    }
  };
}

export async function runCheckpointV22SyntheticBrowserPreflight({
  browser,
  url,
  browserName = "Google Chrome via ChatGPT browser extension",
  timeoutMs = 15000,
  settleMs = 3000
}) {
  const tab = await browser.tabs.new();
  const startedAt = new Date().toISOString();
  try {
    await tab.goto(url);
    await tab.playwright.waitForLoadState({ state: "load", timeoutMs });
    await waitForAccordion(tab, timeoutMs);
    const diagnostics = await enableDiagnostics(tab);
    await tab.reload();
    await tab.playwright.waitForLoadState({ state: "load", timeoutMs });
    let controls = await waitForAccordion(tab, timeoutMs);
    const initialCollapsed = await controls.details.evaluate(
      (element) => element.open === false
    );
    await controls.summary.click({ timeoutMs });
    const pointerOpen = await controls.details.evaluate(
      (element) => element.open === true
    );
    await tab.reload();
    await tab.playwright.waitForLoadState({ state: "load", timeoutMs });
    controls = await waitForAccordion(tab, timeoutMs);
    const reloadedCollapsed = await controls.details.evaluate(
      (element) => element.open === false
    );
    await controls.summary.press("Enter", { timeoutMs });
    const keyboardEnterOpen = await controls.details.evaluate(
      (element) => element.open === true
    );
    await controls.summary.press("Space", { timeoutMs });
    const keyboardSpaceClose = await controls.details.evaluate(
      (element) => element.open === false
    );
    const runtime = await collectRuntime(tab, diagnostics, settleMs);
    const checks = {
      supportedNormalLoadSignal: true,
      accordionVisibleAfterInitialLoad: true,
      initialCollapsed,
      pointerOpen,
      accordionVisibleAfterReload: true,
      reloadedCollapsed,
      keyboardEnterOpen,
      keyboardSpaceClose,
      chromiumVersionViaRuntimeEvaluate: diagnostics.userAgent.includes("Chrome/")
    };
    const passed =
      Object.values(checks).every(Boolean) &&
      Object.values(runtime.counts).every((count) => count === 0);
    return {
      schemaVersion:
        "1.0-production-checkpoint-v2.2-rendering-browser-runner-preflight",
      status: passed ? "passed-synthetic-browser-runner-preflight" :
        "failed-synthetic-browser-runner-preflight",
      startedAt,
      completedAt: new Date().toISOString(),
      syntheticOnly: true,
      canaryCandidateLoaded: false,
      screenshotsCaptured: 0,
      url,
      browser: {
        name: browserName,
        userAgent: diagnostics.userAgent
      },
      checks,
      runtime,
      serviceWorkerRequestObserved: runtime.details.failedRequests.some(
        (item) => item.url?.endsWith("/service-worker.js")
      ),
      productionMutationPerformed: false
    };
  } finally {
    await tab.close();
  }
}

export async function runCheckpointV22RenderingViewport({
  browser,
  packet,
  viewportName,
  rootAbs,
  frozenSourceHashes,
  browserName = "Google Chrome via ChatGPT browser extension",
  timeoutMs = 15000,
  settleMs = 3000
}) {
  const viewport = packet.viewports[viewportName];
  if (!viewport) throw new Error(`${packet.debateNumber}: unknown viewport ${viewportName}`);
  const viewportCapability = await browser.capabilities.get("viewport");
  await viewportCapability.set({ width: viewport.width, height: viewport.height });
  const tab = await browser.tabs.new();
  try {
    await tab.goto(packet.preview.url);
    await tab.playwright.waitForLoadState({ state: "load", timeoutMs });
    await waitForAccordion(tab, timeoutMs);
    const diagnostics = await enableDiagnostics(tab);
    await tab.reload();
    await tab.playwright.waitForLoadState({ state: "load", timeoutMs });
    let controls = await waitForAccordion(tab, timeoutMs);
    const initial = await tab.playwright.evaluate((expected) => {
      const overall = document.querySelector("section.overall");
      const logical = document.querySelector("section.logical-extension");
      const details = logical?.querySelector("details.ai-extension-accordion");
      const content = logical?.querySelector(".ai-extension-accordion-content");
      const byline = document.querySelector(".assessment-model");
      const robots = document.querySelector('meta[name="robots"]');
      const banner = document.querySelector(".calibration-preview-note");
      const overallStyle = overall ? getComputedStyle(overall) : null;
      const logicalStyle = logical ? getComputedStyle(logical) : null;
      return {
        publicationStagingRoute: Boolean(document.querySelector(
          'main.debate-page[data-publication-staging-preview="true"]'
        )),
        noindex: robots?.content === "noindex,nofollow",
        stagingBanner:
          banner?.textContent.trim().startsWith(expected.stagingBannerPrefix) === true,
        exactByline: byline?.textContent.trim() === expected.byline,
        overallImmediatelyPrecedesAiExtension: overall?.nextElementSibling === logical,
        aiExtensionHeading:
          logical?.querySelector("h2")?.textContent.trim() === expected.aiExtensionHeading,
        nativeDetails: details?.tagName === "DETAILS",
        defaultCollapsed:
          details?.open === false && (content?.getClientRects().length || 0) === 0,
        twoStrengthenedFinalArguments:
          logical?.querySelectorAll(".extended-final-argument").length ===
            expected.strengthenedFinalArguments,
        newArgumentsForBothSides:
          logical?.querySelectorAll(".logical-extension-side.teal .new-argument").length ===
            expected.newArguments.pro &&
          logical?.querySelectorAll(".logical-extension-side.coral .new-argument").length ===
            expected.newArguments.con,
        distinctFromOverallCommentary:
          Boolean(logicalStyle && overallStyle) &&
          (logicalStyle.backgroundImage !== overallStyle.backgroundImage ||
            logicalStyle.backgroundColor !== overallStyle.backgroundColor ||
            logicalStyle.borderTopColor !== overallStyle.borderTopColor),
        prohibitedUnassailableAbsent:
          !document.querySelector("main")?.innerText.toLowerCase().includes("unassailable")
      };
    }, {
      ...packet.expectedDisplay,
      strengthenedFinalArguments: packet.candidate.strengthenedFinalArguments,
      newArguments: packet.candidate.newArguments
    });
    const initialMetrics = await tab.playwright.evaluate(() => {
      const elements = [...document.querySelectorAll("body *")].filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" &&
          rect.width > 0 && rect.height > 0;
      });
      return {
        documentScrollWidth: document.documentElement.scrollWidth,
        maximumElementRight: Number((elements.length
          ? Math.max(...elements.map((element) => element.getBoundingClientRect().right))
          : 0).toFixed(2)),
        innerWidth: window.innerWidth
      };
    });
    await tab.playwright.getByRole("heading", {
      name: packet.expectedDisplay.aiExtensionHeading,
      exact: true
    }).click({ timeoutMs });
    const collapsedBytes = await tab.screenshot({ fullPage: false });
    await controls.summary.click({ timeoutMs });
    await controls.details.evaluate((element) => {
      if (!element.open) throw new Error("pointer did not open AI Extension");
      return true;
    });
    const open = await tab.playwright.evaluate(() => {
      const details = document.querySelector("details.ai-extension-accordion");
      const content = document.querySelector(".ai-extension-accordion-content");
      const disclosure = document.querySelector(".logical-extension-intro");
      return {
        pointerOpen: details?.open === true,
        aiDisclosureVisibleWhenOpen:
          details?.open === true &&
          (content?.getClientRects().length || 0) > 0 &&
          disclosure?.textContent.trim().startsWith(
            "This section is an AI-generated contribution"
          ) === true
      };
    });
    const openMetrics = await tab.playwright.evaluate(() => {
      const elements = [...document.querySelectorAll("body *")].filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" &&
          rect.width > 0 && rect.height > 0;
      });
      return {
        documentScrollWidth: document.documentElement.scrollWidth,
        maximumElementRight: Number((elements.length
          ? Math.max(...elements.map((element) => element.getBoundingClientRect().right))
          : 0).toFixed(2)),
        innerWidth: window.innerWidth
      };
    });
    const openBytes = await tab.screenshot({ fullPage: false });
    await tab.reload();
    await tab.playwright.waitForLoadState({ state: "load", timeoutMs });
    controls = await waitForAccordion(tab, timeoutMs);
    const reloadedCollapsed = await controls.details.evaluate(
      (element) => element.open === false
    );
    await controls.summary.press("Enter", { timeoutMs });
    const keyboardEnterOpen = await controls.details.evaluate(
      (element) => element.open === true
    );
    await controls.summary.press("Space", { timeoutMs });
    const keyboardSpaceClose = await controls.details.evaluate(
      (element) => element.open === false
    );
    const runtime = await collectRuntime(tab, diagnostics, settleMs);
    const checks = {
      publicationStagingRoute: initial.publicationStagingRoute,
      noindex: initial.noindex,
      stagingBanner: initial.stagingBanner,
      exactByline: initial.exactByline,
      overallImmediatelyPrecedesAiExtension: initial.overallImmediatelyPrecedesAiExtension,
      aiExtensionHeading: initial.aiExtensionHeading,
      nativeDetails: initial.nativeDetails,
      defaultCollapsed: initial.defaultCollapsed && reloadedCollapsed,
      pointerOpen: open.pointerOpen,
      keyboardEnterOpen,
      keyboardSpaceClose,
      aiDisclosureVisibleWhenOpen: open.aiDisclosureVisibleWhenOpen,
      twoStrengthenedFinalArguments: initial.twoStrengthenedFinalArguments,
      newArgumentsForBothSides: initial.newArgumentsForBothSides,
      distinctFromOverallCommentary: initial.distinctFromOverallCommentary,
      prohibitedUnassailableAbsent: initial.prohibitedUnassailableAbsent,
      horizontalOverflowAbsent:
        initialMetrics.documentScrollWidth <= viewport.width &&
        openMetrics.documentScrollWidth <= viewport.width &&
        initialMetrics.maximumElementRight <= viewport.width &&
        openMetrics.maximumElementRight <= viewport.width
    };
    const collapsedPath = path.join(rootAbs, viewport.evidence.collapsedScreenshot);
    const openPath = path.join(rootAbs, viewport.evidence.openScreenshot);
    const resultPath = path.join(rootAbs, viewport.evidence.result);
    const fileHash = async (relativePath) =>
      sha256(await readFile(path.join(rootAbs, relativePath)));
    const mutations = {
      candidateChanged:
        await fileHash(packet.candidate.path) !== packet.candidate.sha256,
      productionDataChanged:
        await fileHash("src/data/debates.js") !== frozenSourceHashes["src/data/debates.js"],
      applicationCodeChanged:
        await fileHash("src/app.js") !== frozenSourceHashes["src/app.js"],
      stylesheetChanged:
        await fileHash("src/styles.css") !== frozenSourceHashes["src/styles.css"]
    };
    const passed =
      Object.values(checks).every(Boolean) &&
      Object.values(runtime.counts).every((count) => count === 0) &&
      Object.values(mutations).every((changed) => changed === false);
    const evidence = {
      schemaVersion:
        "1.0-production-checkpoint-v2.2-rendering-remedy-v1-viewport-evidence",
      protocolId: packet.protocolId,
      status: passed ? "passed-rendering-viewport" : "failed-rendering-viewport",
      recordedAt: new Date().toISOString(),
      debateNumber: packet.debateNumber,
      debateId: packet.debateId,
      viewportName,
      viewport: { width: viewport.width, height: viewport.height },
      url: packet.preview.url,
      browser: {
        name: browserName,
        version: diagnostics.userAgent
      },
      screenshots: {
        collapsed: {
          path: viewport.evidence.collapsedScreenshot,
          sha256: sha256(collapsedBytes)
        },
        open: {
          path: viewport.evidence.openScreenshot,
          sha256: sha256(openBytes)
        }
      },
      checks,
      runtime,
      metrics: {
        documentScrollWidth: initialMetrics.documentScrollWidth,
        openDocumentScrollWidth: openMetrics.documentScrollWidth,
        maximumElementRight: initialMetrics.maximumElementRight,
        openMaximumElementRight: openMetrics.maximumElementRight
      },
      mutations
    };
    if (passed) {
      const evidenceDir = path.dirname(resultPath);
      await mkdir(evidenceDir, { recursive: true });
      const screenshotWrites = await Promise.allSettled([
        writeFile(collapsedPath, collapsedBytes),
        writeFile(openPath, openBytes)
      ]);
      if (screenshotWrites.some((outcome) => outcome.status === "rejected")) {
        await Promise.all([
          rm(collapsedPath, { force: true }),
          rm(openPath, { force: true })
        ]);
        throw new Error(`${packet.debateNumber}: screenshot finalization failed`);
      }
      try {
        await writeFile(resultPath, `${JSON.stringify(evidence, null, 2)}\n`);
      } catch (error) {
        await Promise.all([
          rm(collapsedPath, { force: true }),
          rm(openPath, { force: true }),
          rm(resultPath, { force: true })
        ]);
        throw error;
      }
    }
    return evidence;
  } finally {
    await tab.close();
  }
}
