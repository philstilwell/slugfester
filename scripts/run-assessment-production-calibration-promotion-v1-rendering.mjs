#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  CALIBRATION_PROMOTION_ORDER,
  CALIBRATION_PROMOTION_PROTOCOL_ID,
  CALIBRATION_PROMOTION_ROOT,
  serializedJson,
  sha256
} from "./lib/assessment-production-calibration-promotion-v1.mjs";

const PLAYWRIGHT_CLI =
  "/Users/philstilwell/.codex/skills/playwright/scripts/playwright_cli.sh";
const manifest = JSON.parse(
  await readFile(path.resolve(`${CALIBRATION_PROMOTION_ROOT}/manifest.json`), "utf8")
);
const execution = JSON.parse(
  await readFile(path.resolve(`${CALIBRATION_PROMOTION_ROOT}/execution.json`), "utf8")
);
assertV4(
  manifest.protocolId === CALIBRATION_PROMOTION_PROTOCOL_ID &&
    manifest.status === "frozen-calibration-promotion-manifest" &&
    execution.status === "passed-calibration-promotion-production-mutation",
  "published calibration promotion required before rendering"
);

const viewports = {
  desktop: { width: 1440, height: 1000 },
  mobile: { width: 390, height: 844 }
};
const expected = {
  byline: "Assessments made by 5.6 Sol. — Rubric: Slugfester Reassessment Rubric v2.",
  overallHeading: "Overall commentary",
  aiHeading: "AI Extension",
  disclosurePrefix: "This section is an AI-generated contribution",
  prohibitedText: ["unassailable"]
};
const plans = manifest.debates.flatMap((debate) =>
  Object.entries(viewports).map(([viewportName, viewport]) => ({
    debateNumber: debate.debateNumber,
    debateId: debate.debateId,
    viewportName,
    viewport,
    url: `http://127.0.0.1:4174/debate/${debate.debateId}/`,
    collapsedScreenshot: `output/playwright/calibration-promotion-v1/debate-${debate.debateNumber}/${viewportName}-collapsed.jpg`,
    openScreenshot: `output/playwright/calibration-promotion-v1/debate-${debate.debateNumber}/${viewportName}-open.jpg`,
    evidencePath: `${CALIBRATION_PROMOTION_ROOT}/rendering/evidence/debate-${debate.debateNumber}/${viewportName}.json`,
    expected
  }))
);
assertV4(
  manifest.explicitOrder.join(",") === CALIBRATION_PROMOTION_ORDER.join(",") &&
    plans.length === 10,
  "ten ordered production viewports required"
);
for (const plan of plans) {
  await mkdir(path.dirname(path.resolve(plan.collapsedScreenshot)), { recursive: true });
}

