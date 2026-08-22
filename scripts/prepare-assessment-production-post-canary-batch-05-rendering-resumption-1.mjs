#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_05_RENDERING_ORDER,
  POST_CANARY_BATCH_05_RENDERING_ROOT,
  validatePostCanaryBatch05RenderingPacket
} from "./lib/assessment-production-post-canary-batch-05-rendering-verification.mjs";
import {
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_ACTIVATION,
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_ANALYSIS,
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_APPROVED_SCOPE,
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_AUDIT,
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_DOCUMENTATION,
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_EXECUTION,
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_FAILURE,
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_PREPARATION,
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_PROTOCOL_ID,
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_ROOT,
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_VIEWPORT_PLAN,
  sha256Batch05RenderingResumption1,
  validatePostCanaryBatch05RenderingResumption1Plan
} from "./lib/assessment-production-post-canary-batch-05-rendering-resumption-1.mjs";
import {
  POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
  POST_CANARY_BATCH_05_STANDING_AUTHORIZATION_INSTRUCTION,
  loadAndValidatePostCanaryBatch05StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-05-standing-authorization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt =
  frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : new Date().toISOString();
assertV4(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be ISO time");

const ORIGINAL_PREPARATION = `${POST_CANARY_BATCH_05_RENDERING_ROOT}/preparation-manifest.json`;
const ORIGINAL_ACTIVATION = `${POST_CANARY_BATCH_05_RENDERING_ROOT}/execution-activation.json`;
const EVIDENCE_ROOT = `${POST_CANARY_BATCH_05_RENDERING_ROOT}/evidence`;
const parse = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
const exists = (file) =>
  access(path.resolve(file)).then(
    () => true,
    () => false
  );
const sha256 = sha256Batch05RenderingResumption1;
const standingAuthorization =
  await loadAndValidatePostCanaryBatch05StandingAuthorization();

if (shouldWrite) {
  assertV4(
    !(await exists(POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_ROOT)),
    "Batch 5 rendering resumption-1 preparation already exists"
  );
}

const [originalPreparationBytes, originalActivationBytes] = await Promise.all([
  readFile(path.resolve(ORIGINAL_PREPARATION)),
  readFile(path.resolve(ORIGINAL_ACTIVATION))
]);
const originalPreparation = JSON.parse(originalPreparationBytes);
const originalActivation = JSON.parse(originalActivationBytes);

assertV4(
  originalPreparation.status ===
      "frozen-post-canary-batch-05-rendering-verification-prepared-not-authorized" &&
    originalActivation.status ===
      "frozen-post-canary-batch-05-rendering-verification-authorized" &&
    originalActivation.preparation.path === ORIGINAL_PREPARATION &&
    originalActivation.preparation.sha256 === sha256(originalPreparationBytes) &&
    originalActivation.authorization.oneAttemptPerViewport === true &&
    originalActivation.authorization.retry === false &&
    originalActivation.authorization.timeoutExtension === false &&
    originalActivation.authorization.modelExecution === false &&
    originalActivation.authorization.paidServices === false &&
    originalActivation.authorization.productionMutation === false &&
    canonicalJson(originalPreparation.explicitOrder) ===
      canonicalJson(POST_CANARY_BATCH_05_RENDERING_ORDER),
  "frozen original Batch 5 rendering activation required"
);
assertV4(
  !(await exists(EVIDENCE_ROOT)) &&
    !(await exists(`${POST_CANARY_BATCH_05_RENDERING_ROOT}/execution.json`)) &&
    !(await exists(`${POST_CANARY_BATCH_05_RENDERING_ROOT}/analysis.json`)) &&
    !(await exists(`${POST_CANARY_BATCH_05_RENDERING_ROOT}/rendering-audit.json`)),
  "bootstrap-only failure must not have candidate evidence or completion records"
);
for (const [file, digest] of Object.entries(originalActivation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `${file}: original source changed`);
}
for (const [file, digest] of Object.entries(originalActivation.toolHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `${file}: original tool changed`);
}
for (const row of originalPreparation.packets) {
  const bytes = await readFile(path.resolve(row.path));
  assertV4(
    sha256(bytes) === row.sha256 && bytes.length === row.bytes,
    `${row.debateNumber}: original rendering packet changed`
  );
  validatePostCanaryBatch05RenderingPacket(JSON.parse(bytes));
}
validatePostCanaryBatch05RenderingResumption1Plan(
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_VIEWPORT_PLAN
);

const failure = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-05-rendering-transport-failure-diagnosis",
  protocolId: POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_PROTOCOL_ID,
  status: "preserved-batch-05-bootstrap-only-transport-readiness-failure",
  diagnosedAt: frozenAt,
  productionCanary: false,
  batchNumber: 5,
  affectedViewport: {
    debateNumber: "158",
    viewportName: "desktop",
    phase: "pointer",
    stage: "bootstrap"
  },
  observedFailure: {
    category: "browser-transport-documentation-precondition",
    message:
      'Required documentation has not been read: "capabilities/tab/cdp". Read the instructions with await agent.documentation.get("capabilities/tab/cdp").',
    bootstrapHttpStatus: 200,
    candidatePagesLoaded: 0,
    screenshotsCaptured: 0,
    evidenceFilesPersisted: 0,
    candidateSemanticValidationReached: false
  },
  diagnosis:
    "The frozen pointer transport reached only its local diagnostic bootstrap. The browser controller refused low-level diagnostic access before any candidate navigation because its packaged CDP instructions had not yet been loaded.",
  materiality: {
    candidateChanged: false,
    participantScoresChanged: false,
    publicationFieldsChanged: false,
    productionChanged: false,
    sourceChanged: false
  },
  originalPreparation: { path: ORIGINAL_PREPARATION, sha256: sha256(originalPreparationBytes) },
  originalActivation: { path: ORIGINAL_ACTIVATION, sha256: sha256(originalActivationBytes) },
  disposition: {
    originalActivationPreserved: true,
    originalAttemptNotPromoted: true,
    replacementAttemptRequiresSeparateFrozenResumption: true
  },
  directIncrementalCostUsd: 0
};
const failureBytes = Buffer.from(`${JSON.stringify(failure, null, 2)}\n`);

const directInputPaths = [
  ORIGINAL_PREPARATION,
  ORIGINAL_ACTIVATION,
  POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
  "docs/assessment-production-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "docs/assessment-production/manifest-v1.json",
  "docs/assessment-production/score-stability-policy-v2.2-promotion.json",
  "scripts/lib/assessment-production-post-canary-batch-05-standing-authorization.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-rendering-verification.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-rendering-browser-runner.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-rendering-resumption-1.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-05-rendering-resumption-1.mjs",
  "scripts/test-assessment-production-post-canary-batch-05-rendering-resumption-1-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-05-rendering-resumption-1.mjs",
  "scripts/validate-assessment-production-post-canary-batch-05-rendering-resumption-1-evidence.mjs",
  "scripts/finalize-assessment-production-post-canary-batch-05-rendering-resumption-1.mjs"
];
const sourceHashes = {};
for (const file of directInputPaths) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}

