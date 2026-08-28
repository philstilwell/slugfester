#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_15_RENDERING_ORDER,
  POST_CANARY_BATCH_15_RENDERING_PORT,
  POST_CANARY_BATCH_15_RENDERING_PROTOCOL_ID,
  POST_CANARY_BATCH_15_RENDERING_REQUIRED_CHECKS,
  POST_CANARY_BATCH_15_RENDERING_ROOT,
  POST_CANARY_BATCH_15_RENDERING_VIEWPORTS,
  buildPostCanaryBatch15RenderingPacket,
  hashFile,
  sha256
} from "./lib/assessment-production-post-canary-batch-15-rendering-verification.mjs";
import {
  POST_CANARY_BATCH_15_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch15StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-15-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const index = process.argv.indexOf("--frozen-at");
const frozenAt = index >= 0 ? process.argv[index + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires ISO");

const FINALIZATION =
  "docs/assessment-production/post-canary-continuation-v1/batch-15/publication-finalization";
const ORIGINAL_PREVIEW = `${FINALIZATION}/output-bundle/previews/index.html`;
const RENDERING_PREVIEW = `${FINALIZATION}/output-bundle/rendering-preview/index.html`;
const FINALIZATION_PREPARATION = `${FINALIZATION}/preparation-manifest.json`;
const FINALIZATION_ACTIVATION = `${FINALIZATION}/execution-activation.json`;
const FINALIZATION_EXECUTION = `${FINALIZATION}/execution.json`;
const FINALIZATION_ANALYSIS = `${FINALIZATION}/analysis.json`;
const FINALIZATION_AUDIT = `${FINALIZATION}/finalization-audit.json`;
const COMPATIBILITY_BOUNDARY = `${FINALIZATION}/compatibility-analysis.json`;
const PREPARATION = `${POST_CANARY_BATCH_15_RENDERING_ROOT}/preparation-manifest.json`;
const ACTIVATION = `${POST_CANARY_BATCH_15_RENDERING_ROOT}/execution-activation.json`;
const EXECUTION = `${POST_CANARY_BATCH_15_RENDERING_ROOT}/execution.json`;
const ANALYSIS = `${POST_CANARY_BATCH_15_RENDERING_ROOT}/analysis.json`;
const AUDIT = `${POST_CANARY_BATCH_15_RENDERING_ROOT}/rendering-audit.json`;
const PACKETS = `${POST_CANARY_BATCH_15_RENDERING_ROOT}/packets`;
const PLAYWRIGHT_CLI =
  "/Users/philstilwell/.codex/skills/playwright/scripts/playwright_cli.sh";
const IMAGE_MAGICK = "/opt/homebrew/bin/magick";
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const parse = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);

const standing = await loadAndValidatePostCanaryBatch15StandingAuthorization();
assertV4(standing.record.authorization.renderingVerification === true &&
  standing.record.userAuthorization.directIncrementalCostUsdMaximumForSubscriptionAndLocalWork === 0,
"Batch 15 standing rendering authorization required");

if (shouldWrite) {
  for (const file of [PREPARATION, RENDERING_PREVIEW, COMPATIBILITY_BOUNDARY]) {
    assertV4(!(await exists(file)), `${file} exists`);
  }
}

const [finalPreparation, finalActivation, finalExecution, finalAnalysis, finalAudit,
  originalPreviewBytes] = await Promise.all([
  parse(FINALIZATION_PREPARATION), parse(FINALIZATION_ACTIVATION),
  parse(FINALIZATION_EXECUTION), parse(FINALIZATION_ANALYSIS),
  parse(FINALIZATION_AUDIT),
  readFile(path.resolve(ORIGINAL_PREVIEW))
]);
assertV4(finalPreparation.status ===
  "frozen-post-canary-batch-15-publication-finalization-prepared" &&
  finalActivation.status ===
  "frozen-post-canary-batch-15-publication-finalization-authorized" &&
  finalExecution.status === "ten-debate-batch-15-publication-finalization-passed" &&
  finalAnalysis.status === "ten-debate-batch-15-publication-finalization-passed" &&
  finalAudit.status === "passed" && finalAudit.rows?.length === 10 &&
  finalAudit.totals?.moves === 191,
"passing Batch 15 finalization required");

let previewText = originalPreviewBytes.toString("utf8");
previewText = previewText.replace(
  "renderPublicationStagingDebate(await response.json());",
  `renderPublicationStagingDebate(await response.json());\n        const banner = document.querySelector("[data-publication-staging-preview] .calibration-preview-note");\n        if (banner) banner.innerHTML = "<strong>Publication staging preview:</strong> validated post-canary Batch 15 candidate only. This scorecard remains excluded from production data and rankings pending rendering and mutation authorization.";`
);
assertV4(previewText !== originalPreviewBytes.toString("utf8"),
  "Batch 15 rendering preview adaptation failed");
const previewBytes = Buffer.from(previewText);

const compatibility = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-15-publication-finalization-compatibility-analysis",
  protocolId: "assessment-production-post-canary-batch-15-publication-finalization",
  status: "batch-15-production-compatibility-boundary-recorded",
  analyzedAt: frozenAt,
  productionCanary: false,
  batchNumber: 14,
  stagingOnly: true,
  findings: [{
    id: "batch-15-site-ledger-adapter-and-validator-route",
    description: "The live validator requires a separately frozen authenticated Batch 15 adapter route before production mutation.",
    blocksFinalizationStaging: false,
    blocksRenderingVerification: false,
    blocksProductionMutation: true
  }],
  authorization: {
    compatibilityPlanPreparation: true,
    validatorMigration: false,
    productionMutation: false,
    nextBatchSelection: false
  }
};
const compatibilityBytes = Buffer.from(`${JSON.stringify(compatibility, null, 2)}\n`);

