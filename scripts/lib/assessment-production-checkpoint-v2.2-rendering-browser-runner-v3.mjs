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
  const summaryVisible = await summary.evaluate(
    (element) => element.getClientRects().length > 0
  );
  if (!summaryVisible) throw new Error("AI Extension summary is not visible");
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

async function observeAccordion(tab) {
  return tab.playwright.evaluate(() => {
    const details = document.querySelector("details.ai-extension-accordion");
    const content = document.querySelector(".ai-extension-accordion-content");
    const rect = content.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + Math.min(10, Math.max(1, rect.height / 2));
    const sampleWithinViewport =
      x >= 0 && x < window.innerWidth && y >= 0 && y < window.innerHeight;
    const hit = sampleWithinViewport ? document.elementFromPoint(x, y) : null;
    return {
      detailsOpen: details.open,
      openAttributePresent: details.hasAttribute("open"),
      contentClientRectCount: content.getClientRects().length,
      contentComputedDisplay: getComputedStyle(content).display,
      contentBoundingRect: {
        left: Number(rect.left.toFixed(2)),
        top: Number(rect.top.toFixed(2)),
        width: Number(rect.width.toFixed(2)),
        height: Number(rect.height.toFixed(2))
      },
      hitTestSample: {
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        withinViewport: sampleWithinViewport,
        hitTag: hit?.tagName ?? null,
        hitClass: typeof hit?.className === "string" ? hit.className : null,
        contentOrDescendantHit: hit === content || content.contains(hit)
      }
    };
  });
}

