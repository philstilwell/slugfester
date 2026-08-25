#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_09_PUBLICATION_TIMEOUT_RECOVERY_DEBATES as DEBATES,
  POST_CANARY_BATCH_09_PUBLICATION_TIMEOUT_RECOVERY_PROTOCOL_ID as PROTOCOL_ID,
  POST_CANARY_BATCH_09_PUBLICATION_TIMEOUT_RECOVERY_ROOT as ROOT,
  POST_CANARY_BATCH_09_PUBLICATION_TIMEOUT_SHARD_PACKET_VERSION,
  buildPublicationTimeoutRecoveryShardSchema
} from "./lib/assessment-production-post-canary-batch-09-publication-resumption-timeout-recovery.mjs";
import { POST_CANARY_BATCH_09_PUBLICATION_MODEL, POST_CANARY_BATCH_09_PUBLICATION_ROOT as PUBLICATION_ROOT } from "./lib/assessment-production-post-canary-batch-09-publication.mjs";
import { loadAndValidatePostCanaryBatch09StandingAuthorization } from "./lib/assessment-production-post-canary-batch-09-standing-authorization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--frozen-at");
const frozenAt = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

const RESUMPTION_ROOT = `${PUBLICATION_ROOT}/resumption-1`;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const DIAGNOSIS = `${RESUMPTION_ROOT}/timeout-failure-diagnosis.json`;
const EXECUTION = `${RESUMPTION_ROOT}/model-execution.json`;
const RESUMPTION_ACTIVATION = `${RESUMPTION_ROOT}/execution-activation.json`;
const STANDING = "docs/assessment-production/post-canary-continuation-v1/batch-09/standing-authorization.json";
const PRODUCTION_WORKFLOW = "docs/assessment-production-workflow.md";
const READINESS_WORKFLOW = "docs/assessment-workflow-v4.2.21.17.41.md";
const OUTPUT_CONTRACT = "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md";
const PUBLICATION_MANUAL = `${PUBLICATION_ROOT}/manual.md`;
const REFERENCE_CATALOG = `${PUBLICATION_ROOT}/reference-catalog.json`;
const RECOVERY_MANUAL = `${ROOT}/manual.md`;
const CAFFEINATE = "/usr/bin/caffeinate";
const CODEX = "/Applications/ChatGPT.app/Contents/Resources/codex";
const sourceScripts = [
  "scripts/lib/assessment-production-post-canary-batch-09-publication-resumption-timeout-recovery.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-09-publication-resumption-timeout-recovery.mjs",
  "scripts/test-assessment-production-post-canary-batch-09-publication-resumption-timeout-recovery-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-09-publication-resumption-timeout-recovery.mjs",
  "scripts/run-assessment-production-post-canary-batch-09-publication-resumption-timeout-recovery.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-09-publication-resumption-timeout-recovery.mjs",
  "scripts/lib/assessment-production-post-canary-batch-09-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-09-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-09-standing-authorization.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "src/data/references.js"
];

const { record: standing } = await loadAndValidatePostCanaryBatch09StandingAuthorization();
assertV4(standing.authorization.boundedPublicationRepairs && standing.recoveryControls.fieldDisjointShardingPermitted, "standing authorization does not permit sharded recovery");
const [diagnosisBytes, executionBytes, priorActivationBytes] = await Promise.all([
  readFile(path.resolve(DIAGNOSIS)), readFile(path.resolve(EXECUTION)), readFile(path.resolve(RESUMPTION_ACTIVATION))
]);
const diagnosis = JSON.parse(diagnosisBytes);
const failed = diagnosis.failedContexts ?? diagnosis.diagnosedFailedContexts;
assertV4(diagnosis.status === "frozen-diagnosed-one-content-timeout-and-three-host-sleep-interrupted-publication-contexts", "timeout diagnosis changed");
assertV4(Array.isArray(failed) && canonicalJson(failed.map((row) => row.debateNumber)) === canonicalJson(DEBATES), "failed debate boundary changed");
assertV4(failed.every((row) => row.outputWritten === false), "failed partial output unexpectedly exists");
for (const debateNumber of DEBATES) {
  assertV4(!(await exists(`${RESUMPTION_ROOT}/outputs/debate-${debateNumber}.json`)), `failed Debate ${debateNumber} output unexpectedly exists`);
}

