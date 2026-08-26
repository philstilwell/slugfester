#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_10_RENDERING_ORDER,
  POST_CANARY_BATCH_10_RENDERING_ROOT,
  hashFile,
  sha256,
  validatePostCanaryBatch10RenderingEvidence,
  validatePostCanaryBatch10RenderingPacket
} from "./lib/assessment-production-post-canary-batch-10-rendering-verification.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const ROOT = POST_CANARY_BATCH_10_RENDERING_ROOT;
const PLAYWRIGHT_CLI =
  "/Users/philstilwell/.codex/skills/playwright/scripts/playwright_cli.sh";
const IMAGE_MAGICK = "/opt/homebrew/bin/magick";
const preparationPath = `${ROOT}/preparation-manifest.json`;
const activationPath = `${ROOT}/execution-activation.json`;
const [preparationBytes, activationBytes] = await Promise.all([
  readFile(path.resolve(preparationPath)), readFile(path.resolve(activationPath))
]);
const preparation = JSON.parse(preparationBytes);
const activation = JSON.parse(activationBytes);

assertV4(activation.status ===
  "frozen-post-canary-batch-10-rendering-verification-authorized" &&
  activation.preparation.sha256 === sha256(preparationBytes) &&
  activation.executionNavigation.token ===
    sha256(canonicalJson(activation.executionNavigation.input)) &&
  activation.authorization.attemptsPerViewport === 1 &&
  activation.authorization.retry === false &&
  activation.authorization.timeoutExtension === false,
"valid Batch 10 rendering activation required");
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(await hashFile(file) === digest, `activated source hash mismatch: ${file}`);
}
for (const [file, digest] of Object.entries(activation.toolHashes)) {
  assertV4(await hashFile(file) === digest, `activated tool hash mismatch: ${file}`);
}

const packetRows = [];
for (const debateNumber of POST_CANARY_BATCH_10_RENDERING_ORDER) {
  const row = preparation.packets.find((item) => item.debateNumber === debateNumber);
  const packetBytes = await readFile(path.resolve(row.path));
  assertV4(sha256(packetBytes) === row.sha256,
    `${debateNumber}: activated rendering packet changed`);
  packetRows.push({ row, packet: validatePostCanaryBatch10RenderingPacket(
    JSON.parse(packetBytes)) });
}