const browserCode = `async (page) => {
  const plans = ${JSON.stringify(plans)};
  const results = [];
  for (const plan of plans) {
    const candidatePage = await page.context().newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];
    candidatePage.on("console", message => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    candidatePage.on("pageerror", error => pageErrors.push(String(error)));
    candidatePage.on("requestfailed", request => failedRequests.push({
      url: request.url(), failure: request.failure()?.errorText || "requestfailed"
    }));
    candidatePage.on("response", response => {
      if (!response.ok()) failedRequests.push({ url: response.url(), status: response.status() });
    });
    try {
      await candidatePage.setViewportSize(plan.viewport);
      await candidatePage.goto(plan.url, { waitUntil: "networkidle", timeout: 15000 });
      const summary = candidatePage.locator(".ai-extension-accordion > summary");
      await summary.waitFor({ state: "visible", timeout: 15000 });
      const metrics = await candidatePage.evaluate((expectedDisplay) => {
        const root = document.documentElement;
        const body = document.body;
        const overall = document.querySelector("#overall-heading")?.closest("section");
        const extension = document.querySelector("#ai-extension-heading")?.closest("section");
        const details = document.querySelector(".ai-extension-accordion");
        const extensionText = extension?.textContent || "";
        const extensionStyle = extension ? getComputedStyle(extension) : null;
        const overallStyle = overall ? getComputedStyle(overall) : null;
        return {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          scrollWidth: Math.max(root.scrollWidth, body.scrollWidth),
          byline: document.querySelector(".assessment-model")?.textContent?.trim() || "",
          overallHeading: document.querySelector("#overall-heading")?.textContent?.trim() || "",
          aiHeading: document.querySelector("#ai-extension-heading")?.textContent?.trim() || "",
          immediatelyFollows: overall?.nextElementSibling === extension,
          disclosurePresent: extensionText.includes(expectedDisplay.disclosurePrefix),
          prohibitedTextAbsent: expectedDisplay.prohibitedText.every(text =>
            !document.body.textContent.toLowerCase().includes(text.toLowerCase())),
          visuallyDistinct: Boolean(extensionStyle && overallStyle &&
            (extensionStyle.backgroundImage !== overallStyle.backgroundImage ||
             extensionStyle.backgroundColor !== overallStyle.backgroundColor ||
             extensionStyle.borderTopColor !== overallStyle.borderTopColor)),
          detailsTagName: details?.tagName?.toLowerCase() || "",
          detailsOpen: Boolean(details?.open),
          strengthenedFinalArguments: document.querySelectorAll(".extended-final-argument").length,
          sideArgumentCounts: [...document.querySelectorAll(".logical-extension-side")]
            .map(side => side.querySelectorAll(".new-argument").length)
        };
      }, plan.expected);
      const details = candidatePage.locator(".ai-extension-accordion");
      const freshOpen = await details.evaluate(element => element.open);
      const collapsed = await candidatePage.screenshot({
        path: plan.collapsedScreenshot,
        type: "jpeg",
        quality: 85,
        fullPage: false
      });
      await summary.click();
      const afterPointerOpen = await details.evaluate(element => element.open);
      const open = await candidatePage.screenshot({
        path: plan.openScreenshot,
        type: "jpeg",
        quality: 85,
        fullPage: false
      });
      await summary.click();
      await summary.focus();
      await summary.press("Enter");
      const afterEnter = await details.evaluate(element => element.open);
      await summary.press("Space");
      const afterSpace = await details.evaluate(element => element.open);
      const userAgent = await candidatePage.evaluate(() => navigator.userAgent);
      const checks = {
        exactViewport: metrics.innerWidth === plan.viewport.width && metrics.innerHeight === plan.viewport.height,
        noHorizontalOverflow: metrics.scrollWidth <= metrics.innerWidth,
        bylineExact: metrics.byline === plan.expected.byline,
        overallHeadingPresent: metrics.overallHeading === plan.expected.overallHeading,
        aiExtensionImmediatelyFollowsOverall: metrics.aiHeading === plan.expected.aiHeading && metrics.immediatelyFollows,
        aiContributionIdentified: metrics.disclosurePresent,
        prohibitedTextAbsent: metrics.prohibitedTextAbsent,
        visuallyDistinctAiExtension: metrics.visuallyDistinct,
        nativeDetailsElement: metrics.detailsTagName === "details",
        defaultCollapsed: freshOpen === false && metrics.detailsOpen === false,
        strengthenedFinalArgumentsBothSides: metrics.strengthenedFinalArguments === 2,
        newArgumentsBothSides: metrics.sideArgumentCounts.length === 2 && metrics.sideArgumentCounts.every(count => count >= 2),
        pointerOpened: afterPointerOpen === true,
        enterOpened: afterEnter === true,
        spaceClosed: afterSpace === false,
        collapsedScreenshotValid: collapsed.byteLength >= 20000,
        openScreenshotValid: open.byteLength >= 20000,
        collapsedOpenScreenshotsDiffer: !collapsed.equals(open),
        noConsoleErrors: consoleErrors.length === 0,
        noPageErrors: pageErrors.length === 0,
        noFailedRequests: failedRequests.length === 0
      };
      results.push({
        ...plan,
        metrics,
        rawStates: { freshOpen, afterPointerOpen, afterEnter, afterSpace },
        screenshotByteLengths: { collapsed: collapsed.byteLength, open: open.byteLength },
        browser: { controller: "playwright-cli", family: "Chromium", userAgent },
        runtime: { consoleErrors, pageErrors, failedRequests },
        checks
      });
      if (!Object.values(checks).every(Boolean)) return { status: "failed", results };
    } catch (error) {
      results.push({ ...plan, error: String(error), runtime: { consoleErrors, pageErrors, failedRequests } });
      return { status: "failed", results };
    } finally {
      await candidatePage.close();
    }
  }
  return { status: "passed", results };
}`;

let raw;
try {
  execFileSync(
    PLAYWRIGHT_CLI,
    ["-s=calibration-promotion-v1-rendering", "open", "about:blank"],
    { cwd: process.cwd(), encoding: "utf8", timeout: 30000 }
  );
  raw = execFileSync(
    PLAYWRIGHT_CLI,
    ["-s=calibration-promotion-v1-rendering", "--raw", "run-code", browserCode],
    { cwd: process.cwd(), encoding: "utf8", maxBuffer: 16 * 1024 * 1024, timeout: 20 * 60 * 1000 }
  );
} catch (error) {
  throw new Error(`Playwright CLI calibration-promotion rendering failed: ${error.stdout || error.message}`);
}
let result = JSON.parse(raw.trim());
if (typeof result === "string") result = JSON.parse(result);
if (result.status !== "passed" || result.results?.length !== 10) {
  throw new Error(`calibration-promotion rendering stopped on its first failing viewport: ${JSON.stringify(result).slice(-5000)}`);
}

