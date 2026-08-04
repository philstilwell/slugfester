#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { V388_PERFORMANCE_ROOT, assertV388, canonicalJson, readJson } from "./lib/v388-performance-judgment.mjs";

const root = process.cwd();
const recoveryRoot = `${V388_PERFORMANCE_ROOT}/validated-recovery`;
const bytes = (relativePath) => readFile(path.resolve(root, relativePath));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (relativePath) => { try { await access(path.resolve(root, relativePath)); return true; } catch { return false; } };
const manifest = await readJson(`${recoveryRoot}/execution-manifest.json`);
assertV388(manifest.schemaVersion === "3.8.8-performance-validated-recovery-execution-manifest" && manifest.status === "frozen-six-context-validated-recovery-authorized", "validated recovery manifest invalid");
assertV388(manifest.provenance.originalPreInferenceAttempts === 6 && manifest.provenance.schemaRecoveryPreInferenceAttempts === 6 && manifest.provenance.priorValidDebateContexts === 0 && manifest.provenance.priorDebateMoveJudgments === 0 && manifest.provenance.exactSharedSchemaEndpointAccepted && manifest.provenance.exactSharedSchemaPacketValidationPassed, "validated recovery provenance invalid");
assertV388(manifest.population.debates === 3 && manifest.population.moves === 81 && manifest.population.highConfidenceAttributions === 81 && manifest.population.pendingAudioVerifications === 0, "validated recovery population invalid");
assertV388(manifest.contexts.length === 6 && manifest.authorization.validatedRecoveryContexts === 6 && manifest.authorization.validatedRecoveryModelExecution && manifest.authorization.deterministicDisagreementExtractionAfterRecovery && !manifest.authorization.furtherAutomaticRetry, "validated recovery authorization invalid");
for (const key of ["performanceAdjudicationModelExecution", "scoreDerivation", "numericalParticipantScoring", "assessmentProse", "productionMutation", "tenDebateGate", "all195Debates"]) assertV388(manifest.authorization[key] === false, `${key} must remain unauthorized`);
assertV388(Object.values(manifest.isolation).every(Boolean), "validated recovery isolation invalid");
assertV388(manifest.executionPolicy.contexts === 6 && manifest.executionPolicy.attemptsPerContext === 1 && manifest.executionPolicy.retriesWithinRecoveryMaximum === 0 && manifest.executionPolicy.authentication === "ChatGPT subscription" && manifest.executionPolicy.APIKeysRemoved && manifest.executionPolicy.meteredApiCostUsdMaximum === 0, "validated recovery execution policy invalid");
const identities = new Set(); const packets = new Map(); let judgments = 0;
for (const context of manifest.contexts) { const packet = await readJson(context.packet); const encoded = canonicalJson(packet); if (packets.has(context.debateNumber)) assertV388(packets.get(context.debateNumber) === encoded, `${context.debateNumber}: packet differs across passes`); else packets.set(context.debateNumber, encoded); identities.add(`${context.pass}:${context.debateNumber}`); judgments += context.moveCount; }
assertV388(identities.size === 6 && judgments === 162 && new Set(manifest.contexts.map((context) => context.schema)).size === 1, "validated recovery context set invalid");
for (const [relativePath, digest] of Object.entries(manifest.sourceHashes)) assertV388(sha256(await bytes(relativePath)) === digest, `${relativePath}: validated recovery source hash mismatch`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assertV388(!(await exists(future)), `${future}: validated recovery output already exists`);
console.log(JSON.stringify({ status: "passed", validatedRecoveryLockIntegrityPassed: true, contexts: 6, moves: 81, moveJudgmentsAcrossPasses: 162, exactSharedSchemaPreflightPassed: true, pendingAudioVerifications: 0, maximumMeteredCostUsd: 0, scoreDerivationAuthorized: false }, null, 2));
