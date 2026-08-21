#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { POST_CANARY_BATCH_03_PUBLICATION_MODEL } from "./lib/assessment-production-post-canary-batch-03-publication.mjs";
import {
  DEBATE_157_CORRECTION_2_FIELDS,
  DEBATE_157_CORRECTION_2_PACKET_VERSION,
  DEBATE_157_CORRECTION_2_PROTOCOL_ID,
  DEBATE_157_CORRECTION_2_ROOT,
  buildDebate157Correction2Schema
} from "./lib/assessment-production-post-canary-batch-03-publication-resumption-2-repair-correction-2.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");

const ROOT = DEBATE_157_CORRECTION_2_ROOT;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const DIAGNOSIS = `${ROOT}/failure-diagnosis.json`;
const PACKET = `${ROOT}/packet.json`;
const SCHEMA = `${ROOT}/schema.json`;
const MANUAL = `${ROOT}/manual.md`;
const OUTPUT = `${ROOT}/output.json`;
const VALIDATION = `${ROOT}/validation.json`;
const PROVENANCE = `${ROOT}/provenance.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const ORIGINAL_OUTPUT = "docs/assessment-production/post-canary-continuation-v1/batch-03/publication-reconstruction/resumption-2/outputs/debate-157.json";
const ORIGINAL_PACKET = "docs/assessment-production/post-canary-continuation-v1/batch-03/publication-reconstruction/packets/debate-157.json";
const FAILED_OUTPUT = "docs/assessment-production/post-canary-continuation-v1/batch-03/publication-reconstruction/resumption-2/repair-1/outputs/packet-0.json";
const WORKFLOW = "docs/assessment-production-workflow.md";
const READINESS = "docs/assessment-workflow-v4.2.21.17.41.md";
const OUTPUT_CONTRACT = "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md";
const STANDING_AUTHORIZATION = "docs/assessment-production/post-canary-continuation-v1/batch-03/standing-authorization.json";
const RECOVERY_AUTHORIZATION = "docs/assessment-production/post-canary-continuation-v1/batch-03/failure-recovery-standing-authorization.json";
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const REMOVED_API_ENVIRONMENT_VARIABLES = [
  "OPENAI_API_KEY",
  "OPENAI_ORG_ID",
  "OPENAI_PROJECT_ID",
  "OPENAI_BASE_URL",
  "AZURE_OPENAI_API_KEY",
  "CODEX_API_KEY"
];
const SOURCE_FILES = [
  DIAGNOSIS,
  ORIGINAL_OUTPUT,
  ORIGINAL_PACKET,
  FAILED_OUTPUT,
  WORKFLOW,
  READINESS,
  OUTPUT_CONTRACT,
  STANDING_AUTHORIZATION,
  RECOVERY_AUTHORIZATION,
  MANUAL,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-03-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-03-publication-resumption-2-repair.mjs",
  "scripts/lib/assessment-production-post-canary-batch-03-publication-resumption-2-repair-correction-2.mjs",
  "scripts/diagnose-assessment-production-post-canary-batch-03-publication-resumption-2-repair-correction-2.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-03-publication-resumption-2-repair-correction-2.mjs",
  "scripts/test-assessment-production-post-canary-batch-03-publication-resumption-2-repair-correction-2-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-03-publication-resumption-2-repair-correction-2.mjs",
  "scripts/run-assessment-production-post-canary-batch-03-publication-resumption-2-repair-correction-2.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-03-publication-resumption-2-repair-correction-2.mjs"
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const moveIdFor = (field) => {
  const match = /^moveProse\.([^.]+)\.critique$/.exec(field);
  assertV4(match, `${field}: invalid correction field`);
  return match[1];
};

const bytesByFile = Object.fromEntries(
  await Promise.all(SOURCE_FILES.map(async (file) => [file, await readFile(path.resolve(file))]))
);
const diagnosis = JSON.parse(bytesByFile[DIAGNOSIS]);
const originalOutput = JSON.parse(bytesByFile[ORIGINAL_OUTPUT]);
const publicationPacket = JSON.parse(bytesByFile[ORIGINAL_PACKET]);
const failedOutput = JSON.parse(bytesByFile[FAILED_OUTPUT]);
assertV4(
  diagnosis.status === "diagnosed-preserved-debate-157-repair-packet-0-one-word-boundary-failure" &&
    diagnosis.checkpointCommit === "b2b244b3d13c3f20e62ed520e0909430ca7c8dfd" &&
    diagnosis.userAuthorization?.oneTimeRecursiveRecoveryException === true &&
    canonicalJson(diagnosis.replacementBoundary?.writableFields) === canonicalJson(DEBATE_157_CORRECTION_2_FIELDS) &&
    diagnosis.substantiveInputBoundary?.failedRepairOutputMayBeUsedAsSubstantiveModelInput === false,
  "the frozen correction-2 diagnosis changed"
);
assertV4(
  originalOutput.debateNumber === "157" &&
    originalPacketIdentity(publicationPacket, originalOutput),
  "the original Debate 157 publication sources changed"
);

function originalPacketIdentity(packet, output) {
  return packet.debateNumber === output.debateNumber && packet.debateId === output.debateId;
}

const corrections = DEBATE_157_CORRECTION_2_FIELDS.map((field) => {
  const moveId = moveIdFor(field);
  const originalCritique = originalOutput.moveProse?.[moveId]?.critique;
  const lockedMove = publicationPacket.moves.find((move) => move.moveId === moveId);
  assertV4(originalCritique && lockedMove, `${field}: original substantive input missing`);
  return { field, moveId, originalCritique, lockedMove };
});
const packet = {
  schemaVersion: DEBATE_157_CORRECTION_2_PACKET_VERSION,
  protocolId: DEBATE_157_CORRECTION_2_PROTOCOL_ID,
  correctionId: "correction-2",
  productionCanary: false,
  batchNumber: 3,
  stagingOnly: true,
  debateNumber: "157",
  debateId: publicationPacket.debateId,
  repairType: "critique-word-boundary",
  substantiveInputSources: {
    originalPublicationOutput: ORIGINAL_OUTPUT,
    originalPublicationPacket: ORIGINAL_PACKET
  },
  participantJudgmentWasScoreBlind: true,
  scoresRepositoryOwnedAndImmutable: true,
  constraints: {
    writableFields: DEBATE_157_CORRECTION_2_FIELDS,
    generationTargetWords: [112, 118],
    acceptanceWords: [105, 130],
    preferredMinimumCharacters: 900,
    acceptanceMinimumCharacters: 880,
    exactSentenceCount: 4,
    orderedLabels: ["Strongest feature:", "Principal limitation:", "Live burden:", "Locked score:"],
    terminalPunctuation: true,
    preserveAdjudicatedSubstanceAndLockedScoreBand: true,
    scoresUnavailableAsOutputFields: true,
    failedRepairOutputUnavailableAndUnaccepted: true
  },
  corrections
};
const schema = buildDebate157Correction2Schema(packet);
const packetBytes = pretty(packet);
const schemaBytes = pretty(schema);
const failedStrings = Object.values(failedOutput.correctedCritiques ?? {});
assertV4(
  failedStrings.every((text) => !packetBytes.includes(Buffer.from(text))),
  "the replacement packet contains a failed repair response string"
);
assertV4(
  !packetBytes.includes(Buffer.from(FAILED_OUTPUT)),
  "the replacement packet names the failed repair output"
);

const generated = [[PACKET, packetBytes], [SCHEMA, schemaBytes]];
const context = {
  contextIndex: 0,
  correctionId: "correction-2",
  debateNumber: "157",
  debateId: publicationPacket.debateId,
  packet: PACKET,
  packetSha256: sha256(packetBytes),
  schema: SCHEMA,
  schemaSha256: sha256(schemaBytes),
  writableFields: DEBATE_157_CORRECTION_2_FIELDS,
  writableFieldCount: 2,
  packetBytes: packetBytes.length,
  schemaBytes: schemaBytes.length,
  copiedInputBytes:
    bytesByFile[WORKFLOW].length +
    bytesByFile[READINESS].length +
    bytesByFile[OUTPUT_CONTRACT].length +
    bytesByFile[MANUAL].length +
    packetBytes.length +
    schemaBytes.length,
  output: OUTPUT,
  validation: VALIDATION,
  provenance: PROVENANCE
};
const sourceHashes = Object.fromEntries(
  [...new Set(SOURCE_FILES)].sort().map((file) => [file, sha256(bytesByFile[file])])
);
sourceHashes[PACKET] = context.packetSha256;
sourceHashes[SCHEMA] = context.schemaSha256;
const validatorPath = "scripts/lib/assessment-production-post-canary-batch-03-publication-resumption-2-repair-correction-2.mjs";
const futureOutputs = [ACTIVATION, EXECUTION, OUTPUT, VALIDATION, PROVENANCE, ANALYSIS];
for (const file of [MANIFEST, ...generated.map(([name]) => name), ...futureOutputs]) {
  assertV4(!(await exists(file)), `${file} already exists`);
}

const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-157-publication-repair-correction-2-execution-preparation-manifest",
  protocolId: DEBATE_157_CORRECTION_2_PROTOCOL_ID,
  status: "frozen-one-context-two-field-debate-157-publication-repair-correction-2-prepared",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false,
  batchNumber: 3,
  stagingOnly: true,
  userAuthorization: {
    instruction: diagnosis.userAuthorization.instruction,
    oneTimeRecursiveRecoveryException: true,
    directIncrementalCostUsdMaximum: 0,
    contextsPrepared: 1,
    writableFieldsPrepared: 2,
    modelExecution: false,
    paidServices: false
  },
  model: structuredClone(POST_CANARY_BATCH_03_PUBLICATION_MODEL),
  costEstimate: {
    authentication: "ChatGPT subscription",
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    contexts: 1,
    expectedWallMinutes: [1, 8],
    timeoutMinutes: 8
  },
  executionEnvironment: {
    codexPath: CODEX_PATH,
    codexCliVersion: execFileSync(CODEX_PATH, ["--version"], { encoding: "utf8" }).trim(),
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    isolatedTemporaryCodexHome: true,
    isolatedTemporaryWorkingDirectory: true
  },
  inputs: {
    diagnosis: DIAGNOSIS,
    originalPublicationOutput: ORIGINAL_OUTPUT,
    originalPublicationPacket: ORIGINAL_PACKET,
    failedRepairOutputForDeterministicExclusionCheckOnly: FAILED_OUTPUT,
    standingAuthorization: STANDING_AUTHORIZATION,
    failureRecoveryStandingAuthorization: RECOVERY_AUTHORIZATION
  },
  modelInputs: {
    productionWorkflow: WORKFLOW,
    readinessWorkflow: READINESS,
    outputContract: OUTPUT_CONTRACT,
    manual: MANUAL,
    filesPerContext: [
      "production-workflow.md",
      "readiness-workflow.md",
      "output-contract.md",
      "correction-manual.md",
      "packet.json",
      "schema.json"
    ],
    failedRepairOutputUnavailable: true,
    failureDiagnosisUnavailable: true
  },
  sourceHashes,
  context,
  hashLocks: {
    diagnosis: { path: DIAGNOSIS, sha256: sourceHashes[DIAGNOSIS] },
    replacementPacket: { path: PACKET, sha256: context.packetSha256 },
    responseSchema: { path: SCHEMA, sha256: context.schemaSha256 },
    validator: { path: validatorPath, sha256: sourceHashes[validatorPath] },
    mergeRule: { path: validatorPath, sha256: sourceHashes[validatorPath], export: "mergeAcceptedDebate157CorrectionAndRepairs" }
  },
  isolation: {
    oneFreshContext: true,
    onlyFrozenModelInputsAvailable: true,
    originalPublicationOutputAndPacketAreOnlySubstantiveInputs: true,
    failedRepairOutputUnavailable: true,
    failedRepairOutputNotAccepted: true,
    participantJudgmentClosedAndScoreBlind: true,
    scoresImmutable: true,
    otherRepairPacketsUnavailable: true,
    otherDebatesUnavailable: true,
    legacyAssessmentsUnavailable: true
  },
  executionPolicy: {
    contexts: 1,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    recursiveRecoveryContextsMaximum: 1,
    timeoutMsPerContext: 480000,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    removedEnvironmentVariables: REMOVED_API_ENVIRONMENT_VARIABLES,
    directIncrementalCostUsdMaximum: 0,
    separateActivationRequired: true
  },
  deterministicValidation: {
    diagnosisAuthenticated: true,
    packetDerivedOnlyFromOriginalPublicationOutputAndPacket: true,
    failedRepairResponseStringsExcludedFromPacket: true,
    exactTwoFieldSetRequired: true,
    completeDebateValidationRequiredAfterLaterSixteenFieldMerge: true,
    modelAuthoredScores: 0
  },
  stopRules: {
    sourceHashMismatchBlocks: true,
    packetOrSchemaHashMismatchBlocks: true,
    preexistingFutureOutputBlocks: true,
    nonSubscriptionAuthenticationBlocks: true,
    apiKeyVisibilityBlocks: true,
    nonIsolatedContextBlocks: true,
    failedRepairOutputVisibilityBlocks: true,
    fieldSetExpansionBlocks: true,
    protectedFieldMutationBlocks: true,
    invalidOutputBlocks: true,
    timeoutBlocks: true,
    retryBlocks: true,
    timeoutExtensionBlocks: true,
    paidServiceBlocks: true,
    productionManifestMismatchBlocks: true,
    batch4SelectionBlocks: true
  },
  authorization: {
    executionActivationPreparation: true,
    correctionModelExecution: false,
    deterministicValidation: false,
    retry: false,
    timeoutExtension: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  artifacts: { activation: ACTIVATION, execution: EXECUTION, output: OUTPUT, validation: VALIDATION, provenance: PROVENANCE, analysis: ANALYSIS },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  totals: { debates: 1, contexts: 1, writableFields: 2, modelContextsExecuted: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0 },
  nextAuthorizedAction: "activate-and-execute-the-one-frozen-debate-157-correction-2-context-once"
};

if (shouldWrite) {
  for (const [file, bytes] of generated) {
    await mkdir(path.dirname(path.resolve(file)), { recursive: true });
    await writeFile(path.resolve(file), bytes);
  }
  await writeFile(path.resolve(MANIFEST), pretty(manifest));
}

console.log(JSON.stringify({
  status: shouldWrite ? manifest.status : "validated-preview",
  contexts: 1,
  writableFields: DEBATE_157_CORRECTION_2_FIELDS,
  failedRepairOutputAvailableToModel: false,
  model: manifest.model,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: manifest.nextAuthorizedAction
}, null, 2));