function jpegDimensions(buffer) {
  assertV4(buffer[0] === 0xff && buffer[1] === 0xd8, "not a JPEG");
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const length = buffer.readUInt16BE(offset);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) };
    }
    offset += length;
  }
  throw new Error("JPEG dimensions not found");
}

const auditResults = [];
for (const browserResult of result.results) {
  const collapsedBytes = await readFile(path.resolve(browserResult.collapsedScreenshot));
  const openBytes = await readFile(path.resolve(browserResult.openScreenshot));
  const collapsedDimensions = jpegDimensions(collapsedBytes);
  const openDimensions = jpegDimensions(openBytes);
  browserResult.checks.collapsedScreenshotValid =
    browserResult.checks.collapsedScreenshotValid &&
    collapsedDimensions.width === browserResult.viewport.width &&
    collapsedDimensions.height === browserResult.viewport.height;
  browserResult.checks.openScreenshotValid =
    browserResult.checks.openScreenshotValid &&
    openDimensions.width === browserResult.viewport.width &&
    openDimensions.height === browserResult.viewport.height;
  assertV4(Object.values(browserResult.checks).every(Boolean), `${browserResult.debateNumber}/${browserResult.viewportName}: rendering check failed`);
  const evidence = {
    schemaVersion: "1.0-assessment-production-calibration-promotion-v1-rendering-evidence",
    protocolId: CALIBRATION_PROMOTION_PROTOCOL_ID,
    status: "passed-rendering-viewport",
    debateNumber: browserResult.debateNumber,
    debateId: browserResult.debateId,
    viewportName: browserResult.viewportName,
    viewport: browserResult.viewport,
    url: browserResult.url,
    browser: browserResult.browser,
    metrics: browserResult.metrics,
    rawStates: browserResult.rawStates,
    checks: browserResult.checks,
    runtime: browserResult.runtime,
    screenshots: {
      collapsed: { path: browserResult.collapsedScreenshot, sha256: sha256(collapsedBytes), byteLength: collapsedBytes.length, ...collapsedDimensions },
      open: { path: browserResult.openScreenshot, sha256: sha256(openBytes), byteLength: openBytes.length, ...openDimensions }
    },
    attempt: 1,
    retries: 0,
    directIncrementalCostUsd: 0
  };
  const evidenceBytes = serializedJson(evidence);
  await mkdir(path.dirname(path.resolve(browserResult.evidencePath)), { recursive: true });
  await writeFile(path.resolve(browserResult.evidencePath), evidenceBytes);
  auditResults.push({
    debateNumber: browserResult.debateNumber,
    debateId: browserResult.debateId,
    viewportName: browserResult.viewportName,
    status: evidence.status,
    evidence: { path: browserResult.evidencePath, sha256: sha256(evidenceBytes), bytes: Buffer.byteLength(evidenceBytes) }
  });
}

const audit = {
  schemaVersion: "1.0-assessment-production-calibration-promotion-v1-rendering-audit",
  protocolId: CALIBRATION_PROMOTION_PROTOCOL_ID,
  status: "passed-calibration-promotion-production-rendering",
  completedAt: new Date().toISOString(),
  explicitOrder: [...CALIBRATION_PROMOTION_ORDER],
  results: auditResults,
  totals: {
    debates: 5,
    viewports: 10,
    screenshots: 20,
    pointerInteractionTests: 10,
    keyboardEnterTests: 10,
    keyboardSpaceTests: 10,
    runtimeFailures: 0,
    horizontalOverflowFailures: 0,
    attempts: 10,
    retries: 0,
    paidCalls: 0,
    directIncrementalCostUsd: 0
  },
  batch18Selected: false
};
const auditPath = `${CALIBRATION_PROMOTION_ROOT}/rendering/rendering-audit.json`;
await mkdir(path.dirname(path.resolve(auditPath)), { recursive: true });
await writeFile(path.resolve(auditPath), serializedJson(audit));
console.log(serializedJson({ status: audit.status, debates: 5, viewports: 10, screenshots: 20, runtimeFailures: 0, directIncrementalCostUsd: 0 }));
