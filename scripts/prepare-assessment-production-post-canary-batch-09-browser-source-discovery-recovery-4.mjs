#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const shouldActivate = process.argv.includes("--activate");
assertV4(!(shouldWrite && shouldActivate), "choose either --write or --activate");

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-transport-recovery-4`;
const priorDiagnosisPath =
  `${root}/audio-source-transport-recovery-3/browser-autoplay-failure-diagnosis.json`;
const standingPath =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/standing-authorization.json";
const manifestPath = ".assessment-cache/captions/HoTILnpd3q8/manifest.json";
const overlayPath =
  "scripts/lib/assessment-production-post-canary-batch-09-browser-playback-block.js";
const preparePath =
  "scripts/prepare-assessment-production-post-canary-batch-09-browser-source-discovery-recovery-4.mjs";
const testPath =
  "scripts/test-assessment-production-post-canary-batch-09-browser-source-discovery-recovery-4.mjs";
const planPath = `${recoveryRoot}/discovery-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const outputPath = `${recoveryRoot}/asset-inventory.json`;
const analysisPath = `${recoveryRoot}/analysis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const [priorBytes, standingBytes, manifestBytes, overlayBytes] = await Promise.all([
  readFile(priorDiagnosisPath),
  readFile(standingPath),
  readFile(manifestPath),
  readFile(overlayPath)
]);
const prior = JSON.parse(priorBytes);
const manifest = JSON.parse(manifestBytes);
assertV4(
  prior.status ===
    "preserved-batch-09-debate-170-authenticated-browser-autoplay-boundary-failure-diagnosed-stop-required" &&
    prior.failure.maximumObservedAutoplaySeconds === 6,
  "prior browser failure diagnosis changed"
);
assertV4(
  manifest.videoId === "HoTILnpd3q8" &&
    manifest.durationSeconds === 6365 &&
    manifest.sourceUrl === "https://www.youtube.com/watch?v=HoTILnpd3q8",
  "canonical Debate 170 source identity changed"
);
assertV4(!(await exists(outputPath)), "browser asset inventory already exists");
assertV4(!(await exists(analysisPath)), "browser discovery analysis already exists");

const sourceHashes = {};
for (const file of [overlayPath, preparePath, testPath]) {
  sourceHashes[file] = sha256(await readFile(file));
}
const authenticatedInputs = {
  [priorDiagnosisPath]: sha256(priorBytes),
  [standingPath]: sha256(standingBytes),
  [manifestPath]: sha256(manifestBytes)
};

const plan = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-09-browser-source-discovery-recovery-4-plan",
  status:
    "frozen-batch-09-debate-170-pre-navigation-playback-blocked-browser-asset-discovery-ready",
  batchNumber: 9,
  checkpointCommit: "e3e12889",
  userAuthorization: {
    instruction: "You have my approval to do that.",
    resolvedAntecedent:
      "install a pre-navigation Chrome rule that blocks media playback before opening YouTube, then use the authenticated page only for source-asset discovery",
    directIncrementalCostUsdMaximum: 0,
    authenticatedBrowserNavigation: true,
    preNavigationPlaybackBlocking: true,
    pageAssetInventoryCallsMaximum: 1,
    assetDownloadsMaximum: 0,
    cookieInspectionMaximum: 0,
    cookieExportMaximum: 0,
    browserStorageInspectionMaximum: 0,
    audioPlaybackMaximumSeconds: 0,
    semanticAudioEvaluation: false,
    paidServices: false,
    modelExecution: false
  },
  authenticatedInputs,
  sourceHashes,
  browserRoute: {
    browser: "Chrome through the approved browser-control surface",
    safeBootstrapUrl: "https://www.youtube.com/robots.txt",
    targetUrl: "https://www.youtube.com/watch?v=HoTILnpd3q8",
    targetTitle: "Peter Singer vs John Lennox | Is There a God? Debate - YouTube",
    overlay: {
      path: overlayPath,
      sha256: sha256(overlayBytes),
      chromeDevToolsCommand: "Page.addScriptToEvaluateOnNewDocument",
      runImmediatelyOnBootstrapDocument: true
    },
    exactSequence: [
      "open-one-fresh-chrome-tab",
      "navigate-to-safe-youtube-robots-bootstrap",
      "enable-page-domain",
      "install-authenticated-overlay-at-document-start",
      "evaluate-overlay-on-bootstrap-document",
      "navigate-once-to-canonical-debate-watch-page",
      "validate-play-control-and-zero-second-position",
      "run-one-page-assets-list-call",
      "persist-only-url-kind-name-source-and-inventory-metadata",
      "close-temporary-tab"
    ]
  },
  validation: {
    requiredPlayControlPattern: "Play (k)",
    forbiddenPauseControlPattern: "Pause (k)",
    requiredPlayerPositionPattern: "0:00 / 1:46:04",
    failOnAnyObservedPositionAboveZero: true,
    failOnAnyPlayback: true,
    failOnAnyCookieOrStorageInspection: true,
    failOnAnyDownload: true,
    assetInventoryCallsRequired: 1,
    assetBundleCallsRequired: 0
  },
  outputs: { activationPath, outputPath, analysisPath },
  nextActionAfterPassingDiscovery:
    "freeze-and-report-the-authenticated-asset-inventory-before-any-download-authorization"
};

if (shouldActivate) {
  assertV4(await exists(planPath), "frozen browser discovery plan is missing");
  const planBytes = await readFile(planPath);
  const frozenPlan = JSON.parse(planBytes);
  assertV4(
    frozenPlan.status === plan.status &&
      frozenPlan.browserRoute.overlay.sha256 === sha256(overlayBytes) &&
      JSON.stringify(frozenPlan.sourceHashes) === JSON.stringify(sourceHashes),
    "frozen browser discovery plan changed"
  );
  assertV4(!(await exists(activationPath)), "browser discovery already activated");
  await mkdir(recoveryRoot, { recursive: true });
  const activation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-09-browser-source-discovery-recovery-4-activation",
    status:
      "active-for-exactly-one-playback-blocked-batch-09-debate-170-browser-asset-discovery",
    batchNumber: 9,
    plan: { path: planPath, sha256: sha256(planBytes) },
    authenticatedInputs,
    sourceHashes,
    overlay: structuredClone(plan.browserRoute.overlay),
    pageAssetInventoryCallsMaximum: 1,
    downloadsMaximum: 0,
    audioPlaybackMaximumSeconds: 0,
    directIncrementalCostUsdMaximum: 0
  };
  await writeFile(activationPath, `${JSON.stringify(activation, null, 2)}\n`);
  console.log(JSON.stringify({ status: activation.status, plan: activation.plan }, null, 2));
  process.exit(0);
}

if (shouldWrite) {
  assertV4(!(await exists(planPath)), "browser discovery plan already exists");
  await mkdir(recoveryRoot, { recursive: true });
  await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: plan.status,
      wroteArtifact: shouldWrite,
      inventoryCalls: 1,
      downloads: 0,
      audioPlaybackMaximumSeconds: 0,
      cookieOrStorageInspection: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