const contexts = [];
const generated = [];
for (const debateNumber of DEBATES) {
  const originalPacketPath = `${PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`;
  const publicationPacket = JSON.parse(await readFile(path.resolve(originalPacketPath)));
  for (const side of ["pro", "con"]) {
    const contextIndex = contexts.length;
    const moveIds = publicationPacket.moves.filter((move) => move.side === side).map((move) => move.moveId);
    const includesSummary = side === "pro";
    const writableFields = [
      ...(includesSummary ? ["summary"] : []),
      `representativeQuotes.${side}`,
      ...moveIds.map((moveId) => `moveProse.${moveId}`),
      `overallCommentary.${side}`,
      `aiExtension.${side}`
    ];
    const shardId = side === "pro" ? "shard-01-pro-shared" : "shard-02-con";
    const packet = {
      schemaVersion: POST_CANARY_BATCH_09_PUBLICATION_TIMEOUT_SHARD_PACKET_VERSION,
      protocolId: PROTOCOL_ID,
      contextIndex, shardId, side, productionCanary: false, batchNumber: 9,
      stagingOnly: true, debateNumber, debateId: publicationPacket.debateId,
      recoveryType: "minimum-two-side-field-disjoint-publication-resumption",
      originalPublicationPacketPath: originalPacketPath,
      originalFailedPartialOutputReusable: false,
      participantJudgmentWasScoreBlind: true, publicationIsScoreLocked: true,
      scoresRepositoryOwnedAndImmutable: true, includesSummary, moveIds,
      writableFields, writableFieldCount: writableFields.length,
      allOtherFieldsUnavailableAndImmutable: true, publicationPacket
    };
    const schema = buildPublicationTimeoutRecoveryShardSchema(packet);
    const packetPath = `${ROOT}/packets/context-${contextIndex}.json`;
    const schemaPath = `${ROOT}/schemas/context-${contextIndex}.schema.json`;
    const packetBytes = pretty(packet);
    const schemaBytes = pretty(schema);
    const context = {
      contextIndex, contextType: "field-disjoint-publication-timeout-resumption-shard",
      debateNumber, debateId: packet.debateId, shardId, side, includesSummary,
      packet: packetPath, packetSha256: sha256(packetBytes), packetBytes: packetBytes.length,
      schema: schemaPath, schemaSha256: sha256(schemaBytes), schemaBytes: schemaBytes.length,
      moveIds, writableFields, writableFieldCount: writableFields.length,
      output: `${ROOT}/outputs/context-${contextIndex}.json`,
      validation: `${ROOT}/validations/context-${contextIndex}.json`,
      provenance: `${ROOT}/provenance/context-${contextIndex}.json`
    };
    contexts.push(context);
    generated.push([packetPath, packetBytes], [schemaPath, schemaBytes]);
  }
}
assertV4(contexts.length === 8, "eight recovery contexts required");
for (const debateNumber of DEBATES) {
  const debateContexts = contexts.filter((row) => row.debateNumber === debateNumber);
  const packet = JSON.parse(await readFile(path.resolve(`${PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`)));
  const required = ["summary", "representativeQuotes.pro", "representativeQuotes.con", ...packet.moves.map((move) => `moveProse.${move.moveId}`), "overallCommentary.pro", "overallCommentary.con", "aiExtension.pro", "aiExtension.con"];
  const actual = debateContexts.flatMap((row) => row.writableFields);
  assertV4(actual.length === required.length && new Set(actual).size === required.length && canonicalJson([...actual].sort()) === canonicalJson([...required].sort()), `Debate ${debateNumber}: field partition changed`);
}

