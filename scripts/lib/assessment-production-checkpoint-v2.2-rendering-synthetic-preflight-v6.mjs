import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  extractCheckpointV22RenderingRemedyV6SignatureHex
} from "./assessment-production-checkpoint-v2.2-rendering-browser-runner-v6.mjs";
import {
  CHECKPOINT_V22_RENDERING_REMEDY_V6_IMAGE_CONTRACT
} from "./assessment-production-checkpoint-v2.2-rendering-verification-remedy-v6.mjs";

const EVENT_METHODS = Object.freeze([
  "Runtime.exceptionThrown",
  "Log.entryAdded",
  "Network.requestWillBeSent",
  "Network.loadingFailed",
  "Network.responseReceived"
]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function evaluate(cdp, expression) {
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
  const userAgent = await evaluate(cdp, "navigator.userAgent");
  const seed = await cdp.readEvents({
    methods: EVENT_METHODS,
    limit: 1000,
    timeoutMs: 1
  });
  return { cdp, cursor: seed.cursor, userAgent };
}

async function collectDiagnostics(tab, diagnostics) {
  await tab.playwright.waitForTimeout(500);
  const logs = await tab.dev.logs({
    levels: ["error", "warn", "warning"],
    limit: 1000
  });
  let cursor = diagnostics.cursor;
  let page;
  const events = [];
  do {
    page = await diagnostics.cdp.readEvents({
      afterSequence: cursor,
      methods: EVENT_METHODS,
      limit: 1000,
      timeoutMs: 1
    });
    events.push(...page.events);
    cursor = page.cursor;
  } while (page.hasMore);
  return {
    consoleErrors: logs.filter((entry) => entry.level === "error").length,
    consoleWarnings: logs.filter(
      (entry) => entry.level === "warn" || entry.level === "warning"
    ).length,
    pageErrors: events.filter(
      (event) =>
        event.method === "Runtime.exceptionThrown" ||
        (event.method === "Log.entryAdded" &&
          event.params?.entry?.level === "error")
    ).length,
    failedRequests: events.filter(
      (event) =>
        event.method === "Network.loadingFailed" ||
        (event.method === "Network.responseReceived" &&
          Number(event.params?.response?.status) >= 400)
    ).length
  };
}

function tokenizedUrl(baseUrl, token, viewportName, phase, stage) {
  const url = new URL(baseUrl);
  url.searchParams.set("renderingExecution", token);
  url.searchParams.set("renderingViewport", viewportName);
  url.searchParams.set("renderingPhase", phase);
  url.searchParams.set("renderingStage", stage);
  return url.href;
}

async function ready(cdp, focus) {
  return evaluate(cdp, `(() => {
    const details = document.querySelector("details.ai-extension-accordion");
    const summary = details?.querySelector("summary");
    const content = details?.querySelector(".ai-extension-accordion-content");
    summary?.scrollIntoView({ block: "center", inline: "nearest" });
    if (${focus ? "true" : "false"}) summary?.focus();
    const rect = summary?.getBoundingClientRect();
    return {
      ready: Boolean(details && summary && content && rect && rect.width > 0 && rect.height > 0),
      focused: document.activeElement === summary,
      rect: rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null
    };
  })()`);
}

async function observe(cdp) {
  return evaluate(cdp, `(() => {
    const details = document.querySelector("details.ai-extension-accordion");
    const content = document.querySelector(".ai-extension-accordion-content");
    const rect = content.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + Math.min(10, Math.max(1, rect.height / 2));
    const withinViewport = x >= 0 && x < innerWidth && y >= 0 && y < innerHeight;
    const hit = withinViewport ? document.elementFromPoint(x, y) : null;
    return {
      detailsOpen: details.open,
      openAttributePresent: details.hasAttribute("open"),
      withinViewport,
      contentOrDescendantHit: hit === content || content.contains(hit)
    };
  })()`);
}

async function metrics(cdp) {
  return evaluate(cdp, `(() => {
    const elements = [...document.querySelectorAll("body *")].filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" &&
        rect.width > 0 && rect.height > 0;
    });
    return {
      actualInnerWidth: innerWidth,
      actualInnerHeight: innerHeight,
      outerWidth,
      outerHeight,
      devicePixelRatio,
      documentScrollWidth: document.documentElement.scrollWidth,
      maximumElementRight: Number((elements.length
        ? Math.max(...elements.map((element) => element.getBoundingClientRect().right))
        : 0).toFixed(2))
    };
  })()`);
}

async function analyze(bytes) {
  const temporary = await mkdtemp(
    path.join(tmpdir(), "slugfester-v6-synthetic-")
  );
  const file = path.join(temporary, "capture.jpg");
  try {
    await writeFile(file, bytes);
    const raw = execFileSync(
      CHECKPOINT_V22_RENDERING_REMEDY_V6_IMAGE_CONTRACT.analyzerPath,
      [
        "identify",
        "-format",
        '{"format":"%m","pixelWidth":%w,"pixelHeight":%h,"uniqueColors":%k,"meanNormalized":%[fx:mean],"entropy":%[entropy]}',
        file
      ],
      { encoding: "utf8" }
    );
    const contract = CHECKPOINT_V22_RENDERING_REMEDY_V6_IMAGE_CONTRACT;
    return {
      ...JSON.parse(raw),
      signatureBytesInspected: contract.signatureBytes,
      signatureHex:
        extractCheckpointV22RenderingRemedyV6SignatureHex(bytes, contract),
      byteLength: bytes.length,
      sha256: sha256(bytes)
    };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

async function capture(cdp) {
  const startedAt = performance.now();
  const response = await cdp.send("Page.captureScreenshot", {
    format: "jpeg",
    quality: 85,
    fromSurface: true,
    captureBeyondViewport: false
  });
  const captureMilliseconds = Number((performance.now() - startedAt).toFixed(2));
  const bytes = Buffer.from(response.data, "base64");
  return { captureMilliseconds, analysis: await analyze(bytes) };
}

function closed(state) {
  return state.detailsOpen === false &&
    state.openAttributePresent === false &&
    state.withinViewport === true &&
    state.contentOrDescendantHit === false;
}

function opened(state) {
  return state.detailsOpen === true &&
    state.openAttributePresent === true &&
    state.withinViewport === true &&
    state.contentOrDescendantHit === true;
}

export async function runCheckpointV22RenderingRemedyV6SyntheticViewport({
  browser,
  fixtureBaseUrl,
  navigationToken,
  viewportName,
  viewport,
  timeoutMs = 15000
}) {
  const controller = await browser.capabilities.get("viewport");
  let pointer;
  let keyboard;
  await controller.set(viewport.controllerInput);
  const pointerTab = await browser.tabs.new();
  try {
    const bootstrapUrl = tokenizedUrl(
      fixtureBaseUrl,
      navigationToken,
      viewportName,
      "pointer",
      "bootstrap"
    );
    await pointerTab.goto(bootstrapUrl);
    await pointerTab.playwright.waitForLoadState({ state: "load", timeoutMs });
    const diagnostics = await enableDiagnostics(pointerTab);
    const measuredUrl = tokenizedUrl(
      fixtureBaseUrl,
      navigationToken,
      viewportName,
      "pointer",
      "measured"
    );
    await pointerTab.goto(measuredUrl);
    await pointerTab.playwright.waitForLoadState({ state: "load", timeoutMs });
    await pointerTab.playwright.waitForTimeout(1000);
    const readiness = await ready(diagnostics.cdp, false);
    const fresh = await observe(diagnostics.cdp);
    const freshMetrics = await metrics(diagnostics.cdp);
    const collapsed = await capture(diagnostics.cdp);
    const x = readiness.rect.left + readiness.rect.width / 2;
    const y = readiness.rect.top + readiness.rect.height / 2;
    await diagnostics.cdp.send("Input.dispatchMouseEvent", {
      type: "mousePressed", x, y, button: "left", clickCount: 1
    });
    await diagnostics.cdp.send("Input.dispatchMouseEvent", {
      type: "mouseReleased", x, y, button: "left", clickCount: 1
    });
    const openState = await observe(diagnostics.cdp);
    const openMetrics = await metrics(diagnostics.cdp);
    const openCapture = await capture(diagnostics.cdp);
    const runtime = await collectDiagnostics(pointerTab, diagnostics);
    pointer = {
      userAgent: diagnostics.userAgent,
      bootstrapUrl,
      measuredUrl,
      readiness,
      fresh,
      freshMetrics,
      collapsed,
      openState,
      openMetrics,
      openCapture,
      runtime
    };
  } finally {
    await pointerTab.close();
  }

  await controller.set(viewport.controllerInput);
  const keyboardTab = await browser.tabs.new();
  try {
    const bootstrapUrl = tokenizedUrl(
      fixtureBaseUrl,
      navigationToken,
      viewportName,
      "keyboard",
      "bootstrap"
    );
    await keyboardTab.goto(bootstrapUrl);
    await keyboardTab.playwright.waitForLoadState({ state: "load", timeoutMs });
    const diagnostics = await enableDiagnostics(keyboardTab);
    const measuredUrl = tokenizedUrl(
      fixtureBaseUrl,
      navigationToken,
      viewportName,
      "keyboard",
      "measured"
    );
    await keyboardTab.goto(measuredUrl);
    await keyboardTab.playwright.waitForLoadState({ state: "load", timeoutMs });
    await keyboardTab.playwright.waitForTimeout(1000);
    const readiness = await ready(diagnostics.cdp, true);
    const fresh = await observe(diagnostics.cdp);
    const freshMetrics = await metrics(diagnostics.cdp);
    const summary = keyboardTab.playwright.locator(
      "details.ai-extension-accordion > summary"
    );
    await summary.press("Enter", { timeoutMs });
    const afterEnter = await observe(diagnostics.cdp);
    await summary.press("Space", { timeoutMs });
    const afterSpace = await observe(diagnostics.cdp);
    const runtime = await collectDiagnostics(keyboardTab, diagnostics);
    keyboard = {
      userAgent: diagnostics.userAgent,
      bootstrapUrl,
      measuredUrl,
      readiness,
      fresh,
      freshMetrics,
      afterEnter,
      afterSpace,
      runtime
    };
  } finally {
    await keyboardTab.close();
  }

  const contract = CHECKPOINT_V22_RENDERING_REMEDY_V6_IMAGE_CONTRACT;
  const target = viewport.targetCssViewport;
  const ratio = pointer.freshMetrics.devicePixelRatio;
  const collapsed = pointer.collapsed.analysis;
  const open = pointer.openCapture.analysis;
  const exactDimensions = (image) =>
    image.pixelWidth === viewport.controllerInput.width &&
    image.pixelHeight === viewport.controllerInput.height &&
    image.pixelWidth === Math.round(target.width * ratio) &&
    image.pixelHeight === Math.round(target.height * ratio);
  const nonblank = (image) =>
    image.byteLength >= contract.minimumByteLength &&
    image.uniqueColors >= contract.minimumUniqueColors &&
    image.entropy >= contract.minimumEntropy;
  const runtimeCounts = Object.fromEntries(
    ["consoleErrors", "consoleWarnings", "pageErrors", "failedRequests"].map(
      (key) => [key, pointer.runtime[key] + keyboard.runtime[key]]
    )
  );
  const checks = {
    pointerReady: pointer.readiness.ready === true,
    pointerFreshClosed: closed(pointer.fresh),
    pointerOpened: opened(pointer.openState),
    pointerViewportExact:
      pointer.freshMetrics.actualInnerWidth === target.width &&
      pointer.freshMetrics.actualInnerHeight === target.height &&
      pointer.openMetrics.actualInnerWidth === target.width &&
      pointer.openMetrics.actualInnerHeight === target.height,
    collapsedJpegSignature:
      collapsed.format === contract.format &&
      collapsed.signatureBytesInspected === contract.signatureBytes &&
      collapsed.signatureHex === contract.signatureHex,
    openJpegSignature:
      open.format === contract.format &&
      open.signatureBytesInspected === contract.signatureBytes &&
      open.signatureHex === contract.signatureHex,
    collapsedOpenHashesDiffer: collapsed.sha256 !== open.sha256,
    collapsedNonblank: nonblank(collapsed),
    openNonblank: nonblank(open),
    screenshotDimensionsReconciled:
      exactDimensions(collapsed) && exactDimensions(open),
    keyboardReady:
      keyboard.readiness.ready === true && keyboard.readiness.focused === true,
    keyboardFreshClosed: closed(keyboard.fresh),
    keyboardEnterOpened: opened(keyboard.afterEnter),
    keyboardSpaceClosed: closed(keyboard.afterSpace),
    keyboardViewportExact:
      keyboard.freshMetrics.actualInnerWidth === target.width &&
      keyboard.freshMetrics.actualInnerHeight === target.height,
    runtimeZero: Object.values(runtimeCounts).every((value) => value === 0)
  };
  return {
    targetCssViewport: { ...target },
    controllerInput: { ...viewport.controllerInput },
    devicePixelRatio: ratio,
    collapsed: {
      captureMilliseconds: pointer.collapsed.captureMilliseconds,
      ...collapsed
    },
    open: {
      captureMilliseconds: pointer.openCapture.captureMilliseconds,
      ...open
    },
    checks,
    runtimeCounts,
    userAgent: pointer.userAgent,
    navigationUrls: [
      pointer.bootstrapUrl,
      pointer.measuredUrl,
      keyboard.bootstrapUrl,
      keyboard.measuredUrl
    ]
  };
}
