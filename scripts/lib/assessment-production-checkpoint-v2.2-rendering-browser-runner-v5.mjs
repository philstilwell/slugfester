import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const EVENT_METHODS = Object.freeze([
  "Runtime.exceptionThrown",
  "Log.entryAdded",
  "Network.requestWillBeSent",
  "Network.loadingFailed",
  "Network.responseReceived"
]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function runtimeEvaluate(cdp, expression) {
  const response = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true
  });
  if (response.exceptionDetails) throw new Error("Runtime.evaluate failed");
  return response.result?.value;
}
async function enableDiagnostics(tab) {
  const cdp = await tab.capabilities.get("cdp");
  for (const method of ["Runtime.enable", "Log.enable", "Network.enable", "Page.enable"]) {
    await cdp.send(method);
  }
  const userAgent = await runtimeEvaluate(cdp, "navigator.userAgent");
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

async function readyAccordion(cdp, { focus = false } = {}) {
  const result = await runtimeEvaluate(cdp, `(() => {
    const details = document.querySelector("details.ai-extension-accordion");
    const summary = document.querySelector("details.ai-extension-accordion > summary");
    const content = document.querySelector(".ai-extension-accordion-content");
    if (summary) summary.scrollIntoView({ block: "center", inline: "nearest" });
    if (summary && ${focus ? "true" : "false"}) summary.focus();
    const rect = summary?.getBoundingClientRect();
    return {
      ready: Boolean(details && summary && content && rect && rect.width > 0 && rect.height > 0),
      summaryFocused: document.activeElement === summary,
      summaryRect: rect ? {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      } : null
    };
  })()`);
  if (!result?.ready || (focus && !result.summaryFocused)) {
    throw new Error("AI Extension summary failed direct runtime readiness");
  }
  return result;
}

async function observeAccordion(cdp) {
  return runtimeEvaluate(cdp, `(() => {
    const details = document.querySelector("details.ai-extension-accordion");
    const content = document.querySelector(".ai-extension-accordion-content");
    const rect = content.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + Math.min(10, Math.max(1, rect.height / 2));
    const withinViewport =
      x >= 0 && x < window.innerWidth && y >= 0 && y < window.innerHeight;
    const hit = withinViewport ? document.elementFromPoint(x, y) : null;
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
        withinViewport,
        hitTag: hit?.tagName ?? null,
        hitClass: typeof hit?.className === "string" ? hit.className : null,
        contentOrDescendantHit: hit === content || content.contains(hit)
      }
    };
  })()`);
}

async function measureLayout(cdp) {
  return runtimeEvaluate(cdp, `(() => {
    const elements = [...document.querySelectorAll("body *")].filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" &&
        rect.width > 0 && rect.height > 0;
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
        ? Math.max(...elements.map((element) => element.getBoundingClientRect().right))
        : 0).toFixed(2))
    };
  })()`);
}

async function inspectInitial(cdp, expected) {
  return runtimeEvaluate(cdp, `(() => {
    const expected = ${JSON.stringify(expected)};
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
        !document.querySelector("main")?.innerText.toLowerCase().includes("unassailable")
    };
  })()`);
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
  return metrics.actualInnerWidth === target.width &&
    metrics.actualInnerHeight === target.height;
}

function noOverflow(metrics) {
  return metrics.documentScrollWidth <= metrics.actualInnerWidth &&
    metrics.maximumElementRight <= metrics.actualInnerWidth;
}

async function captureJpeg(cdp) {
  const response = await cdp.send("Page.captureScreenshot", {
    format: "jpeg",
    quality: 85,
    fromSurface: true,
    captureBeyondViewport: false
  });
  return Buffer.from(response.data, "base64");
}

async function analyzeJpeg(bytes, analyzerPath) {
  const temporary = await mkdtemp(path.join(tmpdir(), "slugfester-v5-image-"));
  const file = path.join(temporary, "capture.jpg");
  try {
    await writeFile(file, bytes);
    const raw = execFileSync(analyzerPath, [
      "identify",
      "-format",
      '{"format":"%m","pixelWidth":%w,"pixelHeight":%h,"uniqueColors":%k,"meanNormalized":%[fx:mean],"entropy":%[entropy]}',
      file
    ], { encoding: "utf8" });
    return {
      ...JSON.parse(raw),
      signatureHex: bytes.subarray(0, 8).toString("hex"),
      byteLength: bytes.length
    };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

function imageChecks(analysis, viewport, target, ratio, contract) {
  return {
    jpeg: analysis.format === contract.format &&
      analysis.signatureHex === contract.signatureHex,
    nonblank: analysis.byteLength >= contract.minimumByteLength &&
      analysis.uniqueColors >= contract.minimumUniqueColors &&
      analysis.entropy >= contract.minimumEntropy,
    dimensions:
      analysis.pixelWidth === viewport.controllerInput.width &&
      analysis.pixelHeight === viewport.controllerInput.height &&
      analysis.pixelWidth === Math.round(target.width * ratio) &&
      analysis.pixelHeight === Math.round(target.height * ratio)
  };
}

export async function runCheckpointV22RenderingRemedyV5Viewport({
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
  const analyzerBytes = await readFile(packet.runnerPolicy.imageAnalyzerPath);
  if (sha256(analyzerBytes) !== packet.runnerPolicy.imageAnalyzerSha256) {
    throw new Error("Frozen image analyzer hash mismatch");
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
    await pointerTab.playwright.waitForTimeout(
      packet.runnerPolicy.postLoadSettleMilliseconds
    );
    const readiness = await readyAccordion(diagnostics.cdp);
    const freshState = await observeAccordion(diagnostics.cdp);
    const freshMetrics = await measureLayout(diagnostics.cdp);
    const initial = await inspectInitial(diagnostics.cdp, {
      ...packet.expectedDisplay,
      strengthenedFinalArguments: packet.candidate.strengthenedFinalArguments,
      newArguments: packet.candidate.newArguments
    });
    const collapsedBytes = await captureJpeg(diagnostics.cdp);
    const collapsedTransport = await analyzeJpeg(
      collapsedBytes,
      packet.runnerPolicy.imageAnalyzerPath
    );
    const x = readiness.summaryRect.left + readiness.summaryRect.width / 2;
    const y = readiness.summaryRect.top + readiness.summaryRect.height / 2;
    await diagnostics.cdp.send("Input.dispatchMouseEvent", {
      type: "mousePressed", x, y, button: "left", clickCount: 1
    });
    await diagnostics.cdp.send("Input.dispatchMouseEvent", {
      type: "mouseReleased", x, y, button: "left", clickCount: 1
    });
    const openState = await observeAccordion(diagnostics.cdp);
    const openMetrics = await measureLayout(diagnostics.cdp);
    const aiDisclosureVisibleWhenOpen = await runtimeEvaluate(
      diagnostics.cdp,
      `document.querySelector(".logical-extension-intro")?.textContent.trim().startsWith("This section is an AI-generated contribution") === true`
    );
    const openBytes = await captureJpeg(diagnostics.cdp);
    const openTransport = await analyzeJpeg(
      openBytes,
      packet.runnerPolicy.imageAnalyzerPath
    );
    const runtime = await collectRuntime(pointerTab, diagnostics, settleMs);
    pointer = {
      userAgent: diagnostics.userAgent,
      bootstrapUrl,
      measuredUrl,
      initial,
      readiness,
      freshState,
      freshMetrics,
      openState,
      openMetrics,
      aiDisclosureVisibleWhenOpen,
      collapsedBytes,
      collapsedTransport,
      openBytes,
      openTransport,
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
    await keyboardTab.playwright.waitForTimeout(
      packet.runnerPolicy.postLoadSettleMilliseconds
    );
    const readiness = await readyAccordion(diagnostics.cdp, { focus: true });
    const freshState = await observeAccordion(diagnostics.cdp);
    const freshMetrics = await measureLayout(diagnostics.cdp);
    const summary = keyboardTab.playwright.locator(
      "details.ai-extension-accordion > summary"
    );
    await summary.press("Enter", { timeoutMs });
    const afterEnter = await observeAccordion(diagnostics.cdp);
    await summary.press("Space", { timeoutMs });
    const afterSpace = await observeAccordion(diagnostics.cdp);
    const runtime = await collectRuntime(keyboardTab, diagnostics, settleMs);
    keyboard = {
      userAgent: diagnostics.userAgent,
      bootstrapUrl,
      measuredUrl,
      readiness,
      freshState,
      freshMetrics,
      afterEnter,
      afterSpace,
      runtime
    };
  } finally {
    await keyboardTab.close();
  }

  const runtime = combineRuntime(pointer.runtime, keyboard.runtime);
  const collapsedImageChecks = imageChecks(
    pointer.collapsedTransport,
    viewport,
    target,
    pointer.freshMetrics.devicePixelRatio,
    packet.runnerPolicy.imageContract
  );
  const openImageChecks = imageChecks(
    pointer.openTransport,
    viewport,
    target,
    pointer.freshMetrics.devicePixelRatio,
    packet.runnerPolicy.imageContract
  );
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
      pointer.freshState.hitTestSample.withinViewport === true &&
      pointer.freshState.hitTestSample.contentOrDescendantHit === false,
    pointerOpen: pointer.openState.detailsOpen === true,
    pointerOpenAttributePresent: pointer.openState.openAttributePresent === true,
    pointerContentHitTestVisible:
      pointer.openState.hitTestSample.withinViewport === true &&
      pointer.openState.hitTestSample.contentOrDescendantHit === true,
    keyboardFreshDetailsClosed: keyboard.freshState.detailsOpen === false,
    keyboardFreshOpenAttributeAbsent:
      keyboard.freshState.openAttributePresent === false,
    keyboardFreshContentNotHitTestVisible:
      keyboard.freshState.hitTestSample.withinViewport === true &&
      keyboard.freshState.hitTestSample.contentOrDescendantHit === false,
    keyboardEnterOpen: keyboard.afterEnter.detailsOpen === true,
    keyboardEnterOpenAttributePresent:
      keyboard.afterEnter.openAttributePresent === true,
    keyboardContentHitTestVisibleAfterEnter:
      keyboard.afterEnter.hitTestSample.withinViewport === true &&
      keyboard.afterEnter.hitTestSample.contentOrDescendantHit === true,
    keyboardSpaceClosed: keyboard.afterSpace.detailsOpen === false,
    keyboardSpaceOpenAttributeAbsent:
      keyboard.afterSpace.openAttributePresent === false,
    keyboardContentNotHitTestVisibleAfterSpace:
      keyboard.afterSpace.hitTestSample.withinViewport === true &&
      keyboard.afterSpace.hitTestSample.contentOrDescendantHit === false,
    aiDisclosureVisibleWhenOpen: pointer.aiDisclosureVisibleWhenOpen,
    twoStrengthenedFinalArguments:
      pointer.initial.twoStrengthenedFinalArguments,
    newArgumentsForBothSides: pointer.initial.newArgumentsForBothSides,
    distinctFromOverallCommentary:
      pointer.initial.distinctFromOverallCommentary,
    prohibitedUnassailableAbsent:
      pointer.initial.prohibitedUnassailableAbsent,
    pointerActualViewportMatchesRequested:
      viewportMatches(pointer.freshMetrics, target),
    openActualViewportMatchesRequested:
      viewportMatches(pointer.openMetrics, target),
    keyboardActualViewportMatchesRequested:
      viewportMatches(keyboard.freshMetrics, target),
    horizontalOverflowAbsent:
      noOverflow(pointer.freshMetrics) &&
      noOverflow(pointer.openMetrics) &&
      noOverflow(keyboard.freshMetrics),
    collapsedScreenshotJpeg: collapsedImageChecks.jpeg,
    openScreenshotJpeg: openImageChecks.jpeg,
    collapsedScreenshotNonblank: collapsedImageChecks.nonblank,
    openScreenshotNonblank: openImageChecks.nonblank,
    collapsedScreenshotDimensionsMatch: collapsedImageChecks.dimensions,
    openScreenshotDimensionsMatch: openImageChecks.dimensions,
    collapsedOpenScreenshotsDiffer:
      sha256(pointer.collapsedBytes) !== sha256(pointer.openBytes)
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
    Object.keys(checks).length === packet.requiredBooleanChecks.length &&
    packet.requiredBooleanChecks.every((key) => checks[key] === true) &&
    Object.values(runtime.counts).every((count) => count === 0) &&
    Object.values(mutations).every((changed) => changed === false);
  const evidence = {
    schemaVersion:
      "1.0-production-checkpoint-v2.2-rendering-remedy-v5-viewport-evidence",
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
        sha256: sha256(pointer.collapsedBytes),
        transport: pointer.collapsedTransport
      },
      open: {
        path: viewport.evidence.openScreenshot,
        sha256: sha256(pointer.openBytes),
        transport: pointer.openTransport
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
    const collapsedPath = path.join(rootAbs, viewport.evidence.collapsedScreenshot);
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