const packets = [];
for (const debateNumber of POST_CANARY_BATCH_15_RENDERING_ORDER) {
  const row = finalAudit.rows.find((item) => item.debateNumber === debateNumber);
  assertV4(row, `${debateNumber}: finalization audit row missing`);
  const [candidateBytes, provenanceBytes] = await Promise.all([
    readFile(path.resolve(row.candidate)), readFile(path.resolve(row.provenance))
  ]);
  assertV4(sha256(candidateBytes) === row.candidateSha256 &&
    sha256(provenanceBytes) === row.provenanceSha256,
  `${debateNumber}: final candidate or provenance changed`);
  const packet = buildPostCanaryBatch15RenderingPacket({ auditRow: row,
    candidate: JSON.parse(candidateBytes), provenance: JSON.parse(provenanceBytes),
    previewPath: RENDERING_PREVIEW, previewSha256: sha256(previewBytes) });
  const packetPath = `${PACKETS}/debate-${debateNumber}.json`;
  const serialized = Buffer.from(`${JSON.stringify(packet, null, 2)}\n`);
  packets.push({ debateNumber, debateId: row.debateId, path: packetPath,
    sha256: sha256(serialized), bytes: serialized.length, serialized });
}

const sources = [FINALIZATION_PREPARATION, FINALIZATION_ACTIVATION,
  FINALIZATION_EXECUTION, FINALIZATION_ANALYSIS, FINALIZATION_AUDIT,
  ORIGINAL_PREVIEW, POST_CANARY_BATCH_15_STANDING_AUTHORIZATION,
  "src/app.js", "src/styles.css",
  "scripts/lib/assessment-production-post-canary-batch-15-rendering-verification.mjs",
  "scripts/lib/assessment-production-post-canary-batch-15-publication-finalization.mjs",
  "scripts/lib/assessment-production-post-canary-batch-15-standing-authorization.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-15-rendering-verification.mjs",
  "scripts/test-assessment-production-post-canary-batch-15-rendering-verification-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-15-rendering-verification.mjs",
  "scripts/run-assessment-production-post-canary-batch-15-rendering-verification.mjs",
  "scripts/finalize-assessment-production-post-canary-batch-15-rendering-verification.mjs",
  ...finalAudit.rows.flatMap((row) => [row.candidate, row.provenance])
];
const sourceHashes = {};
for (const file of [...new Set(sources)].sort()) sourceHashes[file] = await hashFile(file);
sourceHashes[RENDERING_PREVIEW] = sha256(previewBytes);
sourceHashes[COMPATIBILITY_BOUNDARY] = sha256(compatibilityBytes);

