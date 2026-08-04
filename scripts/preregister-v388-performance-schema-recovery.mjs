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
const recoveryRoot = `${V388_PERFORMANCE_ROOT}/schema-recovery`;
const manifestPath = `${recoveryRoot}/execution-manifest.json`;
if (shouldWrite) {
  try { await access(path.resolve(root, manifestPath)); throw new Error(`${manifestPath} already exists`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const bytes = (relativePath) => readFile(path.resolve(root, relativePath));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const auditPath = `${V388_PERFORMANCE_ROOT}/schema-compatibility-recovery-audit.json`;
const failurePath = `${V388_PERFORMANCE_ROOT}/initial-model-execution.json`;
const schemaPath = `${V388_PERFORMANCE_ROOT}/performance-judgment-schema.json`;
const preparation = await readJson(`${V388_PERFORMANCE_ROOT}/preparation-manifest.json`);
const audit = await readJson(auditPath);
const failure = await readJson(failurePath);
assertV388(audit.status === "passed-semantic-preserving-compatibility-repair" && audit.repair.semanticJudgmentContractChanged === false && audit.repair.existingValuesChanged === 0 && audit.repair.additions.length === 24, "schema recovery audit invalid");
assertV388(failure.validOutputContexts === 0 && failure.moveJudgmentsAcrossPasses === 0 && failure.totalAttempts === 6 && failure.totalRetries === 0, "initial failure boundary invalid");
assertV388(sha256(await bytes(schemaPath)) === audit.repair.newSchemaSha256, "repaired schema hash mismatch");

const contexts = [];
for (const pass of V388_PERFORMANCE_PASSES) for (const debateNumber of V388_PERFORMANCE_DEBATES) {
  const packetPath = `${V388_PERFORMANCE_ROOT}/packets/debate-${debateNumber}.json`;
  const packet = await readJson(packetPath);
  contexts.push({ pass, debateNumber, debateId: packet.debateId, moveCount: packet.moves.length, packet: packetPath, schema: schemaPath, transcript: packet.sourceChain.transcriptPath, events: packet.sourceChain.eventsPath, captionManifest: packet.sourceChain.localManifestPath, output: `${recoveryRoot}/outputs/debate-${debateNumber}-pass-${pass.toLowerCase()}.json` });
}
const sourceFiles = [
  preparation.inputs.workflowPath, preparation.inputs.rubricPath, preparation.inputs.manualPath, preparation.inputs.preregistrationPath,
  `${V388_PERFORMANCE_ROOT}/preparation-manifest.json`, `${V388_PERFORMANCE_ROOT}/dry-fixture.json`, `${V388_PERFORMANCE_ROOT}/preparation-assessment.md`,
  auditPath, failurePath, schemaPath,
  "scripts/lib/reassessment-scoring.mjs", "scripts/lib/v385-transport.mjs", "scripts/lib/v388-performance-judgment.mjs",
  "scripts/audit-v388-performance-schema-recovery.mjs", "scripts/validate-v388-performance-judgment-output.mjs",
  "scripts/preregister-v388-performance-schema-recovery.mjs", "scripts/validate-v388-performance-schema-recovery-lock.mjs", "scripts/run-v388-performance-schema-recovery.mjs",
  ...contexts.flatMap((context) => [context.packet, context.transcript, context.events, context.captionManifest])
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await bytes(file));
const executionPath = `${recoveryRoot}/model-execution.json`;
const manifest = {
  schemaVersion: "3.8.8-performance-schema-recovery-execution-manifest",
  protocolId: "v3.8.8-performance-judgment-consensus",
  stage: "semantic-preserving-schema-compatibility-recovery",
  status: "frozen-six-context-recovery-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  defectBoundary: { originalExecutionManifest: `${V388_PERFORMANCE_ROOT}/initial-execution-manifest.json`, failedExecution: failurePath, repairAudit: auditPath, failedAttempts: 6, failedValidContexts: 0, failedMoveJudgments: 0, failedOutputsWritten: 0, originalRetries: 0, meteredApiCostUsd: 0 },
  repairBoundary: { schema: schemaPath, oldSchemaSha256: audit.repair.oldSchemaSha256, repairedSchemaSha256: audit.repair.newSchemaSha256, typeAdditionsOnly: 24, existingValuesChanged: 0, semanticJudgmentContractChanged: false },
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" },
  modelInputs: { workflow: preparation.inputs.workflowPath, rubric: preparation.inputs.rubricPath, manual: preparation.inputs.manualPath, sharedSchema: schemaPath, fullTranscriptRequired: true, timestampedEventsRequired: true },
  contexts,
  authorization: { schemaCompatibilityRecoveryContexts: 6, schemaCompatibilityRecoveryModelExecution: true, deterministicDisagreementExtractionAfterRecovery: true, furtherAutomaticRetry: false, performanceAdjudicationModelExecution: false, scoreDerivation: false, numericalParticipantScoring: false, assessmentProse: false, productionMutation: false, tenDebateGate: false, all195Debates: false },
  isolation: { freshTemporaryCodexHomePerContext: true, freshSourceDirectoryPerContext: true, exactSamePacketForBothPasses: true, exactSameRepairedClosedSchemaForAllContexts: true, otherPassUnavailable: true, legacyAssessmentsUnavailable: true, calculatedTotalsUnavailable: true, winnerUnavailable: true, assessmentProseUnavailable: true },
  executionPolicy: { contexts: 6, attemptsPerContext: 1, retriesWithinRecoveryMaximum: 0, sequentialExecution: true, perInvocationTimeoutMs: 3600000, recoverableStreamEventsNormalMaximum: 2, recoverableStreamEventsHardMaximum: 8, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  acceptanceRule: { validContextsRequired: 6, validMoveJudgmentsRequiredAcrossPasses: 162, invalidMoveJudgmentsMaximum: 0, modelCalculatedTotalsMaximum: 0, modelAssessmentProseFieldsMaximum: 0 },
  stopRules: { sourceHashMismatchBlocksExecution: true, preexistingRecoveryOutputBlocksExecution: true, invalidContextBlocksDisagreementExtraction: true, pendingAudioBlocksExecution: true, furtherAutomaticRetryAuthorized: false, adjudicationRequiresSeparatePhaseLock: true, scoreDerivationRemainsBlocked: true },
  artifacts: { execution: executionPath, outputs: contexts.map((context) => context.output) },
  futureOutputPathsExcludedFromSourceHashes: [...contexts.map((context) => context.output), executionPath],
  sourceHashes
};
if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(root, manifestPath)), { recursive: true });
  await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", recoveryContexts: 6, repairedSchemaTypeAdditions: 24, semanticJudgmentContractChanged: false, maximumMeteredCostUsd: 0, scoreDerivationAuthorized: false }, null, 2));