const plans = packetRows.flatMap(({ packet }) => ["desktop", "mobile"].map((viewportName) => {
  const viewport = packet.viewports[viewportName];
  return {
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    viewportName,
    viewport: { width: viewport.width, height: viewport.height },
    url: packet.preview.url,
    navigationToken: activation.executionNavigation.token,
    expected: packet.expectedDisplay,
    collapsedScreenshot: path.resolve(viewport.evidence.collapsedScreenshot),
    openScreenshot: path.resolve(viewport.evidence.openScreenshot)
  };
}));
assertV4(plans.length === 20, "twenty Batch 10 rendering viewport plans required");
for (const plan of plans) {
  await mkdir(path.dirname(plan.collapsedScreenshot), { recursive: true });
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
      const measuredUrl = plan.url + "&renderingExecution=" + plan.navigationToken +
        "&renderingViewport=" + plan.viewportName;
      await candidatePage.goto(measuredUrl, { waitUntil: "networkidle", timeout: 15000 });
      const summary = candidatePage.locator(".ai-extension-accordion > summary");
      await summary.waitFor({ state: "visible", timeout: 15000 });
      const metrics = await candidatePage.evaluate((expected) => {
        const root = document.documentElement;
        const body = document.body;
        const overall = document.querySelector("#overall-heading")?.closest("section");
        const extension = document.querySelector("#ai-extension-heading")?.closest("section");
        const details = document.querySelector(".ai-extension-accordion");
        const byline = document.querySelector(".assessment-model")?.textContent?.trim() || "";
        const banner = document.querySelector("[data-publication-staging-preview] .calibration-preview-note")
          ?.textContent?.replace(/\\s+/g, " ").trim() || "";
        const extensionText = extension?.textContent || "";
        const extensionStyle = extension ? getComputedStyle(extension) : null;
        const overallStyle = overall ? getComputedStyle(overall) : null;
        const sideArgumentCounts = [...document.querySelectorAll(".logical-extension-side")]
          .map(side => side.querySelectorAll(".new-argument").length);
        return {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          scrollWidth: Math.max(root.scrollWidth, body.scrollWidth),
          byline,
          banner,
          overallHeading: document.querySelector("#overall-heading")?.textContent?.trim() || "",
          aiHeading: document.querySelector("#ai-extension-heading")?.textContent?.trim() || "",
          immediatelyFollows: overall?.nextElementSibling === extension,
          disclosurePresent: extensionText.includes(expected.disclosurePrefix),
          prohibitedTextAbsent: expected.prohibitedText.every(text =>
            !document.body.textContent.toLowerCase().includes(text.toLowerCase())),
          visuallyDistinct: Boolean(extensionStyle && overallStyle &&
            (extensionStyle.backgroundImage !== overallStyle.backgroundImage ||
             extensionStyle.backgroundColor !== overallStyle.backgroundColor ||
             extensionStyle.borderTopColor !== overallStyle.borderTopColor)),
          detailsTagName: details?.tagName?.toLowerCase() || "",
          detailsOpen: Boolean(details?.open),
          strengthenedFinalArguments: document.querySelectorAll(".extended-final-argument").length,
          sideArgumentCounts
        };
      }, plan.expected);
      const details = candidatePage.locator(".ai-extension-accordion");
      const freshOpen = await details.evaluate(element => element.open);
      const collapsed = await candidatePage.screenshot({ path: plan.collapsedScreenshot,
        type: "jpeg", quality: 85, fullPage: false });
      await summary.click();
      const afterPointerOpen = await details.evaluate(element => element.open);
      const open = await candidatePage.screenshot({ path: plan.openScreenshot,
        type: "jpeg", quality: 85, fullPage: false });
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
        stagingBannerExact: metrics.banner === plan.expected.stagingBanner,
        overallHeadingPresent: metrics.overallHeading === plan.expected.overallHeading,
        aiExtensionImmediatelyFollowsOverall: metrics.aiHeading === plan.expected.aiExtensionHeading && metrics.immediatelyFollows,
        aiContributionIdentified: metrics.disclosurePresent,
        prohibitedTextAbsent: metrics.prohibitedTextAbsent,
        visuallyDistinctAiExtension: metrics.visuallyDistinct,
        nativeDetailsElement: metrics.detailsTagName === plan.expected.nativeElement,
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
      const result = { ...plan, measuredUrl, metrics,
        rawStates: { freshOpen, afterPointerOpen, afterEnter, afterSpace },
        screenshotByteLengths: { collapsed: collapsed.byteLength, open: open.byteLength },
        browser: { controller: "playwright-cli", family: "Chromium", userAgent },
        runtime: { consoleErrors, pageErrors, failedRequests }, checks };
      results.push(result);
      if (!Object.values(checks).every(Boolean)) return { status: "failed", results };
    } catch (error) {
      results.push({ ...plan, error: String(error),
        runtime: { consoleErrors, pageErrors, failedRequests } });
      return { status: "failed", results };
    } finally {
      await candidatePage.close();
    }
  }
  return { status: "passed", results };
}`;

let raw;
try {
  raw = execFileSync(PLAYWRIGHT_CLI,
    [`-s=${activation.browserPlan.sessionName}`, "--raw", "run-code", browserCode],
    { cwd: process.cwd(), encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
      timeout: 20 * 60 * 1000 });
} catch (error) {
  await Promise.all(plans.flatMap((plan) => [plan.collapsedScreenshot, plan.openScreenshot])
    .map((file) => rm(file, { force: true })));
  throw new Error(`Playwright CLI Batch 10 rendering execution failed: ${error.stdout || error.message}`);
}
let browserResult = JSON.parse(raw.trim());
if (typeof browserResult === "string") browserResult = JSON.parse(browserResult);
if (browserResult.status !== "passed" || browserResult.results?.length !== 20) {
  await Promise.all(plans.flatMap((plan) => [plan.collapsedScreenshot, plan.openScreenshot])
    .map((file) => rm(file, { force: true })));
  throw new Error(`Batch 10 rendering stopped on its first failing viewport: ${JSON.stringify(browserResult).slice(-5000)}`);
}

function imageDimensions(file) {
  const output = execFileSync(IMAGE_MAGICK,
    ["identify", "-format", "%w %h", path.resolve(file)],
    { encoding: "utf8" }).trim();
  const [width, height] = output.split(/\s+/).map(Number);
  return { width, height };
}

const evidenceRows = [];
try {
  for (const result of browserResult.results) {
    const packet = packetRows.find(({ packet: item }) =>
      item.debateNumber === result.debateNumber).packet;
    const viewport = packet.viewports[result.viewportName];
    const collapsedDimensions = imageDimensions(viewport.evidence.collapsedScreenshot);
    const openDimensions = imageDimensions(viewport.evidence.openScreenshot);
    const collapsedHash = await hashFile(viewport.evidence.collapsedScreenshot);
    const openHash = await hashFile(viewport.evidence.openScreenshot);
    result.checks.collapsedScreenshotValid =
      result.checks.collapsedScreenshotValid &&
      collapsedDimensions.width === viewport.width &&
      collapsedDimensions.height === viewport.height;
    result.checks.openScreenshotValid = result.checks.openScreenshotValid &&
      openDimensions.width === viewport.width && openDimensions.height === viewport.height;
    result.checks.collapsedOpenScreenshotsDiffer =
      result.checks.collapsedOpenScreenshotsDiffer && collapsedHash !== openHash;
    const evidence = {
      schemaVersion: "1.0-assessment-production-post-canary-batch-10-rendering-evidence",
      protocolId: packet.protocolId,
      status: Object.values(result.checks).every(Boolean)
        ? "passed-rendering-viewport" : "failed-rendering-viewport",
      debateNumber: packet.debateNumber,
      debateId: packet.debateId,
      viewportName: result.viewportName,
      viewport: result.viewport,
      navigationToken: result.navigationToken,
      url: packet.preview.url,
      measuredUrl: result.measuredUrl,
      browser: result.browser,
      metrics: result.metrics,
      rawStates: result.rawStates,
      checks: result.checks,
      runtime: result.runtime,
      screenshots: {
        collapsed: { path: viewport.evidence.collapsedScreenshot,
          sha256: collapsedHash,
          byteLength: result.screenshotByteLengths.collapsed,
          ...collapsedDimensions },
        open: { path: viewport.evidence.openScreenshot,
          sha256: openHash,
          byteLength: result.screenshotByteLengths.open,
          ...openDimensions }
      },
      mutations: {
        candidateChanged: false,
        participantScoresChanged: false,
        displayCopyChanged: false,
        applicationCodeChanged: false,
        stylesheetChanged: false,
        productionDataChanged: false,
        rankingDataChanged: false,
        nextBatchSelected: false
      },
      attempt: 1,
      retries: 0,
      timeoutExtensions: 0,
      directIncrementalCostUsd: 0
    };
    validatePostCanaryBatch10RenderingEvidence({ packet,
      viewportName: result.viewportName,
      token: activation.executionNavigation.token, evidence });
    evidenceRows.push({ path: viewport.evidence.result, evidence });
  }
} catch (error) {
  await Promise.all(plans.flatMap((plan) => [plan.collapsedScreenshot, plan.openScreenshot])
    .map((file) => rm(file, { force: true })));
  throw error;
}

for (const row of evidenceRows) {
  await mkdir(path.dirname(path.resolve(row.path)), { recursive: true });
  await writeFile(path.resolve(row.path), `${JSON.stringify(row.evidence, null, 2)}\n`);
}

console.log(JSON.stringify({ status: "ten-debate-batch-10-rendering-browser-pass-complete",
  debates: 10, viewportResults: 20, screenshots: 40,
  requiredBooleanChecks: 440, runtimeFailures: 0,
  attempts: 20, retries: 0, timeoutExtensions: 0,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: "validate-and-finalize-batch-10-rendering-verification" }, null, 2));