function tokenizedUrl(base, { token, viewportName, phase, stage }) {
  const url = new URL(base);
  url.searchParams.set("renderingExecution", token);
  url.searchParams.set("renderingViewport", viewportName);
  url.searchParams.set("renderingPhase", phase);
  url.searchParams.set("renderingStage", stage);
  return url.href;
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

export async function runCheckpointV22RenderingRemedyV3Viewport({
  browser,
  packet,
  viewportName,
  activationNavigationToken,
  rootAbs,
  frozenSourceHashes,
  browserName = "Google Chrome via ChatGPT browser extension",
  timeoutMs = 15000,
  settleMs = 3000
}) {
  if (!/^[a-f0-9]{64}$/.test(activationNavigationToken)) {
    throw new Error("A frozen 64-character activation navigation token is required");
  }
  const viewport = packet.viewports[viewportName];
  if (!viewport) throw new Error(`${packet.debateNumber}: unknown viewport`);
  const target = viewport.targetCssViewport;
  const controller = await browser.capabilities.get("viewport");
  const bootstrapBase =
    `http://127.0.0.1:${new URL(packet.preview.url).port}/` +
    packet.runnerPolicy.diagnosticBootstrapPath;
  const startedAt = new Date().toISOString();
  let pointer;
  let keyboard;

  await controller.set(viewport.controllerInput);
  const pointerTab = await browser.tabs.new();
  try {
    const bootstrapUrl = tokenizedUrl(bootstrapBase, {
      token: activationNavigationToken,
      viewportName,
      phase: "pointer",
      stage: "bootstrap"
    });
    await pointerTab.goto(bootstrapUrl);
    await pointerTab.playwright.waitForLoadState({ state: "load", timeoutMs });
    const diagnostics = await enableDiagnostics(pointerTab);
    const measuredUrl = tokenizedUrl(packet.preview.url, {
      token: activationNavigationToken,
      viewportName,
      phase: "pointer",
      stage: "measured"
    });
    await pointerTab.goto(measuredUrl);
    await pointerTab.playwright.waitForLoadState({ state: "load", timeoutMs });
    const controls = await waitForAccordion(pointerTab, timeoutMs);
    await controls.summary.evaluate(
      (element) => element.scrollIntoView({ block: "center", inline: "nearest" })
    );
    const freshState = await observeAccordion(pointerTab);
    const freshMetrics = await measureLayout(pointerTab);
    const initial = await pointerTab.playwright.evaluate((expected) => {
      const overall = document.querySelector("section.overall");
      const logical = document.querySelector("section.logical-extension");
      const details = logical?.querySelector("details.ai-extension-accordion");
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
    const collapsedBytes = await pointerTab.screenshot({ fullPage: false });
    await controls.summary.click({ timeoutMs });
    const openState = await observeAccordion(pointerTab);
    const openMetrics = await measureLayout(pointerTab);
    const aiDisclosureVisibleWhenOpen = await pointerTab.playwright.evaluate(() => {
      const disclosure = document.querySelector(".logical-extension-intro");
      return disclosure?.textContent.trim().startsWith(
        "This section is an AI-generated contribution"
      ) === true;
    });
    const openBytes = await pointerTab.screenshot({ fullPage: false });
    const runtime = await collectRuntime(pointerTab, diagnostics, settleMs);
    pointer = {
      userAgent: diagnostics.userAgent,
      bootstrapUrl,
      measuredUrl,
      initial,
      freshState,
      freshMetrics,
      openState,
      openMetrics,
      aiDisclosureVisibleWhenOpen,
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
    const bootstrapUrl = tokenizedUrl(bootstrapBase, {
      token: activationNavigationToken,
      viewportName,
      phase: "keyboard",
      stage: "bootstrap"
    });
    await keyboardTab.goto(bootstrapUrl);
    await keyboardTab.playwright.waitForLoadState({ state: "load", timeoutMs });
    const diagnostics = await enableDiagnostics(keyboardTab);
    const measuredUrl = tokenizedUrl(packet.preview.url, {
      token: activationNavigationToken,
      viewportName,
      phase: "keyboard",
      stage: "measured"
    });
    await keyboardTab.goto(measuredUrl);
    await keyboardTab.playwright.waitForLoadState({ state: "load", timeoutMs });
    const controls = await waitForAccordion(keyboardTab, timeoutMs);
    await controls.summary.evaluate(
      (element) => element.scrollIntoView({ block: "center", inline: "nearest" })
    );
    const freshState = await observeAccordion(keyboardTab);
    const freshMetrics = await measureLayout(keyboardTab);
    await controls.summary.press("Enter", { timeoutMs });
    const afterEnter = await observeAccordion(keyboardTab);
    await controls.summary.press("Space", { timeoutMs });
    const afterSpace = await observeAccordion(keyboardTab);
    const runtime = await collectRuntime(keyboardTab, diagnostics, settleMs);
    keyboard = {
      userAgent: diagnostics.userAgent,
      bootstrapUrl,
      measuredUrl,
      freshState,
      freshMetrics,
      afterEnter,
      afterSpace,
      runtime
    };
  } finally {
    await keyboardTab.close();
  }

  const pointerFreshHit = pointer.freshState.hitTestSample;
  const pointerOpenHit = pointer.openState.hitTestSample;
  const keyboardFreshHit = keyboard.freshState.hitTestSample;
  const keyboardEnterHit = keyboard.afterEnter.hitTestSample;
  const keyboardSpaceHit = keyboard.afterSpace.hitTestSample;
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
    pointerFreshDetailsClosed: pointer.freshState.detailsOpen === false,
    pointerFreshOpenAttributeAbsent:
      pointer.freshState.openAttributePresent === false,
    pointerFreshContentNotHitTestVisible:
      pointerFreshHit.withinViewport === true &&
      pointerFreshHit.contentOrDescendantHit === false,
    pointerOpen: pointer.openState.detailsOpen === true,
    pointerOpenAttributePresent: pointer.openState.openAttributePresent === true,
    pointerContentHitTestVisible:
      pointerOpenHit.withinViewport === true &&
      pointerOpenHit.contentOrDescendantHit === true,
    keyboardFreshDetailsClosed: keyboard.freshState.detailsOpen === false,
    keyboardFreshOpenAttributeAbsent:
      keyboard.freshState.openAttributePresent === false,
    keyboardFreshContentNotHitTestVisible:
      keyboardFreshHit.withinViewport === true &&
      keyboardFreshHit.contentOrDescendantHit === false,
    keyboardEnterOpen: keyboard.afterEnter.detailsOpen === true,
    keyboardEnterOpenAttributePresent:
      keyboard.afterEnter.openAttributePresent === true,
    keyboardContentHitTestVisibleAfterEnter:
      keyboardEnterHit.withinViewport === true &&
      keyboardEnterHit.contentOrDescendantHit === true,
    keyboardSpaceClosed: keyboard.afterSpace.detailsOpen === false,
    keyboardSpaceOpenAttributeAbsent:
      keyboard.afterSpace.openAttributePresent === false,
    keyboardContentNotHitTestVisibleAfterSpace:
      keyboardSpaceHit.withinViewport === true &&
      keyboardSpaceHit.contentOrDescendantHit === false,
    aiDisclosureVisibleWhenOpen: pointer.aiDisclosureVisibleWhenOpen,
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
      "1.0-production-checkpoint-v2.2-rendering-remedy-v3-viewport-evidence",
    protocolId: packet.protocolId,
    status: passed ? "passed-rendering-viewport" : "failed-rendering-viewport",
    startedAt,
    recordedAt: new Date().toISOString(),
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    viewportName,
    navigationToken: activationNavigationToken,
    viewport: {
      targetCssViewport: { ...target },
      controllerInput: { ...viewport.controllerInput }
    },
    url: packet.preview.url,
    navigationUrls: {
      pointerBootstrap: pointer.bootstrapUrl,
      pointerMeasured: pointer.measuredUrl,
      keyboardBootstrap: keyboard.bootstrapUrl,
      keyboardMeasured: keyboard.measuredUrl
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
    rawAccordionStates: {
      pointerFresh: pointer.freshState,
      pointerOpen: pointer.openState,
      keyboardFresh: keyboard.freshState,
      keyboardAfterEnter: keyboard.afterEnter,
      keyboardAfterSpace: keyboard.afterSpace
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