const futureOutputPathsExcludedFromSourceHashes = [
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_ACTIVATION,
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_EXECUTION,
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_ANALYSIS,
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_AUDIT,
  EVIDENCE_ROOT
];
for (const file of futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(file)), `future Batch 5 rendering resumption output exists: ${file}`);
}

const manifest = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-05-rendering-transport-readiness-resumption-1-preparation",
  protocolId: POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_PROTOCOL_ID,
  status: "frozen-batch-05-rendering-resumption-1-prepared-under-continuation-authorization",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false,
  batchNumber: 5,
  stagingOnly: true,
  userAuthorization: {
    instruction: POST_CANARY_BATCH_05_STANDING_AUTHORIZATION_INSTRUCTION,
    approvedScope: POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_APPROVED_SCOPE,
    directIncrementalCostUsdMaximum: 0,
    standingAuthorization: POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standingAuthorization.sha256
  },
  failureDiagnosis: {
    path: POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_FAILURE,
    sha256: sha256(failureBytes)
  },
  originalGate: {
    preparation: { path: ORIGINAL_PREPARATION, sha256: sha256(originalPreparationBytes) },
    activation: { path: ORIGINAL_ACTIVATION, sha256: sha256(originalActivationBytes) },
    navigationTokenPreservedButNotReused: originalActivation.executionNavigation.token,
    evidencePersisted: false
  },
  requiredDocumentationBeforeAnyBrowserTab: [
    ...POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_DOCUMENTATION
  ],
  viewportPlan: structuredClone(
    POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_VIEWPORT_PLAN
  ),
  packets: structuredClone(originalPreparation.packets),
  sourceHashes,
  inheritedSourceHashes: structuredClone(originalActivation.sourceHashes),
  toolHashes: structuredClone(originalActivation.toolHashes),
  gateExpectations: structuredClone(originalPreparation.gateExpectations),
  browserPlan: structuredClone(originalPreparation.browserPlan),
  compatibilityBoundary: structuredClone(originalPreparation.compatibilityBoundary),
  executionPolicy: {
    separateActivationRequired: true,
    documentationMustBeLoadedBeforeAnyBrowserTab: true,
    replacementAttemptsMaximum: 1,
    firstAttempts: 19,
    totalViewportAttemptsMaximum: 20,
    retriesAfterResumptionMaximum: 0,
    timeoutExtensionsMaximum: 0,
    adaptiveTransportChangesMaximum: 0,
    evidenceReusePermitted: false,
    originalNavigationTokenReusePermitted: false,
    modelContexts: 0,
    paidServiceCalls: 0
  },
  stopRules: {
    documentationPreconditionFailureStops: true,
    sourceHashMismatchStops: true,
    packetHashMismatchStops: true,
    viewportFailureStops: true,
    runtimeDiagnosticFailureStops: true,
    screenshotFailureStops: true,
    retryStops: true,
    timeoutExtensionStops: true,
    scoreOrSourceChangeStops: true,
    modelExecutionStops: true,
    paidServiceStops: true,
    productionMutationStops: true,
    nextBatchSelectionStops: true
  },
  artifacts: {
    failureDiagnosis: POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_FAILURE,
    preparation: POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_PREPARATION,
    activation: POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_ACTIVATION,
    evidenceRoot: EVIDENCE_ROOT,
    execution: POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_EXECUTION,
    analysis: POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_ANALYSIS,
    renderingAudit: POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_AUDIT
  },
  futureOutputPathsExcludedFromSourceHashes,
  authorization: {
    deterministicDiagnosis: true,
    resumptionPreparation: true,
    executionActivation: false,
    replacementViewportAttempt: false,
    remainingViewportAttempts: false,
    modelExecution: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  totals: {
    candidatePagesLoaded: 0,
    screenshotsCaptured: 0,
    evidenceFilesPersisted: 0,
    replacementAttemptsPrepared: 1,
    firstAttemptsPrepared: 19,
    directIncrementalCostUsd: 0
  },
  nextAuthorizedAction:
    "activate-and-execute-one-frozen-batch-05-rendering-resumption-1-under-continuation-authorization"
};

if (shouldWrite) {
  await mkdir(path.resolve(POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_ROOT), {
    recursive: true
  });
  await writeFile(path.resolve(POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_FAILURE), failureBytes);
  await writeFile(
    path.resolve(POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_PREPARATION),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
}

console.log(JSON.stringify(manifest, null, 2));
