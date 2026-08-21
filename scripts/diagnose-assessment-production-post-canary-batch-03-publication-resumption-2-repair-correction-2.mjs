#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { wordCount } from "./lib/v388-reconstruction.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");

const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-03/publication-reconstruction/resumption-2/repair-1";
const CORRECTION_ROOT = `${ROOT}/correction-2`;
const DIAGNOSIS = `${CORRECTION_ROOT}/failure-diagnosis.json`;
const ORIGINAL_OUTPUT = "docs/assessment-production/post-canary-continuation-v1/batch-03/publication-reconstruction/resumption-2/outputs/debate-157.json";
const ORIGINAL_PACKET = "docs/assessment-production/post-canary-continuation-v1/batch-03/publication-reconstruction/packets/debate-157.json";
const FAILED_REPAIR_PACKET = `${ROOT}/packets/packet-0.json`;
const FAILED_REPAIR_OUTPUT = `${ROOT}/outputs/packet-0.json`;
const FAILED_VALIDATION = `${ROOT}/validations/packet-0.json`;
const FAILED_PROVENANCE = `${ROOT}/provenance/packet-0.json`;
const FAILED_EXECUTION = `${ROOT}/model-execution.json`;
const FAILED_ANALYSIS = `${ROOT}/analysis.json`;
const FAILED_PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const FAILED_ACTIVATION = `${ROOT}/execution-activation.json`;
const VALIDATOR = "scripts/lib/assessment-production-post-canary-batch-03-publication-resumption-2-repair.mjs";
const USER_AUTHORIZATION =
  "I approve deterministic diagnosis of the preserved Debate 157 repair packet-0 failure and one replacement correction-2 context covering only its same two original critique fields. This is a one-time exception permitting one recursive recovery attempt. Use the original Debate 157 publication output and packet as substantive inputs; do not reuse the failed repair output as accepted content. Hash-lock the diagnosis, replacement packet, schema, validator, and merge rule before execution. Use 5.6 Sol with low reasoning through my ChatGPT subscription, one attempt, no retry or timeout extension, and a direct incremental cost cap of $0. If correction-2 passes, resume exactly the seven unattempted frozen Debate 157 repair contexts, merge the sixteen accepted fields, validate Debate 157, replay the five-debate accepted cohort, and resume the five unattempted Batch 3 publication contexts and remaining standing-authorized workflow. Commit and push successful checkpoints. Stop on any further failed repair or model output, paid service, protected-field change, retry, rollback, production-manifest mismatch, or Batch 4 selection.";

