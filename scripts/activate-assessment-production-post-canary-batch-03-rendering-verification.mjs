#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_03_RENDERING_PROTOCOL_ID,
  POST_CANARY_BATCH_03_RENDERING_ROOT,
  validatePostCanaryBatch03RenderingPacket
} from "./lib/assessment-production-post-canary-batch-03-rendering-verification.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const authorizedAtIndex = process.argv.indexOf("--authorized-at");
const authorizedAt =
  authorizedAtIndex >= 0
    ? process.argv[authorizedAtIndex + 1]
    : new Date().toISOString();
assertV4(!Number.isNaN(Date.parse(authorizedAt)), "--authorized-at must be ISO time");

const PREPARATION = `${POST_CANARY_BATCH_03_RENDERING_ROOT}/preparation-manifest.json`;
const ACTIVATION = `${POST_CANARY_BATCH_03_RENDERING_ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) =>
  access(path.resolve(file)).then(
    () => true,
    () => false
  );
const preparationBytes = await readFile(path.resolve(PREPARATION));
const preparation = JSON.parse(preparationBytes);

assertV4(
  preparation.protocolId === POST_CANARY_BATCH_03_RENDERING_PROTOCOL_ID &&
    preparation.status ===
      "frozen-post-canary-batch-03-rendering-verification-prepared-not-authorized" &&
    preparation.authorization.renderingVerificationPreparation === true &&
    preparation.authorization.browserPreflight === false &&
    preparation.authorization.executionActivation === false &&
    preparation.authorization.candidateBrowserControl === false &&
    preparation.authorization.screenshotCapture === false &&
    preparation.authorization.renderingVerification === false &&
    preparation.authorization.modelExecution === false &&
    preparation.authorization.paidServices === false &&
    preparation.authorization.productionMutation === false &&
    preparation.nextAuthorizedAction ===
      "activate-and-execute-frozen-batch-03-rendering-verification-under-standing-authorization",
  "frozen Batch 3 rendering preparation required"
);
execFileSync(
  process.execPath,
  [
    "scripts/test-assessment-production-post-canary-batch-03-rendering-verification-preparation.mjs"
  ],
  { cwd: process.cwd(), stdio: "pipe" }
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `source hash mismatch before Batch 3 rendering activation: ${file}`
  );
}
for (const [file, digest] of Object.entries(preparation.toolHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `tool hash mismatch before Batch 3 rendering activation: ${file}`
  );
}
for (const row of preparation.packets) {
  const bytes = await readFile(path.resolve(row.path));
  assertV4(
    sha256(bytes) === row.sha256 && bytes.length === row.bytes,
    `${row.debateNumber}: Batch 3 rendering packet hash mismatch`
  );
  validatePostCanaryBatch03RenderingPacket(JSON.parse(bytes));
}
for (const output of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(output)), `future output already exists: ${output}`);
}
assertV4(
  !(await exists(preparation.artifacts.evidenceRoot)),
  "Batch 3 rendering evidence already exists"
);

const activationCommit = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8"
}).trim();
const preparationSha256 = sha256(preparationBytes);
const tokenInput = {
  protocolId: POST_CANARY_BATCH_03_RENDERING_PROTOCOL_ID,
  authorizedAt,
  activationCommit,
  preparationSha256
};
const navigationToken = sha256(canonicalJson(tokenInput));
const activation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-03-rendering-verification-execution-activation",
  protocolId: POST_CANARY_BATCH_03_RENDERING_PROTOCOL_ID,
  status: "frozen-post-canary-batch-03-rendering-verification-authorized",
  authorizedAt,
  activationCommit,
  productionCanary: false,
  batchNumber: 3,
  stagingOnly: true,
  userAuthorization: {
    instruction: preparation.userAuthorization.instruction,
    standingAuthorization: preparation.userAuthorization.standingAuthorization,
    standingAuthorizationSha256:
      preparation.userAuthorization.standingAuthorizationSha256,
    directIncrementalCostUsdMaximum: 0
  },
  preparation: { path: PREPARATION, sha256: preparationSha256 },
  executionNavigation: {
    algorithm: "sha256-utf8-canonical-json",
    input: tokenInput,
    token: navigationToken,
    tokenPattern: "^[a-f0-9]{64}$",
    queryKeys: {
      token: "renderingExecution",
      viewport: "renderingViewport",
      phase: "renderingPhase",
      stage: "renderingStage"
    },
    keyboardBootstrapMethod: "Page.navigate-once-per-fresh-keyboard-tab",
    keyboardMeasuredMethod:
      "Runtime.evaluate-location.assign-with-exact-url-readyState-poll",
    keyboardMeasuredDeadlineMilliseconds: 15000,
    adaptiveRegenerationPermitted: false,
    priorMeasuredCandidateUrlReusePermitted: false
  },
  sourceHashes: preparation.sourceHashes,
  toolHashes: preparation.toolHashes,
  packetHashes: Object.fromEntries(
    preparation.packets.map((row) => [row.path, row.sha256])
  ),
  browserPlan: preparation.browserPlan,
  viewports: preparation.viewports,
  explicitOrder: preparation.explicitOrder,
  requiredBooleanChecks: preparation.requiredBooleanChecks,
  gateExpectations: preparation.gateExpectations,
  failurePolicy: preparation.failurePolicy,
  model: preparation.model,
  authorization: {
    executionActivation: true,
    candidateBrowserControl: true,
    screenshotCapture: true,
    renderingVerification: true,
    oneAttemptPerViewport: true,
    retry: false,
    timeoutExtension: false,
    adaptiveTransportChange: false,
    modelExecution: false,
    paidServices: false,
    renderingRepair: false,
    validatorMigration: false,
    productionLedgerPublication: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction:
    "single-batch-03-rendering-verification-execution-under-standing-authorization-and-frozen-stop-rules"
};

if (shouldWrite) {
  assertV4(!(await exists(ACTIVATION)), "Batch 3 rendering activation already exists");
  const temporary = `${path.resolve(ACTIVATION)}.tmp`;
  await writeFile(temporary, `${JSON.stringify(activation, null, 2)}\n`);
  await rename(temporary, path.resolve(ACTIVATION));
}
console.log(JSON.stringify(activation, null, 2));