const futureOutputPathsExcludedFromSourceHashes = [ACTIVATION, EXECUTION, ANALYSIS, AUDIT,
  ...packets.flatMap((row) => ["desktop", "mobile"].flatMap((viewportName) => {
    const viewport = JSON.parse(row.serialized).viewports[viewportName];
    return [viewport.evidence.result, viewport.evidence.collapsedScreenshot,
      viewport.evidence.openScreenshot];
  }))
];
for (const file of futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(file)), `${file} exists`);
}

const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-15-rendering-preparation",
  protocolId: POST_CANARY_BATCH_15_RENDERING_PROTOCOL_ID,
  status: "frozen-post-canary-batch-15-rendering-verification-prepared",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false,
  batchNumber: 14,
  stagingOnly: true,
  userAuthorization: {
    standingAuthorization: POST_CANARY_BATCH_15_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standing.sha256,
    directIncrementalCostUsdMaximum: 0
  },
  packets: packets.map(({ serialized, ...row }) => row),
  explicitOrder: POST_CANARY_BATCH_15_RENDERING_ORDER,
  viewports: POST_CANARY_BATCH_15_RENDERING_VIEWPORTS,
  requiredChecks: POST_CANARY_BATCH_15_RENDERING_REQUIRED_CHECKS,
  browserPlan: {
    controller: "playwright-cli",
    browserFamily: "Chromium",
    sessionName: "batch15-rendering",
    port: POST_CANARY_BATCH_15_RENDERING_PORT,
    explicitViewportOrder: ["desktop", "mobile"],
    oneFreshPagePerViewport: true,
    attemptsPerViewport: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    timeoutMsPerViewport: 15000,
    initialSnapshotRequired: true
  },
  gateExpectations: {
    debates: 10,
    sections: 51,
    moves: 191,
    viewportResults: 20,
    screenshots: 40,
    requiredBooleanChecks: 440,
    runtimeFailures: 0,
    retries: 0,
    timeoutExtensions: 0,
    directIncrementalCostUsd: 0
  },
  failurePolicy: {
    stopOnFirstViewportFailure: true,
    preserveOnlyPassingEvidence: true,
    retry: false,
    timeoutExtension: false,
    automaticRepair: false
  },
  sourceHashes,
  toolHashes: {
    [PLAYWRIGHT_CLI]: await hashFile(PLAYWRIGHT_CLI),
    [IMAGE_MAGICK]: await hashFile(IMAGE_MAGICK)
  },
  futureOutputPathsExcludedFromSourceHashes,
  artifacts: {
    preparation: PREPARATION,
    activation: ACTIVATION,
    execution: EXECUTION,
    analysis: ANALYSIS,
    renderingAudit: AUDIT,
    evidenceRoot: `${POST_CANARY_BATCH_15_RENDERING_ROOT}/evidence`,
    screenshotRoot: "output/playwright/batch-15-rendering",
    preview: RENDERING_PREVIEW,
    compatibilityBoundary: COMPATIBILITY_BOUNDARY
  },
  authorization: {
    renderingVerificationPreparation: true,
    executionActivation: true,
    renderingVerification: false,
    modelExecution: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: "activate-batch-15-rendering-verification"
};

if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(RENDERING_PREVIEW)), { recursive: true });
  await writeFile(path.resolve(RENDERING_PREVIEW), previewBytes);
  await writeFile(path.resolve(COMPATIBILITY_BOUNDARY), compatibilityBytes);
  for (const row of packets) {
    await mkdir(path.dirname(path.resolve(row.path)), { recursive: true });
    await writeFile(path.resolve(row.path), row.serialized);
  }
  await mkdir(path.dirname(path.resolve(PREPARATION)), { recursive: true });
  await writeFile(path.resolve(PREPARATION), `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(JSON.stringify({ status: manifest.status, debates: 10,
  sections: 51, moves: 191, viewportResultsPlanned: 20,
  screenshotsPlanned: 40, controller: manifest.browserPlan.controller,
  attemptsPerViewport: 1, retriesMaximum: 0,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: manifest.nextAuthorizedAction }, null, 2));


