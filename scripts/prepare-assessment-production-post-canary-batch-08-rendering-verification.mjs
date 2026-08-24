#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_08_RENDERING_IMAGE_CONTRACT,
  POST_CANARY_BATCH_08_RENDERING_MODEL, POST_CANARY_BATCH_08_RENDERING_ORDER,
  POST_CANARY_BATCH_08_RENDERING_PORT, POST_CANARY_BATCH_08_RENDERING_PROTOCOL_ID,
  POST_CANARY_BATCH_08_RENDERING_REQUIRED_BOOLEAN_CHECKS,
  POST_CANARY_BATCH_08_RENDERING_ROOT, POST_CANARY_BATCH_08_RENDERING_VIEWPORTS,
  buildPostCanaryBatch08RenderingPacket } from
  "./lib/assessment-production-post-canary-batch-08-rendering-verification.mjs";
import { POST_CANARY_BATCH_08_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch08StandingAuthorization } from
  "./lib/assessment-production-post-canary-batch-08-standing-authorization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
const shouldWrite = process.argv.includes("--write");
const index = process.argv.indexOf("--frozen-at");
const frozenAt = index >= 0 ? process.argv[index + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires ISO");
const FINALIZATION_ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-08/publication-finalization";
const FINALIZATION_PREPARATION = `${FINALIZATION_ROOT}/preparation-manifest.json`;
const FINALIZATION_ACTIVATION = `${FINALIZATION_ROOT}/execution-activation.json`;
const FINALIZATION_EXECUTION = `${FINALIZATION_ROOT}/execution.json`;
const FINALIZATION_ANALYSIS = `${FINALIZATION_ROOT}/analysis.json`;
const FINALIZATION_AUDIT = `${FINALIZATION_ROOT}/finalization-audit.json`;
const ORIGINAL_PREVIEW = `${FINALIZATION_ROOT}/output-bundle/previews/index.html`;
const RENDERING_PREVIEW = `${FINALIZATION_ROOT}/output-bundle/rendering-preview/index.html`;
const COMPATIBILITY_BOUNDARY = `${FINALIZATION_ROOT}/compatibility-analysis.json`;
const PROVEN_ROOT = "docs/assessment-production/production-checkpoint-v2.2-1/rendering-verification-remedy-v9";
const PROVEN_ANALYSIS = `${PROVEN_ROOT}/analysis.json`;
const PROVEN_AUDIT = `${PROVEN_ROOT}/rendering-audit.json`;
const PROVEN_NAVIGATION = `${PROVEN_ROOT}/synthetic/fresh-keyboard-navigation-contract.json`;
const PROVEN_PREFLIGHT = `${PROVEN_ROOT}/synthetic/preflight-result.json`;
const PREPARATION = `${POST_CANARY_BATCH_08_RENDERING_ROOT}/preparation-manifest.json`;
const PACKETS_ROOT = `${POST_CANARY_BATCH_08_RENDERING_ROOT}/packets`;
const ACTIVATION = `${POST_CANARY_BATCH_08_RENDERING_ROOT}/execution-activation.json`;
const EXECUTION = `${POST_CANARY_BATCH_08_RENDERING_ROOT}/execution.json`;
const ANALYSIS = `${POST_CANARY_BATCH_08_RENDERING_ROOT}/analysis.json`;
const RENDERING_AUDIT = `${POST_CANARY_BATCH_08_RENDERING_ROOT}/rendering-audit.json`;
const IMAGE_MAGICK = "/opt/homebrew/bin/magick";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const parse = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
const standing = await loadAndValidatePostCanaryBatch08StandingAuthorization();
if (shouldWrite) for (const file of [PREPARATION, RENDERING_PREVIEW, COMPATIBILITY_BOUNDARY])
  assertV4(!(await exists(file)), `${file} exists`);
const [finalPreparation, finalActivation, finalExecution, finalAnalysis, finalAudit,
  provenAnalysis, provenAudit, provenNavigation, provenPreflight, originalPreviewBytes] = await Promise.all([
  parse(FINALIZATION_PREPARATION), parse(FINALIZATION_ACTIVATION), parse(FINALIZATION_EXECUTION),
  parse(FINALIZATION_ANALYSIS), parse(FINALIZATION_AUDIT), parse(PROVEN_ANALYSIS), parse(PROVEN_AUDIT),
  parse(PROVEN_NAVIGATION), parse(PROVEN_PREFLIGHT), readFile(path.resolve(ORIGINAL_PREVIEW))]);
assertV4(finalPreparation.status === "frozen-post-canary-batch-08-publication-finalization-prepared" &&
  finalActivation.status === "frozen-post-canary-batch-08-publication-finalization-authorized" &&
  finalExecution.status === "ten-debate-batch-08-publication-finalization-passed" &&
  finalExecution.deterministicFinalizationPasses === 1 && finalExecution.reruns === 0 &&
  finalAnalysis.status === "ten-debate-batch-08-publication-finalization-passed" &&
  finalAnalysis.gate?.finalCandidatesPassed === 10 && finalAnalysis.gate?.moves === 182 &&
  finalAudit.status === "passed" && finalAudit.rows?.length === 10 &&
  finalAudit.totals?.moves === 182 && finalAudit.totals?.deterministicFinalizationPasses === 1,
"passing Batch 8 finalization required");
assertV4(provenAnalysis.status === "ninth-replacement-rendering-verification-passed" &&
  provenAnalysis.decision?.renderingGatePassed === true && provenAudit.totals?.viewportResults === 20 &&
  provenAudit.totals?.screenshots === 40 && provenAudit.totals?.retries === 0 &&
  provenNavigation.status === "fresh-keyboard-tab-location-assign-transport-selected" &&
  provenNavigation.navigation?.deadlineMilliseconds === 15000 &&
  provenPreflight.status === "passed-twenty-viewport-fresh-keyboard-location-assign-synthetic-rehearsal",
"passing frozen v9 transport evidence required");
for (const [name, viewport] of Object.entries(POST_CANARY_BATCH_08_RENDERING_VIEWPORTS)) assertV4(
  canonicalJson(provenNavigation.viewports[name]) === canonicalJson(viewport), `${name}: viewport contract changed`);
const compatibility = { schemaVersion: "1.0-assessment-production-post-canary-batch-08-publication-finalization-compatibility-analysis",
  protocolId: "assessment-production-post-canary-batch-08-publication-finalization",
  status: "batch-08-production-compatibility-boundary-recorded", analyzedAt: frozenAt,
  productionCanary: false, batchNumber: 8, stagingOnly: true,
  findings: [{ id: "batch-08-site-ledger-adapter-and-validator-route",
    description: "The live validator requires a separately frozen authenticated Batch 8 adapter route before production mutation.",
    blocksFinalizationStaging: false, blocksRenderingVerification: false,
    blocksProductionMutation: true }],
  authorization: { compatibilityPlanPreparation: true, validatorMigration: false,
    productionMutation: false, nextBatchSelection: false } };
const compatibilityBytes = Buffer.from(`${JSON.stringify(compatibility, null, 2)}\n`);
let previewText = originalPreviewBytes.toString("utf8");
previewText = previewText.replace("renderPublicationStagingDebate(await response.json());",
  `renderPublicationStagingDebate(await response.json());\n        const banner = document.querySelector("[data-publication-staging-preview] .calibration-preview-note");\n        if (banner) banner.innerHTML = "<strong>Publication staging preview:</strong> validated post-canary Batch 8 candidate only. This scorecard remains excluded from production data and rankings pending rendering and mutation authorization.";`);
assertV4(previewText !== originalPreviewBytes.toString("utf8"), "rendering preview adaptation failed");
const previewBytes = Buffer.from(previewText);
const provenTransport = { status: "passed-ten-debate-v9-transport-reference-only",
  analysis: { path: PROVEN_ANALYSIS, sha256: sha256(await readFile(path.resolve(PROVEN_ANALYSIS))) },
  renderingAudit: { path: PROVEN_AUDIT, sha256: sha256(await readFile(path.resolve(PROVEN_AUDIT))) },
  freshKeyboardNavigationContract: { path: PROVEN_NAVIGATION,
    sha256: sha256(await readFile(path.resolve(PROVEN_NAVIGATION))) },
  syntheticPreflight: { path: PROVEN_PREFLIGHT,
    sha256: sha256(await readFile(path.resolve(PROVEN_PREFLIGHT))) },
  historicalCandidateEvidenceReused: false };
const packets = [];
for (const debateNumber of POST_CANARY_BATCH_08_RENDERING_ORDER) {
  const row = finalAudit.rows.find((item) => item.debateNumber === debateNumber);
  const [candidateBytes, provenanceBytes] = await Promise.all([
    readFile(path.resolve(row.candidate)), readFile(path.resolve(row.provenance))]);
  assertV4(sha256(candidateBytes) === row.candidateSha256 &&
    sha256(provenanceBytes) === row.provenanceSha256, `${debateNumber}: candidate changed`);
  const auditRow = { debateNumber, debateId: row.debateId, finalCandidate: row.candidate,
    finalCandidateSha256: row.candidateSha256, provenance: row.provenance,
    provenanceSha256: row.provenanceSha256, validation: row.validation };
  const packet = buildPostCanaryBatch08RenderingPacket({ auditRow,
    candidate: JSON.parse(candidateBytes), provenance: JSON.parse(provenanceBytes),
    previewPath: RENDERING_PREVIEW, previewSha256: sha256(previewBytes), provenTransport });
  const outputPath = `${PACKETS_ROOT}/debate-${debateNumber}.json`;
  const bytes = Buffer.from(`${JSON.stringify(packet, null, 2)}\n`);
  packets.push({ debateNumber, debateId: row.debateId, path: outputPath,
    sha256: sha256(bytes), bytes: bytes.length, serialized: bytes });
}
const sources = [FINALIZATION_PREPARATION, FINALIZATION_ACTIVATION, FINALIZATION_EXECUTION,
  FINALIZATION_ANALYSIS, FINALIZATION_AUDIT, ORIGINAL_PREVIEW, PROVEN_ANALYSIS, PROVEN_AUDIT,
  PROVEN_NAVIGATION, PROVEN_PREFLIGHT, POST_CANARY_BATCH_08_STANDING_AUTHORIZATION,
  "src/app.js", "src/styles.css", "scripts/lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v6.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-rendering-browser-runner-v6.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v9.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-rendering-navigation-fresh-tab-v9.mjs",
  "scripts/lib/assessment-production-post-canary-batch-08-rendering-verification.mjs",
  "scripts/lib/assessment-production-post-canary-batch-08-rendering-browser-runner.mjs",
  "scripts/lib/assessment-production-post-canary-batch-08-publication-finalization.mjs",
  "scripts/lib/assessment-production-post-canary-batch-08-standing-authorization.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-08-rendering-verification.mjs",
  "scripts/test-assessment-production-post-canary-batch-08-rendering-verification-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-08-rendering-verification.mjs",
  "scripts/validate-assessment-production-post-canary-batch-08-rendering-evidence.mjs",
  "scripts/finalize-assessment-production-post-canary-batch-08-rendering-verification.mjs",
  ...finalAudit.rows.flatMap((row) => [row.candidate, row.provenance])];
const sourceHashes = {};
for (const file of [...new Set(sources)].sort()) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
sourceHashes[RENDERING_PREVIEW] = sha256(previewBytes);
sourceHashes[COMPATIBILITY_BOUNDARY] = sha256(compatibilityBytes);
const futureOutputPathsExcludedFromSourceHashes = [ACTIVATION, EXECUTION, ANALYSIS, RENDERING_AUDIT,
  ...packets.flatMap((row) => ["desktop", "mobile"].flatMap((name) => {
    const root = `${POST_CANARY_BATCH_08_RENDERING_ROOT}/evidence/debate-${row.debateNumber}`;
    return [`${root}/${name}.json`, `${root}/${name}-collapsed.jpg`, `${root}/${name}-open.jpg`];
  }))];
for (const file of futureOutputPathsExcludedFromSourceHashes) assertV4(!(await exists(file)), `${file} exists`);
const toolHashes = { [IMAGE_MAGICK]: sha256(await readFile(IMAGE_MAGICK)) };
const manifest = { schemaVersion: "1.0-assessment-production-post-canary-batch-08-rendering-verification-preparation",
  protocolId: POST_CANARY_BATCH_08_RENDERING_PROTOCOL_ID,
  status: "frozen-post-canary-batch-08-rendering-verification-prepared",
  frozenAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 8, stagingOnly: true,
  userAuthorization: { standingAuthorization: POST_CANARY_BATCH_08_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standing.sha256, directIncrementalCostUsdMaximum: 0 },
  packets: packets.map(({ serialized, ...row }) => row), explicitOrder: POST_CANARY_BATCH_08_RENDERING_ORDER,
  viewports: POST_CANARY_BATCH_08_RENDERING_VIEWPORTS,
  requiredBooleanChecks: POST_CANARY_BATCH_08_RENDERING_REQUIRED_BOOLEAN_CHECKS,
  browserPlan: { controller: "split-Chromium-fresh-keyboard-location-assign-transport",
    pointerSurface: "Codex In-app Chromium browser", keyboardSurface: "Google Chrome via ChatGPT browser extension",
    port: POST_CANARY_BATCH_08_RENDERING_PORT, explicitViewportOrder: ["desktop", "mobile"],
    oneAttemptPerViewport: true, retriesMaximum: 0, timeoutExtensionsMaximum: 0,
    timeoutMsPerViewport: 15000 },
  gateExpectations: { debates: 10, sections: 51, moves: 182, viewportResults: 20,
    screenshots: 40, requiredBooleanChecks: 760, runtimeFailures: 0,
    retries: 0, timeoutExtensions: 0, directIncrementalCostUsd: 0 },
  failurePolicy: { stopOnFirstViewportFailure: true, preserveOnlyPassingEvidence: true,
    repairNotAutomatic: true, retry: false, timeoutExtension: false },
  model: { ...POST_CANARY_BATCH_08_RENDERING_MODEL, contextsPlannedThisStage: 0 },
  sourceHashes, toolHashes, futureOutputPathsExcludedFromSourceHashes,
  artifacts: { preparation: PREPARATION, activation: ACTIVATION, execution: EXECUTION,
    analysis: ANALYSIS, renderingAudit: RENDERING_AUDIT,
    evidenceRoot: `${POST_CANARY_BATCH_08_RENDERING_ROOT}/evidence`,
    preview: RENDERING_PREVIEW, compatibilityBoundary: COMPATIBILITY_BOUNDARY },
  authorization: { renderingVerificationPreparation: true, executionActivation: true,
    renderingVerification: false, modelExecution: false, paidServices: false,
    productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: "activate-batch-08-rendering-verification" };
if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(RENDERING_PREVIEW)), { recursive: true });
  await writeFile(path.resolve(RENDERING_PREVIEW), previewBytes);
  await writeFile(path.resolve(COMPATIBILITY_BOUNDARY), compatibilityBytes);
  for (const row of packets) { await mkdir(path.dirname(path.resolve(row.path)), { recursive: true });
    await writeFile(path.resolve(row.path), row.serialized); }
  await writeFile(path.resolve(PREPARATION), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({ status: manifest.status, debates: 10, sections: 51, moves: 182,
  viewportResultsPlanned: 20, screenshotsPlanned: 40, transport: manifest.browserPlan.controller,
  attemptsPerViewport: 1, retriesMaximum: 0, directIncrementalCostUsd: 0,
  nextAuthorizedAction: manifest.nextAuthorizedAction }, null, 2));
