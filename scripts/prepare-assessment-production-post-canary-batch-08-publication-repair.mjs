#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildBatch08PublicationRepairSchema,
  mergeAndValidateBatch08PublicationRepairs,
  POST_CANARY_BATCH_08_PUBLICATION_REPAIR_OUTPUT_VERSION,
  POST_CANARY_BATCH_08_PUBLICATION_REPAIR_PACKET_VERSION,
  POST_CANARY_BATCH_08_PUBLICATION_REPAIR_PROTOCOL_ID,
  POST_CANARY_BATCH_08_PUBLICATION_REPAIR_ROOT,
  validateBatch08PublicationRepairOutput
} from "./lib/assessment-production-post-canary-batch-08-publication-repair.mjs";
import {
  POST_CANARY_BATCH_08_PUBLICATION_MODEL,
  POST_CANARY_BATCH_08_PUBLICATION_ROOT
} from "./lib/assessment-production-post-canary-batch-08-publication.mjs";
import {
  POST_CANARY_BATCH_08_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch08StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-08-standing-authorization.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires ISO");

const ROOT = POST_CANARY_BATCH_08_PUBLICATION_REPAIR_ROOT;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const DIAGNOSIS = `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/failure-diagnosis.json`;
const PRODUCTION_WORKFLOW = "docs/assessment-production-workflow.md";
const READINESS_WORKFLOW = "docs/assessment-workflow-v4.2.21.17.41.md";
const OUTPUT_CONTRACT =
  "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md";
const MANUAL = `${ROOT}/manual.md`;
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const REMOVED = ["OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID",
  "OPENAI_BASE_URL", "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"];
const REJECTED = ["88"];
const ACCEPTED = [];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

const STATIC = [DIAGNOSIS, PRODUCTION_WORKFLOW, READINESS_WORKFLOW, OUTPUT_CONTRACT,
  MANUAL, POST_CANARY_BATCH_08_STANDING_AUTHORIZATION,
  `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/execution-preparation-manifest.json`,
  `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/execution-activation.json`,
  `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/model-execution.json`,
  `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/analysis.json`,
  "scripts/lib/v4-lean-production.mjs", "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-08-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-08-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-08-publication-repair.mjs",
  "scripts/lib/assessment-production-post-canary-batch-08-standing-authorization.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-08-publication-repair.mjs",
  "scripts/test-assessment-production-post-canary-batch-08-publication-repair-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-08-publication-repair.mjs",
  "scripts/run-assessment-production-post-canary-batch-08-publication-repair.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-08-publication-repair.mjs"];
for (const debateNumber of [...REJECTED, ...ACCEPTED]) {
  STATIC.push(`${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/outputs/debate-${debateNumber}.json`,
    `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`);
}

assertV4(!(await exists(MANIFEST)), `${MANIFEST} already exists`);
const diagnosisBytes = await readFile(path.resolve(DIAGNOSIS));
const diagnosis = JSON.parse(diagnosisBytes);
const standing = await loadAndValidatePostCanaryBatch08StandingAuthorization();
assertV4(
  diagnosis.status === "frozen-diagnosed-batch-08-debate-88-two-field-publication-validation-failure" &&
    diagnosis.failedFields?.length === 2 &&
    diagnosis.failedFields.filter((field) => field.type === "critique-word-boundary").length === 0 &&
    diagnosis.failedFields.filter((field) => field.type === "representative-quote-exact-source-substring").length === 2 &&
    diagnosis.minimumBoundedRepair?.packetCount === 1 &&
    diagnosis.diagnosticReplay?.fullOutputValidationStatus === "passed" &&
    standing.record.authorization?.boundedPublicationRepairs === true,
  "the frozen Batch 8 publication diagnosis or standing authorization changed"
);
for (const [file, digest] of Object.entries(diagnosis.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `${file}: diagnosed source drifted`);

const baseOutputs = Object.fromEntries(await Promise.all(REJECTED.map(async (debateNumber) =>
  [debateNumber, JSON.parse(await readFile(path.resolve(
    `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/outputs/debate-${debateNumber}.json`), "utf8"))])));
const publicationPackets = Object.fromEntries(await Promise.all(REJECTED.map(async (debateNumber) =>
  [debateNumber, JSON.parse(await readFile(path.resolve(
    `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`), "utf8"))])));
const diagnosedByPath = new Map(
  diagnosis.failedFields.map((field) => [`88:${field.path}`, field])
);
const plannedContexts = [{
  contextIndex: 0,
  packetId: "debate-88-repair-0",
  debateNumber: "88",
  writableFields: diagnosis.minimumBoundedRepair.writableFields
}];

const contexts = [];
const generated = [];
const packets = [];
const syntheticOutputs = [];
const inputStaticBytes = (await Promise.all([PRODUCTION_WORKFLOW, READINESS_WORKFLOW,
  OUTPUT_CONTRACT, MANUAL].map((file) => readFile(path.resolve(file)))))
  .reduce((sum, value) => sum + value.length, 0);

for (const planned of plannedContexts) {
  const { contextIndex, packetId, debateNumber, writableFields } = planned;
  const baseOutput = baseOutputs[debateNumber];
  const publicationPacket = publicationPackets[debateNumber];
  const moveById = new Map(publicationPacket.moves.map((move) => [move.moveId, move]));
  const corrections = writableFields.map((field) => {
    const diagnosed = diagnosedByPath.get(`${debateNumber}:${field}`);
    assertV4(diagnosed, `${debateNumber}/${field}: diagnosis missing`);
    if (diagnosed.type === "critique-word-boundary") {
      const originalValue = baseOutput.moveProse[diagnosed.moveId].critique;
      const lockedMove = moveById.get(diagnosed.moveId);
      assertV4(lockedMove && wordCount(originalValue) === diagnosed.words,
        `${debateNumber}/${field}: critique repair source changed`);
      return { field, type: diagnosed.type, moveId: diagnosed.moveId,
        originalValue, originalValueSha256: sha256(Buffer.from(originalValue)), lockedMove };
    }
    const originalValue = baseOutput.representativeQuotes[diagnosed.side].text;
    const lockedMove = moveById.get(diagnosed.sourceMoveId);
    assertV4(lockedMove && originalValue === diagnosed.originalText &&
      !lockedMove.sourceExcerpt.includes(originalValue),
    `${debateNumber}/${field}: quote repair source changed`);
    return { field, type: diagnosed.type, side: diagnosed.side,
      sourceMoveId: diagnosed.sourceMoveId, originalValue,
      originalValueSha256: sha256(Buffer.from(originalValue)), lockedMove };
  });
  const basePath = `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/outputs/debate-${debateNumber}.json`;
  const publicationPacketPath = `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`;
  const packet = { schemaVersion: POST_CANARY_BATCH_08_PUBLICATION_REPAIR_PACKET_VERSION,
    protocolId: POST_CANARY_BATCH_08_PUBLICATION_REPAIR_PROTOCOL_ID,
    contextIndex, packetId, productionCanary: false, batchNumber: 8, stagingOnly: true,
    debateNumber, debateId: publicationPacket.debateId,
    repairType: "bounded-score-locked-field-level-publication-repair",
    sourceControl: { immutableRejectedOutput: basePath,
      immutableRejectedOutputSha256: sha256(await readFile(path.resolve(basePath))),
      publicationPacket: publicationPacketPath,
      publicationPacketSha256: sha256(await readFile(path.resolve(publicationPacketPath))) },
    participantJudgmentWasScoreBlind: true, publicationIsScoreLocked: true,
    scoresRepositoryOwnedAndImmutable: true,
    constraints: { writableFields, writableFieldCount: writableFields.length,
      maximumWritableFields: 2, allOtherPublicationFieldsImmutable: true,
      scoreFieldsUnavailableAsOutputs: true, attemptsMaximum: 1, retriesMaximum: 0,
      timeoutExtensionsMaximum: 0, recursiveRepairsMaximum: 1,
      critique: { labels: ["Strongest feature:", "Principal limitation:",
        "Live burden:", "Locked score:"], generationTargetWords: [112, 118],
        acceptanceWords: [105, 130], acceptanceMinimumCharacters: 880,
        exactSentenceCount: 4, terminalPunctuationRequired: true },
      quote: { exactContiguousSourceSubstringRequired: true, acceptanceWords: [3, 18] } },
    corrections };
  const schema = buildBatch08PublicationRepairSchema(packet);
  const packetPath = `${ROOT}/packets/${packetId}.json`;
  const schemaPath = `${ROOT}/schemas/${packetId}.schema.json`;
  const packetBytes = pretty(packet);
  const schemaBytes = pretty(schema);
  const output = `${ROOT}/outputs/${packetId}.json`;
  const validation = `${ROOT}/validations/${packetId}.json`;
  const provenance = `${ROOT}/provenance/${packetId}.json`;
  contexts.push({ contextIndex, packetId, debateNumber, debateId: packet.debateId,
    packet: packetPath, packetSha256: sha256(packetBytes), schema: schemaPath,
    schemaSha256: sha256(schemaBytes), writableFields, writableFieldCount: writableFields.length,
    packetBytes: packetBytes.length, schemaBytes: schemaBytes.length,
    copiedInputBytes: inputStaticBytes + packetBytes.length + schemaBytes.length,
    output, validation, provenance });
  generated.push([packetPath, packetBytes], [schemaPath, schemaBytes]);
  packets.push(packet);

  const correctedFields = corrections.map((correction) => {
    let value;
    if (correction.type === "critique-word-boundary") {
      const sentences = correction.originalValue.split(/(?<=[.!?])\s+/).filter(Boolean);
      while (wordCount(sentences.join(" ")) > 130) {
        const words = sentences[1].split(/\s+/);
        words.splice(words.length - 2, 1);
        sentences[1] = words.join(" ");
      }
      value = sentences.join(" ");
    } else value = correction.lockedMove.sourceExcerpt.split(/\s+/).slice(0, 8).join(" ");
    return { path: correction.field, value };
  });
  const synthetic = { schemaVersion: POST_CANARY_BATCH_08_PUBLICATION_REPAIR_OUTPUT_VERSION,
    protocolId: POST_CANARY_BATCH_08_PUBLICATION_REPAIR_PROTOCOL_ID,
    contextIndex, packetId, debateNumber, debateId: packet.debateId,
    assessmentModel: POST_CANARY_BATCH_08_PUBLICATION_MODEL.label,
    completedAt: frozenAt, correctedFields };
  validateBatch08PublicationRepairOutput(synthetic, packet);
  syntheticOutputs.push(synthetic);
}

assertV4(contexts.length === 1 && contexts.every((row) => row.writableFieldCount === 2 &&
  row.copiedInputBytes <= 400000) &&
  new Set(contexts.flatMap((row) => row.writableFields)).size === 2,
"the one-context repair preparation boundary changed");
for (const debateNumber of REJECTED) {
  const indexes = contexts.filter((row) => row.debateNumber === debateNumber).map((row) => row.contextIndex);
  const merge = mergeAndValidateBatch08PublicationRepairs({ baseOutput: baseOutputs[debateNumber],
    repairOutputs: indexes.map((index) => syntheticOutputs[index]),
    repairPackets: indexes.map((index) => packets[index]),
    publicationPacket: publicationPackets[debateNumber] });
  assertV4(merge.fullValidation.status === "passed", `${debateNumber}: synthetic repair replay failed`);
}

const artifacts = { execution: `${ROOT}/model-execution.json`, analysis: `${ROOT}/analysis.json`,
  mergedRoot: `${ROOT}/merged`, completeValidation: `${ROOT}/complete-debate-validation.json`,
  mergeAudit: `${ROOT}/merge-audit.json`, cohortReplay: `${ROOT}/ten-debate-cohort-replay.json` };
const futureOutputPathsExcludedFromSourceHashes = [
  `${ROOT}/execution-activation.json`, artifacts.execution, artifacts.analysis,
  artifacts.completeValidation, artifacts.mergeAudit, artifacts.cohortReplay,
  ...contexts.flatMap((row) => [row.output, row.validation, row.provenance]),
  ...REJECTED.map((debateNumber) => `${artifacts.mergedRoot}/debate-${debateNumber}.json`)
];
for (const file of [MANIFEST, ...generated.map(([file]) => file),
  ...futureOutputPathsExcludedFromSourceHashes]) assertV4(!(await exists(file)), `${file} already exists`);

const sourceHashes = {};
for (const file of [...new Set(STATIC)].sort()) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
for (const context of contexts) {
  sourceHashes[context.packet] = context.packetSha256;
  sourceHashes[context.schema] = context.schemaSha256;
}
const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-08-publication-repair-preparation",
  protocolId: POST_CANARY_BATCH_08_PUBLICATION_REPAIR_PROTOCOL_ID,
  status: "frozen-one-context-batch-08-publication-repair-prepared-not-activated",
  frozenAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 8, stagingOnly: true, AIOnly: true,
  userAuthorization: { source: POST_CANARY_BATCH_08_STANDING_AUTHORIZATION,
    sourceSha256: standing.sha256, directIncrementalCostUsdMaximum: 0 },
  diagnosis: { path: DIAGNOSIS, sha256: sha256(diagnosisBytes), failedFields: 2,
    failedCritiques: 0, failedQuotes: 2, rejectedDebates: REJECTED },
  model: POST_CANARY_BATCH_08_PUBLICATION_MODEL,
  contexts,
  modelInputs: { productionWorkflow: PRODUCTION_WORKFLOW, readinessWorkflow: READINESS_WORKFLOW,
    outputContract: OUTPUT_CONTRACT, manual: MANUAL,
    filesPerContext: ["production-workflow.md", "readiness-workflow.md",
      "output-contract.md", "manual.md", "packet.json", "schema.json"] },
  repairContract: { rejectedOutputsAreImmutableBases: true, acceptedOutputsImmutable: true,
    writableFields: 2, writableFieldsMaximumPerPacket: 2, fieldDisjoint: true,
    eachOriginalFieldAcceptedExactlyOnce: true, scoresImmutable: true,
    sourcesImmutable: true, identitiesImmutable: true, allUnlistedFieldsImmutable: true,
    completeOneDebateValidationRequired: true,
    completeTenDebateCohortReplayRequiredAfterNineContextResumption: true },
  isolation: { freshTemporaryWorkingDirectoryPerContext: true,
    freshTemporaryCodexHomePerContext: true, onlyFrozenInputsCopied: true,
    oneDebatePerContext: true, otherDebateOutputsUnavailable: true,
    legacyAssessmentsUnavailable: true, rankingAndWinnerComparisonsUnavailable: true,
    scoreFieldsUnavailableAsOutputs: true },
  executionEnvironment: { codexPath: CODEX_PATH,
    codexCliVersion: execFileSync(CODEX_PATH, ["--version"], { encoding: "utf8" }).trim(),
    authentication: "ChatGPT subscription", APIKeysRemoved: true,
    isolatedTemporaryCodexHomes: true, isolatedTemporaryWorkingDirectories: true },
  executionPolicy: { contexts: 1, attemptsPerContext: 1, retriesMaximum: 0,
    timeoutMsPerContext: 600000, timeoutExtensionsMaximum: 0,
    maximumParallelContexts: 1, schedulerRamp: [1],
    rampPhases: [
      { phase: "operational-canary-one", maximumParallelContexts: 1,
        contextIndexes: [0], expansionRequiresAllValid: true }
    ], firstRealContextOperationalCanary: true, stopBeforeExpansionOnRampFailure: true,
    continueIndependentContextsWithinStartedSteadyPhaseAfterFailure: true,
    deterministicInputOrder: true, authentication: "ChatGPT subscription",
    APIKeysRemoved: true, removedEnvironmentVariables: REMOVED,
    directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0,
    paidServiceCallsMaximum: 0, separateActivationRequired: true },
  stopRules: { sourceHashMismatchBlocks: true, packetOrSchemaHashMismatchBlocks: true,
    preexistingFutureOutputBlocks: true, separateActivationRequired: true,
    nonSubscriptionAuthenticationBlocks: true, apiKeyVisibilityBlocks: true,
    legacyOrOtherDebateVisibilityBlocks: true, writableFieldExpansionBlocks: true,
    modelAuthoredScoreBlocks: true, invalidOutputBlocksAtFrozenRampBoundary: true,
    timeoutBlocksAtFrozenRampBoundary: true, automaticRetryBlocks: true,
    timeoutExtensionBlocks: true, ordinaryRetryBlocks: true, paidServiceBlocks: true,
    productionMutationBlocks: true, nextBatchSelectionBlocks: true },
  sourceHashes, futureOutputPathsExcludedFromSourceHashes, artifacts,
  authorization: { repairModelExecution: false, deterministicOutputValidation: false,
    deterministicMergeAndCohortReplay: false, publicationCompilation: false,
    paidServices: false, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: "activate-exactly-one-frozen-batch-08-two-field-publication-repair-context"
};

if (shouldWrite) {
  for (const [file, value] of generated) {
    await mkdir(path.dirname(path.resolve(file)), { recursive: true });
    await writeFile(path.resolve(file), value);
  }
  await writeFile(path.resolve(MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({ status: manifest.status, contextsPrepared: 1,
  writableFields: 2, maximumWritableFieldsPerPacket: 2,
  maximumCopiedInputBytes: Math.max(...contexts.map((row) => row.copiedInputBytes)),
  syntheticCompleteDebateReplaysPassed: 1, model: manifest.model,
  schedulerRamp: [1], attemptsPerContext: 1, retriesMaximum: 0,
  directIncrementalCostUsdMaximum: 0, nextAuthorizedAction: manifest.nextAuthorizedAction }, null, 2));
