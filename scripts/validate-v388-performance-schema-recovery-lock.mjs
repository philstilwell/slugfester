#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { V388_PERFORMANCE_ROOT, assertV388, canonicalJson, readJson } from "./lib/v388-performance-judgment.mjs";

const root = process.cwd();
const recoveryRoot = `${V388_PERFORMANCE_ROOT}/schema-recovery`;
const bytes = (relativePath) => readFile(path.resolve(root, relativePath));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (relativePath) => { try { await access(path.resolve(root, relativePath)); return true; } catch { return false; } };
const manifest = await readJson(`${recoveryRoot}/execution-manifest.json`);
assertV388(manifest.schemaVersion === "3.8.8-performance-schema-recovery-execution-manifest" && manifest.status === "frozen-six-context-recovery-authorized", "recovery manifest invalid");
assertV388(manifest.defectBoundary.failedAttempts === 6 && manifest.defectBoundary.failedValidContexts === 0 && manifest.defectBoundary.failedMoveJudgments === 0 && manifest.defectBoundary.failedOutputsWritten === 0 && manifest.defectBoundary.originalRetries === 0, "recovery defect boundary invalid");
assertV388(manifest.repairBoundary.typeAdditionsOnly === 24 && manifest.repairBoundary.existingValuesChanged === 0 && manifest.repairBoundary.semanticJudgmentContractChanged === false, "recovery repair boundary invalid");
assertV388(manifest.model.slug === "gpt-5.6-sol" && manifest.model.reasoningEffort === "high", "recovery model invalid");
assertV388(manifest.contexts.length === 6 && manifest.authorization.schemaCompatibilityRecoveryContexts === 6 && manifest.authorization.schemaCompatibilityRecoveryModelExecution && manifest.authorization.deterministicDisagreementExtractionAfterRecovery && !manifest.authorization.furtherAutomaticRetry, "recovery authorization invalid");
for (const key of ["performanceAdjudicationModelExecution", "scoreDerivation", "numericalParticipantScoring", "assessmentProse", "productionMutation", "tenDebateGate", "all195Debates"]) assertV388(manifest.authorization[key] === false, `${key} must remain unauthorized`);
assertV388(Object.values(manifest.isolation).every(Boolean), "recovery isolation invalid");
assertV388(manifest.executionPolicy.contexts === 6 && manifest.executionPolicy.attemptsPerContext === 1 && manifest.executionPolicy.retriesWithinRecoveryMaximum === 0 && manifest.executionPolicy.authentication === "ChatGPT subscription" && manifest.executionPolicy.APIKeysRemoved && manifest.executionPolicy.meteredApiCostUsdMaximum === 0, "recovery execution policy invalid");
const identities = new Set();
const packetByDebate = new Map();
let judgments = 0;
for (const context of manifest.contexts) {
  const packet = await readJson(context.packet);
  const encoded = canonicalJson(packet);
  if (packetByDebate.has(context.debateNumber)) assertV388(packetByDebate.get(context.debateNumber) === encoded, `${context.debateNumber}: packets differ across passes`);
  else packetByDebate.set(context.debateNumber, encoded);
  identities.add(`${context.pass}:${context.debateNumber}`);
  judgments += context.moveCount;
}
assertV388(identities.size === 6 && judgments === 162 && new Set(manifest.contexts.map((context) => context.schema)).size === 1, "recovery context set invalid");
for (const [relativePath, digest] of Object.entries(manifest.sourceHashes)) assertV388(sha256(await bytes(relativePath)) === digest, `${relativePath}: recovery source hash mismatch`);
assertV388(sha256(await bytes(manifest.modelInputs.sharedSchema)) === manifest.repairBoundary.repairedSchemaSha256, "repaired schema lock mismatch");
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assertV388(!Object.hasOwn(manifest.sourceHashes, future) && !(await exists(future)), `${future}: recovery output present or hashed`);
console.log(JSON.stringify({ status: "passed", recoveryLockIntegrityPassed: true, contexts: 6, moveJudgmentsAcrossPasses: 162, schemaTypeAdditions: 24, semanticJudgmentContractChanged: false, pendingAudioVerifications: 0, maximumMeteredCostUsd: 0, scoreDerivationAuthorized: false }, null, 2));
