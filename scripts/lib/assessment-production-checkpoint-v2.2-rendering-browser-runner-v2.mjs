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
  if (typeof userAgent !== "string" || !userAgent.includes("Chrome/")) {
    throw new Error("Runtime.evaluate did not return a Chromium user agent");
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
  const failedRequests = events.flatMap((event) => {
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
        url: event.params?.response?.url ??
          requests.get(event.params?.requestId) ?? null,
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
  return { pageErrors, failedRequests };
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
      failedRequests: captured.failedRequests.length
    },
    details: {
      consoleErrors,
      consoleWarnings,
      pageErrors: captured.pageErrors,
      failedRequests: captured.failedRequests
    }
  };
}

function combineRuntime(pointer, keyboard) {
  const keys = ["consoleErrors", "consoleWarnings", "pageErrors", "failedRequests"];
  return {
    counts: Object.fromEntries(
      keys.map((key) => [key, pointer.counts[key] + keyboard.counts[key]])
    ),
    phases: { pointer, keyboard }
  };
}

async function waitForAccordion(tab, timeoutMs) {
  const details = tab.playwright.locator("details.ai-extension-accordion");
  const summary = tab.playwright.locator(
    "details.ai-extension-accordion > summary"
  );
  await details.waitFor({ state: "attached", timeoutMs });
  await summary.waitFor({ state: "attached", timeoutMs });
  const visible = await tab.playwright.evaluate(() => {
    const detailsElement = document.querySelector(
      "details.ai-extension-accordion"
    );
    const summaryElement = detailsElement?.querySelector(":scope > summary");
    return Boolean(
      detailsElement &&
      summaryElement &&
      detailsElement.getClientRects().length > 0 &&
      summaryElement.getClientRects().length > 0
    );
  });
  if (!visible) throw new Error("AI Extension accordion is not visible");
  return { details, summary };
}

async function measureLayout(tab) {
  return tab.playwright.evaluate(() => {
    const elements = [...document.querySelectorAll("body *")].filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
      );
    });
    return {
      actualInnerWidth: window.innerWidth,
      actualInnerHeight: window.innerHeight,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      devicePixelRatio: window.devicePixelRatio,
      visualViewportWidth: window.visualViewport?.width ?? null,
      visualViewportHeight: window.visualViewport?.height ?? null,
      documentScrollWidth: document.documentElement.scrollWidth,
      maximumElementRight: Number((elements.length
        ? Math.max(...elements.map(
          (element) => element.getBoundingClientRect().right
        ))
        : 0).toFixed(2))
    };
  });
}

function phaseUrl(base, phase) {
  const url = new URL(base);
  url.searchParams.set("renderingPhase", phase);
  return url.href;
}

async function bootstrapDiagnostics({ tab, bootstrapUrl, timeoutMs }) {
  await tab.goto(bootstrapUrl);
  await tab.playwright.waitForLoadState({ state: "load", timeoutMs });
  return enableDiagnostics(tab);
}

function viewportMatches(metrics, target) {
  return (
    metrics.actualInnerWidth === target.width &&
    metrics.actualInnerHeight === target.height
  );
}

function noOverflow(metrics) {
  return (
    metrics.documentScrollWidth <= metrics.actualInnerWidth &&
    metrics.maximumElementRight <= metrics.actualInnerWidth
  );
}

