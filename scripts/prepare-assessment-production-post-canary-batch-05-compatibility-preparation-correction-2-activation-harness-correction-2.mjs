#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

const CORRECTION_ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-05/production-compatibility/preparation-validation-correction-2";
const RECOVERY_ROOT = `${CORRECTION_ROOT}/activation-harness-correction-2`;
const CORRECTION_PLAN = `${CORRECTION_ROOT}/correction-plan.json`;
const CORRECTION_ACTIVATION = `${CORRECTION_ROOT}/execution-activation.json`;
const TARGET_SCRIPT = "scripts/activate-assessment-production-post-canary-batch-05-compatibility-preparation-correction-2.mjs";
const PREPARE_SCRIPT = "scripts/prepare-assessment-production-post-canary-batch-05-compatibility-preparation-correction-2-activation-harness-correction-2.mjs";
const ACTIVATE_SCRIPT = "scripts/activate-assessment-production-post-canary-batch-05-compatibility-preparation-correction-2-activation-harness-correction-2.mjs";
const RUN_SCRIPT = "scripts/run-assessment-production-post-canary-batch-05-compatibility-preparation-correction-2-activation-harness-correction-2.mjs";
const DIAGNOSIS = `${RECOVERY_ROOT}/diagnosis.json`;
const PROPOSED_SCRIPT = `${RECOVERY_ROOT}/proposed-activation-script.mjs`;
const PROPOSED_PLAN = `${RECOVERY_ROOT}/proposed-correction-plan.json`;
const PLAN = `${RECOVERY_ROOT}/correction-plan.json`;
const ACTIVATION = `${RECOVERY_ROOT}/execution-activation.json`;
const EXECUTION = `${RECOVERY_ROOT}/execution.json`;
const ANALYSIS = `${RECOVERY_ROOT}/analysis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) throw new Error("--frozen-at requires an ISO timestamp");
if (await exists(RECOVERY_ROOT)) throw new Error("activation harness correction-2 already exists");
if (await exists(CORRECTION_ACTIVATION)) throw new Error("correction-2 activation unexpectedly exists");

const [correctionPlanBytes, targetScriptBytes] = await Promise.all([readFile(CORRECTION_PLAN), readFile(TARGET_SCRIPT)]);
const correctionPlan = JSON.parse(correctionPlanBytes);
const before = "JSON.parse(await readFile(plan.correctionScope.target)).preparation?.sha256 !==\n+    plan.correctionScope.oldSha256";
const after = "JSON.parse(await readFile(plan.correctionScope.target)).preparation?.sha256 !==\n+    plan.correctionScope.oldSha256".replace("\n+", "\n");
const targetScriptText = targetScriptBytes.toString("utf8");
if (targetScriptText.split(before).length !== 2) throw new Error("literal unary-plus preflight defect is not unique");
if (correctionPlan.sourceHashes?.[TARGET_SCRIPT] !== sha256(targetScriptBytes)) throw new Error("correction-2 plan does not authenticate the recursively failed harness");
const proposedScriptBytes = Buffer.from(targetScriptText.replace(before, after));
const proposedCorrectionPlan = structuredClone(correctionPlan);
proposedCorrectionPlan.sourceHashes[TARGET_SCRIPT] = sha256(proposedScriptBytes);
const proposedCorrectionPlanBytes = jsonBytes(proposedCorrectionPlan);
const diagnosis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-compatibility-preparation-correction-2-activation-harness-recursive-diagnosis",
  status: "frozen-batch-05-correction-2-activation-preflight-unary-plus-error-diagnosed",
  diagnosedAt: frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  failedCommand: "node scripts/activate-assessment-production-post-canary-batch-05-compatibility-preparation-correction-2.mjs --activated-at 2026-08-22T15:27:08.000Z",
  failure: {
    category: "deterministic-recursive-activation-preflight-literal-unary-plus",
    exitCode: 1,
    message: "correction-2 preimage or proposed hash is unauthenticated",
    preservedValuesMatched: true,
    cause: "The frozen correction-1 replacement retained a literal leading plus before plan.correctionScope.oldSha256; unary numeric conversion made the equality check fail."
  },
  writesBeforeFailure: 0,
  correction2ActivationCreated: false,
  proposedAnalysisChanged: false,
  recoveryLevel: 2,
  furtherRecoveryAllowedForSamePreflight: false,
  modelContexts: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0
};
const sourceFiles = [CORRECTION_PLAN, TARGET_SCRIPT, PREPARE_SCRIPT, ACTIVATE_SCRIPT, RUN_SCRIPT];
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async (file) => [file, sha256(await readFile(file))])));
const plan = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-compatibility-preparation-correction-2-activation-harness-correction-2-plan",
  status: "frozen-batch-05-correction-2-activation-harness-correction-2-prepared",
  frozenAt,
  diagnosis: { path: DIAGNOSIS, sha256: sha256(jsonBytes(diagnosis)) },
  correctionScope: {
    targetScript: TARGET_SCRIPT,
    exactFaultyExpression: before,
    exactCorrectedExpression: after,
    correctionPlan: CORRECTION_PLAN,
    authenticatedSourceHashUpdates: 1,
    writableCharactersRemoved: 1,
    proposedAnalysisPreserved: true,
    correction2TargetPreserved: true
  },
  proposed: {
    activationScript: { path: PROPOSED_SCRIPT, sha256: sha256(proposedScriptBytes), bytes: proposedScriptBytes.length },
    correctionPlan: { path: PROPOSED_PLAN, sha256: sha256(proposedCorrectionPlanBytes), bytes: proposedCorrectionPlanBytes.length }
  },
  sourceHashes,
  executionPolicy: { attemptsMaximum: 1, retriesMaximum: 0, rerunsMaximum: 0, furtherRecoveryForSamePreflight: false, modelContexts: 0, paidServiceCalls: 0 },
  artifacts: { activation: ACTIVATION, execution: EXECUTION, analysis: ANALYSIS },
  nextAuthorizedAction: "activate-one-recursive-batch-05-correction-2-activation-harness-correction-2-pass"
};
await mkdir(RECOVERY_ROOT, { recursive: true });
await Promise.all([writeFile(DIAGNOSIS, jsonBytes(diagnosis)), writeFile(PROPOSED_SCRIPT, proposedScriptBytes), writeFile(PROPOSED_PLAN, proposedCorrectionPlanBytes), writeFile(PLAN, jsonBytes(plan))]);
console.log(JSON.stringify({ status: plan.status, recoveryLevel: 2, writableCharactersRemoved: 1, directIncrementalCostUsd: 0, nextAuthorizedAction: plan.nextAuthorizedAction }, null, 2));