const baseSources = [DIAGNOSIS, EXECUTION, RESUMPTION_ACTIVATION, STANDING, PRODUCTION_WORKFLOW, READINESS_WORKFLOW, OUTPUT_CONTRACT, PUBLICATION_MANUAL, REFERENCE_CATALOG, RECOVERY_MANUAL, ...sourceScripts, ...DEBATES.map((n) => `${PUBLICATION_ROOT}/packets/debate-${n}.json`), ...["170", "134", "19", "114", "89", "176"].map((n) => n === "170" ? `${PUBLICATION_ROOT}/repair-1/merged/debate-170.json` : `${RESUMPTION_ROOT}/outputs/debate-${n}.json`)];
const sourceHashes = {};
for (const file of baseSources) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
sourceHashes[CAFFEINATE] = sha256(await readFile(CAFFEINATE));
for (const [file, bytes] of generated) sourceHashes[file] = sha256(bytes);
const futureOutputs = [
  `${ROOT}/execution-activation.json`, `${ROOT}/model-execution.json`, `${ROOT}/analysis.json`, `${ROOT}/cohort-replay.json`,
  ...contexts.flatMap((row) => [row.output, row.validation, row.provenance]),
  ...DEBATES.flatMap((n) => [`${ROOT}/merged/debate-${n}.json`, `${ROOT}/complete-validation-debate-${n}.json`, `${ROOT}/merge-audit-debate-${n}.json`])
];
for (const file of futureOutputs) assertV4(!(await exists(file)), `future output exists: ${file}`);
const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-09-publication-timeout-recovery-preparation",
  protocolId: PROTOCOL_ID,
  status: "frozen-eight-context-batch-09-publication-timeout-recovery-prepared-not-activated",
  frozenAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 9, stagingOnly: true,
  userAuthorization: {
    instruction: "I approve the next section/attempt. Continue as far as you can without needing another approval or confirmation.",
    resolvedScope: "exactly eight minimum field-disjoint score-locked publication resumption shards for Debates 166, 183, 112, and 17",
    thirdFailureStopRuleException: true, directIncrementalCostUsdMaximum: 0
  },
  diagnosis: { path: DIAGNOSIS, sha256: sha256(diagnosisBytes) },
  preservedExecution: { path: EXECUTION, sha256: sha256(executionBytes) },
  preservedResumptionActivation: { path: RESUMPTION_ACTIVATION, sha256: sha256(priorActivationBytes) },
  model: POST_CANARY_BATCH_09_PUBLICATION_MODEL,
  contexts,
  modelInputs: { productionWorkflow: PRODUCTION_WORKFLOW, readinessWorkflow: READINESS_WORKFLOW, outputContract: OUTPUT_CONTRACT, publicationManual: PUBLICATION_MANUAL, referenceCatalog: REFERENCE_CATALOG, recoveryManual: RECOVERY_MANUAL, filesPerContext: ["production-workflow.md", "readiness-workflow.md", "output-contract.md", "publication-manual.md", "reference-catalog.json", "recovery-manual.md", "packet.json", "schema.json"] },
  isolation: { oneDebateSidePerContext: true, freshContextPerShard: true, onlyFrozenInputsAvailable: true, failedPartialOutputsAvailable: false, acceptedCohortOutputsUnavailableToModels: true, participantJudgmentWasScoreBlind: true, publicationScoreLocked: true, legacyAssessmentsUnavailable: true, otherDebatesUnavailable: true, rankingsAndWinnersUnavailable: true },
  recoveryContract: { debates: DEBATES, shardsPerDebate: 2, contexts: 8, minimumShardCount: true, fieldsDisjointWithinDebate: true, everyOriginalContentFieldAcceptedExactlyOnce: true, fixedFieldsReconstructedDeterministically: true, cohortReplayDebates: 10, cohortReplayMoves: 180 },
  executionEnvironment: { codexPath: CODEX, codexCliVersion: execFileSync(CODEX, ["--version"], { encoding: "utf8" }).trim(), authentication: "ChatGPT subscription", APIKeysRemoved: true, isolatedTemporaryCodexHomes: true, isolatedTemporaryWorkingDirectories: true, hostAwakeGuard: { path: CAFFEINATE, sha256: sourceHashes[CAFFEINATE], bytes: (await readFile(CAFFEINATE)).length, args: ["-dimsu"] } },
  executionPolicy: { contexts: 8, attemptsPerContext: 1, retriesMaximum: 0, timeoutMsPerContext: 600000, timeoutExtensionsMaximum: 0, recursiveCorrectionsMaximum: 0, absoluteGateTimeoutMs: 3600000, maximumParallelContexts: 2, schedulerRamp: [1, 2], rampPhases: [{ phase: "operational-one", maximumParallelContexts: 1, contextIndexes: [0], expansionRequiresAllValid: true }, { phase: "ramp-two", maximumParallelContexts: 2, contextIndexes: [1, 2], expansionRequiresAllValid: true }, { phase: "steady-two", maximumParallelContexts: 2, contextIndexes: [3, 4, 5, 6, 7], expansionRequiresAllValid: false }], stopBeforeExpansionOnRampFailure: true, removedEnvironmentVariables: ["OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID", "OPENAI_BASE_URL", "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"], directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0, separateActivationRequired: true },
  stopRules: { sourceHashMismatchBlocks: true, packetOrSchemaHashMismatchBlocks: true, nonSubscriptionAuthenticationBlocks: true, apiKeyVisibilityBlocks: true, nonIsolatedContextBlocks: true, failedPartialOutputReuseBlocks: true, modelAuthoredScoreBlocks: true, invalidOutputBlocks: true, timeoutBlocks: true, automaticRetryBlocks: true, timeoutExtensionBlocks: true, recursiveCorrectionBlocks: true, paidServiceBlocks: true, productionMutationBlocks: true, nextBatchSelectionBlocks: true },
  sourceHashes, futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  artifacts: { activation: `${ROOT}/execution-activation.json`, execution: `${ROOT}/model-execution.json`, analysis: `${ROOT}/analysis.json`, cohortReplay: `${ROOT}/cohort-replay.json`, merged: Object.fromEntries(DEBATES.map((n) => [n, `${ROOT}/merged/debate-${n}.json`])) },
  nextAuthorizedAction: "validate-freeze-commit-push-then-activate-exactly-eight-recovery-contexts"
};
if (shouldWrite) {
  await mkdir(path.resolve(`${ROOT}/packets`), { recursive: true });
  await mkdir(path.resolve(`${ROOT}/schemas`), { recursive: true });
  for (const [file, bytes] of generated) await writeFile(path.resolve(file), bytes);
  await writeFile(path.resolve(MANIFEST), pretty(manifest));
}
console.log(JSON.stringify({ status: manifest.status, contexts: 8, debates: DEBATES, shardsPerDebate: 2, model: manifest.model, hostAwakeGuard: manifest.executionEnvironment.hostAwakeGuard, directIncrementalCostUsdMaximum: 0, nextAuthorizedAction: manifest.nextAuthorizedAction }, null, 2));