export async function runCheckpointV22RenderingRemedyV2Viewport({
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
  if (!viewport) throw new Error(`${packet.debateNumber}: unknown viewport`);
  const target = viewport.targetCssViewport;
  const controller = await browser.capabilities.get("viewport");
  const bootstrapUrl =
    `http://127.0.0.1:${new URL(packet.preview.url).port}/` +
    packet.runnerPolicy.diagnosticBootstrapPath;
  const startedAt = new Date().toISOString();
  let pointer;
  let keyboard;

  await controller.set(viewport.controllerInput);
  const pointerTab = await browser.tabs.new();
  try {
    const diagnostics = await bootstrapDiagnostics({
      tab: pointerTab,
      bootstrapUrl,
      timeoutMs
    });
    const measuredUrl = phaseUrl(packet.preview.url, "pointer");
    await pointerTab.goto(measuredUrl);
    await pointerTab.playwright.waitForLoadState({ state: "load", timeoutMs });
    const controls = await waitForAccordion(pointerTab, timeoutMs);
    const initial = await pointerTab.playwright.evaluate((expected) => {
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
        pointerFreshLoadCollapsed:
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
          !document.querySelector("main")?.innerText.toLowerCase().includes(
            "unassailable"
          )
      };
    }, {
      ...packet.expectedDisplay,
      strengthenedFinalArguments: packet.candidate.strengthenedFinalArguments,
      newArguments: packet.candidate.newArguments
    });
    const freshMetrics = await measureLayout(pointerTab);
    await pointerTab.playwright.getByRole("heading", {
      name: packet.expectedDisplay.aiExtensionHeading,
      exact: true
    }).click({ timeoutMs });
    const collapsedBytes = await pointerTab.screenshot({ fullPage: false });
    await controls.summary.click({ timeoutMs });
    const openState = await pointerTab.playwright.evaluate(() => {
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
    const openMetrics = await measureLayout(pointerTab);
    const openBytes = await pointerTab.screenshot({ fullPage: false });
    const runtime = await collectRuntime(pointerTab, diagnostics, settleMs);
    pointer = {
      userAgent: diagnostics.userAgent,
      measuredUrl,
      initial,
      freshMetrics,
      openState,
      openMetrics,
      collapsedBytes,
      openBytes,
      runtime
    };
  } finally {
    await pointerTab.close();
  }

  await controller.set(viewport.controllerInput);
  const keyboardTab = await browser.tabs.new();
  try {
    const diagnostics = await bootstrapDiagnostics({
      tab: keyboardTab,
      bootstrapUrl,
      timeoutMs
    });
    const measuredUrl = phaseUrl(packet.preview.url, "keyboard");
    await keyboardTab.goto(measuredUrl);
    await keyboardTab.playwright.waitForLoadState({ state: "load", timeoutMs });
    const controls = await waitForAccordion(keyboardTab, timeoutMs);
    const freshMetrics = await measureLayout(keyboardTab);
    const keyboardFreshLoadCollapsed = await controls.details.evaluate(
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
    const runtime = await collectRuntime(keyboardTab, diagnostics, settleMs);
    keyboard = {
      userAgent: diagnostics.userAgent,
      measuredUrl,
      freshMetrics,
      keyboardFreshLoadCollapsed,
      keyboardEnterOpen,
      keyboardSpaceClose,
      runtime
    };
  } finally {
    await keyboardTab.close();
  }

  const runtime = combineRuntime(pointer.runtime, keyboard.runtime);
  const checks = {
    publicationStagingRoute: pointer.initial.publicationStagingRoute,
    noindex: pointer.initial.noindex,
    stagingBanner: pointer.initial.stagingBanner,
    exactByline: pointer.initial.exactByline,
    overallImmediatelyPrecedesAiExtension:
      pointer.initial.overallImmediatelyPrecedesAiExtension,
    aiExtensionHeading: pointer.initial.aiExtensionHeading,
    nativeDetails: pointer.initial.nativeDetails,
    pointerFreshLoadCollapsed: pointer.initial.pointerFreshLoadCollapsed,
    pointerOpen: pointer.openState.pointerOpen,
    keyboardFreshLoadCollapsed: keyboard.keyboardFreshLoadCollapsed,
    keyboardEnterOpen: keyboard.keyboardEnterOpen,
    keyboardSpaceClose: keyboard.keyboardSpaceClose,
    aiDisclosureVisibleWhenOpen: pointer.openState.aiDisclosureVisibleWhenOpen,
    twoStrengthenedFinalArguments: pointer.initial.twoStrengthenedFinalArguments,
    newArgumentsForBothSides: pointer.initial.newArgumentsForBothSides,
    distinctFromOverallCommentary: pointer.initial.distinctFromOverallCommentary,
    prohibitedUnassailableAbsent: pointer.initial.prohibitedUnassailableAbsent,
    pointerActualViewportMatchesRequested:
      viewportMatches(pointer.freshMetrics, target),
    openActualViewportMatchesRequested:
      viewportMatches(pointer.openMetrics, target),
    keyboardActualViewportMatchesRequested:
      viewportMatches(keyboard.freshMetrics, target),
    horizontalOverflowAbsent:
      noOverflow(pointer.freshMetrics) &&
      noOverflow(pointer.openMetrics) &&
      noOverflow(keyboard.freshMetrics)
  };
  const fileHash = async (relativePath) =>
    sha256(await readFile(path.join(rootAbs, relativePath)));
  const mutations = {
    candidateChanged:
      await fileHash(packet.candidate.path) !== packet.candidate.sha256,
    productionDataChanged:
      await fileHash("src/data/debates.js") !==
        frozenSourceHashes["src/data/debates.js"],
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
      "1.0-production-checkpoint-v2.2-rendering-remedy-v2-viewport-evidence",
    protocolId: packet.protocolId,
    status: passed ? "passed-rendering-viewport" : "failed-rendering-viewport",
    startedAt,
    recordedAt: new Date().toISOString(),
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    viewportName,
    viewport: {
      targetCssViewport: { ...target },
      controllerInput: { ...viewport.controllerInput }
    },
    url: packet.preview.url,
    phaseUrls: {
      pointer: pointer.measuredUrl,
      keyboard: keyboard.measuredUrl
    },
    browser: {
      name: browserName,
      pointerUserAgent: pointer.userAgent,
      keyboardUserAgent: keyboard.userAgent
    },
    screenshots: {
      collapsed: {
        path: viewport.evidence.collapsedScreenshot,
        sha256: sha256(pointer.collapsedBytes)
      },
      open: {
        path: viewport.evidence.openScreenshot,
        sha256: sha256(pointer.openBytes)
      }
    },
    checks,
    accordionStates: {
      pointerFreshLoadCollapsed: pointer.initial.pointerFreshLoadCollapsed,
      pointerOpen: pointer.openState.pointerOpen,
      keyboardFreshLoadCollapsed: keyboard.keyboardFreshLoadCollapsed,
      keyboardEnterOpen: keyboard.keyboardEnterOpen,
      keyboardSpaceClose: keyboard.keyboardSpaceClose
    },
    metrics: {
      pointerFreshLoad: pointer.freshMetrics,
      pointerOpen: pointer.openMetrics,
      keyboardFreshLoad: keyboard.freshMetrics
    },
    runtime,
    mutations
  };
  if (passed) {
    const resultPath = path.join(rootAbs, viewport.evidence.result);
    const collapsedPath = path.join(
      rootAbs,
      viewport.evidence.collapsedScreenshot
    );
    const openPath = path.join(rootAbs, viewport.evidence.openScreenshot);
    await mkdir(path.dirname(resultPath), { recursive: true });
    const writes = await Promise.allSettled([
      writeFile(collapsedPath, pointer.collapsedBytes),
      writeFile(openPath, pointer.openBytes)
    ]);
    if (writes.some((outcome) => outcome.status === "rejected")) {
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
}