const sourceFiles = [
  ORIGINAL_OUTPUT,
  ORIGINAL_PACKET,
  FAILED_REPAIR_PACKET,
  FAILED_REPAIR_OUTPUT,
  FAILED_VALIDATION,
  FAILED_PROVENANCE,
  FAILED_EXECUTION,
  FAILED_ANALYSIS,
  FAILED_PREPARATION,
  FAILED_ACTIVATION,
  VALIDATOR
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytesByFile = Object.fromEntries(
  await Promise.all(sourceFiles.map(async (file) => [file, await readFile(path.resolve(file))]))
);
const parsed = (file) => JSON.parse(bytesByFile[file]);
const originalOutput = parsed(ORIGINAL_OUTPUT);
const originalPacket = parsed(ORIGINAL_PACKET);
const failedPacket = parsed(FAILED_REPAIR_PACKET);
const failedOutput = parsed(FAILED_REPAIR_OUTPUT);
const failedValidation = parsed(FAILED_VALIDATION);
const failedExecution = parsed(FAILED_EXECUTION);
const failedAnalysis = parsed(FAILED_ANALYSIS);

const expectedFields = [
  "moveProse.pro-brute-cause-insufficient.critique",
  "moveProse.pro-logical-moments-trinity.critique"
];
assertV4(
  canonicalJson(failedPacket.constraints?.writableFields) === canonicalJson(expectedFields),
  "the failed packet writable-field boundary changed"
);
assertV4(
  failedExecution.contextsPlanned === 8 &&
    failedExecution.contextsAttempted === 1 &&
    failedExecution.contextsUnattempted === 7 &&
    canonicalJson(failedExecution.unattemptedContextIndexes) === canonicalJson([1, 2, 3, 4, 5, 6, 7]) &&
    failedExecution.attempts === 1 &&
    failedExecution.retries === 0 &&
    failedExecution.timeoutExtensions === 0 &&
    failedExecution.invalidContexts === 1 &&
    failedExecution.validContexts === 0,
  "the preserved failed execution boundary changed"
);
assertV4(
  failedValidation.status === "failed" &&
    failedValidation.repairOutputSha256 === sha256(bytesByFile[FAILED_REPAIR_OUTPUT]) &&
    /pro-brute-cause-insufficient: repaired critique outside 105–130 words/.test(
      failedValidation.validationMessage
    ) &&
    failedAnalysis.status ===
      "batch-03-debate-157-publication-resumption-2-bounded-repair-or-complete-publication-validation-failed",
  "the preserved failure records changed"
);
assertV4(
  originalOutput.debateNumber === "157" &&
    originalPacket.debateNumber === "157" &&
    originalOutput.debateId === originalPacket.debateId &&
    failedOutput.debateNumber === "157" &&
    failedOutput.debateId === originalPacket.debateId,
  "Debate 157 identity changed"
);

const fieldResults = expectedFields.map((field) => {
  const match = /^moveProse\.([^.]+)\.critique$/.exec(field);
  assertV4(match, `${field}: invalid field path`);
  const moveId = match[1];
  const failedText = String(failedOutput.correctedCritiques?.[moveId] ?? "").trim();
  const originalText = String(originalOutput.moveProse?.[moveId]?.critique ?? "").trim();
  const sentences = failedText.split(/(?<=[.!?])\s+/).filter(Boolean);
  const labels = ["Strongest feature:", "Principal limitation:", "Live burden:", "Locked score:"];
  const result = {
    field,
    moveId,
    originalSource: ORIGINAL_OUTPUT,
    originalWords: wordCount(originalText),
    originalCharacters: originalText.length,
    preservedFailedResponseWords: wordCount(failedText),
    preservedFailedResponseCharacters: failedText.length,
    acceptanceWords: [105, 130],
    acceptanceMinimumCharacters: 880,
    exactSentenceCountRequired: 4,
    observedSentenceCount: sentences.length,
    orderedLabelsPresent: labels.every((label, index) => sentences[index]?.startsWith(label)),
    terminalPunctuationPresent: sentences.every((sentence) => /[.!?]["')\]]?$/.test(sentence.trim())),
    failedResponseWithinWordBoundary: wordCount(failedText) >= 105 && wordCount(failedText) <= 130,
    failedResponseMeetsCharacterMinimum: failedText.length >= 880
  };
  assertV4(result.originalWords === 134, `${moveId}: original critique drifted`);
  return result;
});
assertV4(
  fieldResults[0].preservedFailedResponseWords === 131 &&
    fieldResults[0].failedResponseWithinWordBoundary === false &&
    fieldResults[1].preservedFailedResponseWords === 130 &&
    fieldResults[1].failedResponseWithinWordBoundary === true &&
    fieldResults.every(
      (entry) =>
        entry.failedResponseMeetsCharacterMinimum &&
        entry.observedSentenceCount === 4 &&
        entry.orderedLabelsPresent &&
        entry.terminalPunctuationPresent
    ),
  "the preserved response no longer matches the diagnosed one-word boundary failure"
);

const sourceHashes = Object.fromEntries(
  sourceFiles.sort().map((file) => [file, sha256(bytesByFile[file])])
);
const diagnosis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-03-debate-157-publication-repair-correction-2-failure-diagnosis",
  protocolId:
    "assessment-production-post-canary-batch-03-publication-resumption-2-debate-157-repair-correction-2",
  status: "diagnosed-preserved-debate-157-repair-packet-0-one-word-boundary-failure",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  debateNumber: "157",
  debateId: originalPacket.debateId,
  userAuthorization: {
    instruction: USER_AUTHORIZATION,
    oneTimeRecursiveRecoveryException: true,
    directIncrementalCostUsdMaximum: 0,
    replacementContextsMaximum: 1,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0
  },
  preservedFailure: {
    failedContextIndex: 0,
    failedPacketIndex: 0,
    transportSucceeded: true,
    outputWasPersisted: true,
    outputWasAccepted: false,
    validationCategory: "critique-word-boundary",
    failingField: expectedFields[0],
    observedWords: 131,
    maximumWords: 130,
    excessWords: 1,
    secondFieldIndependentlyWithinWordBoundary: true,
    originalRepairOutputPreservedByteIdentically: true
  },
  fieldResults,
  substantiveInputBoundary: {
    permitted: [ORIGINAL_OUTPUT, ORIGINAL_PACKET],
    failedRepairOutputPermittedForDiagnosisOnly: FAILED_REPAIR_OUTPUT,
    failedRepairOutputMayBeAccepted: false,
    failedRepairOutputMayBeCopiedIntoReplacementPacket: false,
    failedRepairOutputMayBeUsedAsSubstantiveModelInput: false,
    originalPublicationOutputProvidesBothOriginalCritiques: true,
    originalPublicationPacketProvidesBothLockedMoveRecords: true
  },
  replacementBoundary: {
    correctionId: "correction-2",
    contexts: 1,
    writableFields: expectedFields,
    writableFieldCount: 2,
    replacementMustReturnBothFields: true,
    replacementOutputCannotReuseFailedOutputAsAcceptedContent: true,
    scoresSourcesIdentityAndAcceptedFieldsImmutable: true,
    hashLockBeforeExecution: [
      "diagnosis",
      "replacement-packet",
      "response-schema",
      "validator",
      "merge-rule"
    ]
  },
  resumptionBoundaryAfterAcceptedCorrection: {
    exactlySevenUnattemptedFrozenRepairContexts: [1, 2, 3, 4, 5, 6, 7],
    mergeAcceptedFieldsTotal: 16,
    completeDebate157ValidationRequired: true,
    fiveDebateAcceptedCohortReplayRequired: true,
    exactlyFiveUnattemptedPublicationContextsMayResume: ["102", "09", "181", "138", "27"]
  },
  stopRules: {
    furtherFailedRepairOrModelOutputBlocks: true,
    paidServiceBlocks: true,
    protectedFieldChangeBlocks: true,
    retryBlocks: true,
    rollbackBlocks: true,
    productionManifestMismatchBlocks: true,
    batch4SelectionBlocks: true
  },
  sourceHashes,
  totals: {
    modelContextsExecuted: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0
  },
  nextAuthorizedAction:
    "prepare-validate-freeze-commit-and-push-one-debate-157-correction-2-replacement-context"
};

if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(DIAGNOSIS)), { recursive: true });
  await writeFile(path.resolve(DIAGNOSIS), `${JSON.stringify(diagnosis, null, 2)}\n`);
}

console.log(
  JSON.stringify(
    {
      status: shouldWrite ? diagnosis.status : "validated-preview",
      failingField: diagnosis.preservedFailure.failingField,
      observedWords: diagnosis.preservedFailure.observedWords,
      maximumWords: diagnosis.preservedFailure.maximumWords,
      secondFieldWords: fieldResults[1].preservedFailedResponseWords,
      failedOutputAccepted: false,
      replacementWritableFields: expectedFields,
      directIncrementalCostUsd: 0,
      nextAuthorizedAction: diagnosis.nextAuthorizedAction
    },
    null,
    2
  )
);
