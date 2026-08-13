#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_RENDERING_REMEDY_V6_PROTOCOL_ID,
  CHECKPOINT_V22_RENDERING_REMEDY_V6_ROOT,
  validateCheckpointV22RenderingRemedyV6Packet
} from "./lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v6.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const authorizedAtIndex = process.argv.indexOf("--authorized-at");
const authorizedAt = authorizedAtIndex >= 0
  ? process.argv[authorizedAtIndex + 1]
  : new Date().toISOString();
assertV4(!Number.isNaN(Date.parse(authorizedAt)), "--authorized-at must be ISO time");

const preparationPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V6_ROOT}/preparation-manifest.json`;
const activationPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V6_ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const preparationBytes = await readFile(path.resolve(preparationPath));
const preparation = JSON.parse(preparationBytes);

assertV4(
  preparation.protocolId === CHECKPOINT_V22_RENDERING_REMEDY_V6_PROTOCOL_ID &&
    preparation.status ===
      "sixth-replacement-rendering-verification-plan-prepared-and-frozen" &&
    preparation.authorization.remedyV6PlanPreparation === true &&
    preparation.authorization.executionActivation === false &&
    preparation.authorization.candidateBrowserControl === false &&
    preparation.authorization.screenshotCapture === false &&
    preparation.nextAuthorizedAction ===
      "user-decision-on-rendering-verification-remedy-v6-execution-activation",
  "frozen remedy-v6 preparation required"
);
execFileSync(
  process.execPath,
  ["scripts/test-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v6-preparation.mjs"],
  { cwd: process.cwd(), stdio: "pipe" }
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `source hash mismatch before remedy-v6 activation: ${file}`
  );
}
for (const row of preparation.packets) {
  const bytes = await readFile(path.resolve(row.path));
  assertV4(
    sha256(bytes) === row.sha256 && bytes.length === row.bytes,
    `${row.debateNumber}: remedy-v6 packet hash mismatch`
  );
  validateCheckpointV22RenderingRemedyV6Packet(JSON.parse(bytes));
}
for (const output of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(output)), `future output already exists: ${output}`);
}

const activationCommit = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8"
}).trim();
const preparationSha256 = sha256(preparationBytes);
const tokenInput = {
  protocolId: CHECKPOINT_V22_RENDERING_REMEDY_V6_PROTOCOL_ID,
  authorizedAt,
  activationCommit,
  preparationSha256
};
const navigationToken = sha256(canonicalJson(tokenInput));
const activation = {
  schemaVersion:
    "1.0-production-checkpoint-v2.2-rendering-remedy-v6-execution-activation",
  protocolId: CHECKPOINT_V22_RENDERING_REMEDY_V6_PROTOCOL_ID,
  status:
    "sixth-replacement-rendering-verification-execution-authorized-and-frozen",
  authorizedAt,
  activationCommit,
  productionCanary: true,
  stagingOnly: true,
  preparation: {
    path: preparationPath,
    sha256: preparationSha256
  },
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
    adaptiveRegenerationPermitted: false,
    priorMeasuredCandidateUrlReusePermitted: false
  },
  sourceHashes: preparation.sourceHashes,
  packetHashes: Object.fromEntries(
    preparation.packets.map((row) => [row.path, row.sha256])
  ),
  controller: preparation.browserPlan.controller,
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
    modelExecution: false,
    renderingRepair: false,
    validatorMigration: false,
    productionLedgerPublication: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction:
    "single-remedy-v6-rendering-execution-under-frozen-stop-rules"
};

if (shouldWrite) {
  assertV4(!(await exists(activationPath)), "remedy-v6 activation already exists");
  const temporary = `${path.resolve(activationPath)}.tmp`;
  await writeFile(temporary, `${JSON.stringify(activation, null, 2)}\n`);
  await rename(temporary, path.resolve(activationPath));
}
console.log(JSON.stringify(activation, null, 2));
