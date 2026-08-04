#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V388_PERFORMANCE_DEBATES, V388_PERFORMANCE_PASSES, V388_PERFORMANCE_ROOT, assertV388, readJson } from "./lib/v388-performance-judgment.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) throw new Error("--frozen-at must be an ISO timestamp");
const recoveryRoot = `${V388_PERFORMANCE_ROOT}/validated-recovery`;
const manifestPath = `${recoveryRoot}/execution-manifest.json`;
if (shouldWrite) { try { await access(path.resolve(root, manifestPath)); throw new Error(`${manifestPath} already exists`); } catch (error) { if (error.code !== "ENOENT") throw error; } }
const preparation = await readJson(`${V388_PERFORMANCE_ROOT}/preparation-manifest.json`);
const preflightAuditPath = `${V388_PERFORMANCE_ROOT}/schema-preflight-recovery/validator-recovery-audit.json`;
const preflightAudit = await readJson(preflightAuditPath);
const initialFailure = await readJson(`${V388_PERFORMANCE_ROOT}/initial-model-execution.json`);
const schemaFailure = await readJson(`${V388_PERFORMANCE_ROOT}/schema-recovery/model-execution.json`);
assertV388(preflightAudit.status === "passed-existing-output-revalidated-with-semantic-anchor" && preflightAudit.endpointAccepted && preflightAudit.recoveredValidation.status === "passed" && preflightAudit.authorization.sixContextPerformanceRecoveryPreregistration, "end-to-end schema preflight did not authorize recovery preregistration");
assertV388(initialFailure.validOutputContexts === 0 && schemaFailure.validOutputContexts === 0 && initialFailure.moveJudgmentsAcrossPasses === 0 && schemaFailure.moveJudgmentsAcrossPasses === 0, "prior pre-inference failure boundary invalid");
const schemaPath = `${V388_PERFORMANCE_ROOT}/performance-judgment-schema.json`;
const contexts = [];
for (const pass of V388_PERFORMANCE_PASSES) for (const debateNumber of V388_PERFORMANCE_DEBATES) {
  const packetPath = `${V388_PERFORMANCE_ROOT}/packets/debate-${debateNumber}.json`;
  const packet = await readJson(packetPath);
  contexts.push({ pass, debateNumber, debateId: packet.debateId, moveCount: packet.moves.length, packet: packetPath, schema: schemaPath, transcript: packet.sourceChain.transcriptPath, events: packet.sourceChain.eventsPath, captionManifest: packet.sourceChain.localManifestPath, output: `${recoveryRoot}/outputs/debate-${debateNumber}-pass-${pass.toLowerCase()}.json` });
}
const bytes = (relativePath) => readFile(path.resolve(root, relativePath));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceFiles = [
  preparation.inputs.workflowPath, preparation.inputs.rubricPath, preparation.inputs.manualPath, preparation.inputs.preregistrationPath, `${V388_PERFORMANCE_ROOT}/preparation-manifest.json`, `${V388_PERFORMANCE_ROOT}/preparation-assessment.md`, `${V388_PERFORMANCE_ROOT}/dry-fixture.json`,
  schemaPath, `${V388_PERFORMANCE_ROOT}/schema-keyword-recovery-audit.json`, `${V388_PERFORMANCE_ROOT}/schema-preflight/audit.json`, preflightAuditPath,
  `${V388_PERFORMANCE_ROOT}/initial-model-execution.json`, `${V388_PERFORMANCE_ROOT}/schema-recovery/model-execution.json`,
  "scripts/lib/reassessment-scoring.mjs", "scripts/lib/v385-transport.mjs", "scripts/lib/v388-performance-judgment.mjs", "scripts/validate-v388-performance-judgment-output.mjs",
  "scripts/preregister-v388-performance-validated-recovery.mjs", "scripts/validate-v388-performance-validated-recovery-lock.mjs", "scripts/run-v388-performance-validated-recovery.mjs",
  ...contexts.flatMap((context) => [context.packet, context.transcript, context.events, context.captionManifest])
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await bytes(file));
const execution = `${recoveryRoot}/model-execution.json`;
const manifest = {
  schemaVersion: "3.8.8-performance-validated-recovery-execution-manifest",
  protocolId: "v3.8.8-performance-judgment-consensus",
  stage: "two-independent-performance-passes-after-end-to-end-schema-preflight",
  status: "frozen-six-context-validated-recovery-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  provenance: { originalPreInferenceAttempts: 6, schemaRecoveryPreInferenceAttempts: 6, priorValidDebateContexts: 0, priorDebateMoveJudgments: 0, syntheticPreflightContexts: 2, exactSharedSchemaEndpointAccepted: true, exactSharedSchemaPacketValidationPassed: true, meteredApiCostUsdToDate: 0 },
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" },
  modelInputs: { workflow: preparation.inputs.workflowPath, rubric: preparation.inputs.rubricPath, manual: preparation.inputs.manualPath, sharedSchema: schemaPath, fullTranscriptRequired: true, timestampedEventsRequired: true },
  population: { debates: 3, moves: 81, movesByDebate: Object.fromEntries(preparation.packets.map((packet) => [packet.debateNumber, packet.moveCount])), highConfidenceAttributions: 81, pendingAudioVerifications: 0 },
  contexts,
  authorization: { validatedRecoveryContexts: 6, validatedRecoveryModelExecution: true, deterministicDisagreementExtractionAfterRecovery: true, furtherAutomaticRetry: false, performanceAdjudicationModelExecution: false, scoreDerivation: false, numericalParticipantScoring: false, assessmentProse: false, productionMutation: false, tenDebateGate: false, all195Debates: false },
  isolation: { freshTemporaryCodexHomePerContext: true, freshSourceDirectoryPerContext: true, exactSamePacketForBothPasses: true, exactSameEndpointAcceptedSchemaForAllContexts: true, otherPassUnavailable: true, otherDebatesUnavailable: true, legacyAssessmentsUnavailable: true, calculatedTotalsUnavailable: true, winnerUnavailable: true, participantAssessmentProseUnavailable: true, overallCommentaryUnavailable: true, aiExtensionUnavailable: true },
  executionPolicy: { contexts: 6, attemptsPerContext: 1, retriesWithinRecoveryMaximum: 0, sequentialExecution: true, perInvocationTimeoutMs: 3600000, recoverableStreamEventsNormalMaximum: 2, recoverableStreamEventsHardMaximum: 8, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  acceptanceRule: { validContextsRequired: 6, validMoveJudgmentsRequiredAcrossPasses: 162, packetAwareValidatorRequired: true, invalidMoveJudgmentsMaximum: 0, modelCalculatedTotalsMaximum: 0, modelAssessmentProseFieldsMaximum: 0, disagreementCountDoesNotFailInitialPhase: true },
  stopRules: { sourceHashMismatchBlocksExecution: true, preexistingRecoveryOutputBlocksExecution: true, invalidContextBlocksDisagreementExtraction: true, pendingAudioBlocksExecution: true, furtherAutomaticRetryAuthorized: false, adjudicationRequiresSeparatePhaseLock: true, scoreDerivationRemainsBlocked: true, assessmentProseRemainsBlocked: true },
  artifacts: { execution, outputs: contexts.map((context) => context.output) },
  futureOutputPathsExcludedFromSourceHashes: [...contexts.map((context) => context.output), execution],
  sourceHashes
};
if (shouldWrite) { await mkdir(path.resolve(root, recoveryRoot), { recursive: true }); await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`); }
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", contexts: 6, moves: 81, moveJudgmentsAcrossPasses: 162, exactSharedSchemaPreflightPassed: true, maximumMeteredCostUsd: 0, scoreDerivationAuthorized: false }, null, 2));
