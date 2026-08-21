#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { wordCount } from "./lib/v388-reconstruction.mjs";
import { validatePostCanaryBatch03PublicationOutput } from "./lib/assessment-production-post-canary-batch-03-publication-validation.mjs";
import {
  POST_CANARY_BATCH_03_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch03StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-03-standing-authorization.mjs";
import {
  RECOVERY_AUTHORIZATION,
  loadAndValidateRecoveryAuthorization
} from "./lib/assessment-production-post-canary-batch-03-failure-recovery-standing-authorization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-03/publication-reconstruction/resumption-1";
const paths = {
  activation: `${ROOT}/execution-activation.json`,
  execution: `${ROOT}/model-execution.json`,
  analysis: `${ROOT}/analysis.json`,
  output58: `${ROOT}/outputs/debate-58.json`,
  output150: `${ROOT}/outputs/debate-150.json`,
  packet58:
    "docs/assessment-production/post-canary-continuation-v1/batch-03/publication-reconstruction/packets/debate-58.json",
  packet150:
    "docs/assessment-production/post-canary-continuation-v1/batch-03/publication-reconstruction/packets/debate-150.json",
  validation58: `${ROOT}/validations/debate-58.json`,
  validation150: `${ROOT}/validations/debate-150.json`,
  provenance58: `${ROOT}/provenance/debate-58.json`,
  provenance150: `${ROOT}/provenance/debate-150.json`,
  diagnosis: `${ROOT}/failure-diagnosis.json`
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

if (shouldWrite) {
  assertV4(!(await exists(paths.diagnosis)), `${paths.diagnosis} already exists`);
}

const documents = {};
const bytes = {};
for (const [name, file] of Object.entries(paths)) {
  if (name === "diagnosis") continue;
  bytes[name] = await readFile(path.resolve(file));
  documents[name] = JSON.parse(bytes[name]);
}
const standingAuthorization =
  await loadAndValidatePostCanaryBatch03StandingAuthorization();
const recoveryAuthorization = await loadAndValidateRecoveryAuthorization();
const { activation, execution, analysis } = documents;

assertV4(
  activation.status ===
      "frozen-nine-untouched-post-canary-batch-03-publication-resumption-contexts-authorized-under-failure-recovery-standing-authorization" &&
    execution.status ===
      "post-canary-batch-03-publication-resumption-complete-with-failure" &&
    execution.contextsPlanned === 9 &&
    execution.contextsAttempted === 3 &&
    execution.contextsUnattempted === 6 &&
    execution.validContexts === 1 &&
    execution.invalidContexts === 2 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.correctionContexts === 0 &&
    analysis.status ===
      "post-canary-batch-03-publication-resumption-failed-validation" &&
    analysis.nextAuthorizedAction ===
      "diagnose-batch-03-publication-resumption-failure-under-failure-recovery-standing-authorization",
  "the preserved failed resumption gate changed"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `${file}: frozen resumption source drifted`
  );
}

const failedResults = execution.results.filter(
  (result) => result.status === "output-validation-failed"
);
assertV4(
  canonicalJson(failedResults.map((result) => result.debateNumber)) ===
      canonicalJson(["58", "150"]) &&
    failedResults.every(
      (result) =>
        result.attemptCount === 1 &&
        result.retryCount === 0 &&
        result.timeoutExtensionCount === 0 &&
        result.correctionContextCount === 0 &&
        result.commandExitCode === 0 &&
        result.terminationSignal === null &&
        result.gateAcceptancePassed === false
    ),
  "the two preserved failed model contexts changed"
);
for (const debateNumber of ["58", "150"]) {
  const result = failedResults.find((row) => row.debateNumber === debateNumber);
  const outputName = `output${debateNumber}`;
  const validationName = `validation${debateNumber}`;
  const provenanceName = `provenance${debateNumber}`;
  assertV4(
    result.outputSha256 === sha256(bytes[outputName]) &&
      result.validationSha256 === sha256(bytes[validationName]) &&
      result.provenanceSha256 === sha256(bytes[provenanceName]) &&
      documents[validationName].status === "failed" &&
      documents[provenanceName].outputSha256 === result.outputSha256,
    `Debate ${debateNumber}: preserved failure artifacts changed`
  );
}

const labels = [
  "strongest feature:",
  "principal limitation:",
  "live burden:",
  "locked score:"
];
const critiqueRows = (output, packet) =>
  packet.moves.map((move) => {
    const critique = String(output.moveProse[move.moveId].critique).trim();
    const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
    return {
      moveId: move.moveId,
      words: wordCount(critique),
      characters: critique.length,
      sentences: sentences.length,
      orderedLabelsPassed:
        sentences.length === 4 &&
        sentences.every((sentence, index) =>
          sentence.toLowerCase().startsWith(labels[index])
        ),
      terminalPunctuationPassed: sentences.every((sentence) =>
        /[.!?]["')\]]?$/.test(sentence.trim())
      )
    };
  });

const output58 = documents.output58;
const packet58 = documents.packet58;
const output150 = documents.output150;
const packet150 = documents.packet150;
const rows58 = critiqueRows(output58, packet58);
const rows150 = critiqueRows(output150, packet150);
const invalidCritiques58 = rows58.filter(
  (row) =>
    row.words < 105 ||
    row.words > 130 ||
    row.characters < 880 ||
    row.sentences !== 4 ||
    !row.orderedLabelsPassed ||
    !row.terminalPunctuationPassed
);
const invalidCritiques150 = rows150
  .filter(
    (row) =>
      row.words < 105 ||
      row.words > 130 ||
      row.characters < 880 ||
      row.sentences !== 4 ||
      !row.orderedLabelsPassed ||
      !row.terminalPunctuationPassed
  )
  .map((row) => ({
    ...row,
    excessWordsAboveAcceptanceMaximum: Math.max(0, row.words - 130)
  }));
const expectedCritiques150 = [
  ["con-divine-agent-requires-prior-support", 132, 2],
  ["pro-causation-against-methodological-exclusion", 132, 2],
  ["con-test-before-supernatural-attribution", 132, 2],
  ["con-paul-and-reports-insufficient", 131, 1]
];
assertV4(invalidCritiques58.length === 0, "Debate 58 has an unexpected critique failure");
assertV4(
  canonicalJson(
    invalidCritiques150.map((row) => [
      row.moveId,
      row.words,
      row.excessWordsAboveAcceptanceMaximum
    ])
  ) === canonicalJson(expectedCritiques150),
  "Debate 150 critique failure boundary changed"
);
assertV4(
  [...rows58, ...rows150].every(
    (row) =>
      row.characters >= 880 &&
      row.sentences === 4 &&
      row.orderedLabelsPassed &&
      row.terminalPunctuationPassed
  ),
  "an additional critique-integrity failure exists"
);

const noveltyRows = (output) => {
  const rows = [];
  for (const side of ["pro", "con"]) {
    const extension = output.aiExtension[side];
    for (const item of [
      extension.thesis,
      ...extension.premises,
      extension.conclusion,
      ...extension.newArguments
    ]) {
      rows.push({
        side,
        id: item.id,
        words: wordCount(item.novelty.explanation),
        characters: item.novelty.explanation.length
      });
    }
  }
  return rows;
};
const novelty58 = noveltyRows(output58);
const novelty150 = noveltyRows(output150);
const invalidNovelty58 = novelty58.filter((row) => row.words < 8);
const invalidNovelty150 = novelty150.filter((row) => row.words < 8);
assertV4(
  canonicalJson(invalidNovelty58) ===
      canonicalJson([
        {
          side: "con",
          id: "d58-ai-con-premise-4",
          words: 7,
          characters: 62
        }
      ]) &&
    invalidNovelty150.length === 0,
  "novelty-explanation failure boundary changed"
);

const firstValidationMessage = (output, packet) => {
  try {
    validatePostCanaryBatch03PublicationOutput(output, packet);
  } catch (error) {
    return error.message;
  }
  return null;
};
assertV4(
  firstValidationMessage(output58, packet58) ===
      "d58-ai-con-premise-4: novelty explanation too short" &&
    firstValidationMessage(output150, packet150) ===
      "con-divine-agent-requires-prior-support: critique outside 105–130 words",
  "the original deterministic validation messages changed"
);

// These copies are never written. The minimum boundary-only substitutions prove
// that every other field in each preserved output passes the full validator.
const diagnostic58 = structuredClone(output58);
const premise58 = diagnostic58.aiExtension.con.premises.find(
  (item) => item.id === "d58-ai-con-premise-4"
);
premise58.novelty.explanation += " directly";
const replay58 = validatePostCanaryBatch03PublicationOutput(
  diagnostic58,
  packet58
);

const diagnostic150 = structuredClone(output150);
let hypotheticalWordsRemoved = 0;
for (const row of invalidCritiques150) {
  const sentences = diagnostic150.moveProse[row.moveId].critique
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
  while (wordCount(sentences.join(" ")) > 130) {
    const tokens = sentences[1].split(/\s+/);
    assertV4(tokens.length > 6, `${row.moveId}: diagnostic sentence too short`);
    tokens.splice(tokens.length - 2, 1);
    sentences[1] = tokens.join(" ");
    hypotheticalWordsRemoved += 1;
  }
  diagnostic150.moveProse[row.moveId].critique = sentences.join(" ");
}
assertV4(hypotheticalWordsRemoved === 7, "diagnostic word-removal boundary changed");
const replay150 = validatePostCanaryBatch03PublicationOutput(
  diagnostic150,
  packet150
);
assertV4(
  replay58.status === "passed" &&
    replay150.status === "passed" &&
    replay58.lockedScoresUnchanged === true &&
    replay150.lockedScoresUnchanged === true &&
    replay58.calculatedScoresAuthoredByModel === 0 &&
    replay150.calculatedScoresAuthoredByModel === 0,
  "bounded in-memory substitutions did not isolate both failures"
);

const failedFields = [
  {
    debateNumber: "58",
    path:
      "aiExtension.con.premises[id=d58-ai-con-premise-4].novelty.explanation",
    itemId: "d58-ai-con-premise-4",
    words: 7,
    characters: 62,
    minimumWords: 8,
    missingWords: 1,
    originalValidationMessage:
      "d58-ai-con-premise-4: novelty explanation too short"
  },
  ...invalidCritiques150.map((row) => ({
    debateNumber: "150",
    path: `moveProse.${row.moveId}.critique`,
    moveId: row.moveId,
    words: row.words,
    characters: row.characters,
    sentences: row.sentences,
    orderedLabelsPassed: row.orderedLabelsPassed,
    terminalPunctuationPassed: row.terminalPunctuationPassed,
    acceptanceWords: [105, 130],
    targetWords: [112, 118],
    minimumCharacters: 880,
    excessWordsAboveAcceptanceMaximum:
      row.excessWordsAboveAcceptanceMaximum,
    originalValidationMessage:
      "con-divine-agent-requires-prior-support: critique outside 105–130 words"
  }))
];
const proposedRepairPartition = [
  [failedFields[0].path],
  failedFields.slice(1, 3).map(({ path: field }) => field),
  failedFields.slice(3, 5).map(({ path: field }) => field)
];
assertV4(
  proposedRepairPartition.length === 3 &&
    proposedRepairPartition.every((fields) => fields.length >= 1 && fields.length <= 2) &&
    proposedRepairPartition.flat().length === 5,
  "minimum field-disjoint repair partition changed"
);

const diagnosis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-03-publication-resumption-failure-diagnosis",
  protocolId: activation.protocolId,
  status:
    "diagnosed-batch-03-publication-resumption-five-field-validation-failures",
  productionCanary: false,
  batchNumber: 3,
  stagingOnly: true,
  preservedGate: {
    contextsPlanned: 9,
    contextsAttempted: 3,
    contextsValid: 1,
    contextsInvalid: 2,
    contextsUnattempted: 6,
    acceptedDebates: ["124", "14"],
    failedDebates: ["58", "150"],
    unattemptedDebates: ["157", "102", "09", "181", "138", "27"],
    attempts: 3,
    retries: 0,
    timeoutExtensions: 0,
    correctionContexts: 0
  },
  failedContexts: failedResults.map((result) => ({
    contextIndex: result.contextIndex,
    originalContextIndex: result.originalContextIndex,
    debateNumber: result.debateNumber,
    debateId: result.debateId,
    model: result.model,
    reasoningEffort: result.reasoningEffort,
    authentication: result.authentication,
    attemptCount: result.attemptCount,
    retryCount: result.retryCount,
    timeoutExtensionCount: result.timeoutExtensionCount,
    correctionContextCount: result.correctionContextCount,
    transportPassed: true,
    gateAcceptancePassed: false,
    outputSha256: result.outputSha256
  })),
  failureBoundary: {
    failedFields,
    failedFieldCount: 5,
    affectedDebates: 2,
    noveltyExplanationFailures: 1,
    critiqueWordBoundaryFailures: 4,
    missingNoveltyWordsTotal: 1,
    excessCritiqueWordsTotal: 7,
    additionalFailuresDetected: false,
    sourceFailureDetected: false,
    identityFailureDetected: false,
    transportFailureDetected: false,
    timeoutFailureDetected: false,
    responseSchemaFailureDetected: false,
    scoreFailureDetected: false,
    validatorFailureDetected: false
  },
  diagnosticReplay: {
    inMemoryOnly: true,
    persistedCorrectedOutputs: 0,
    originalOutputBytesChanged: false,
    hypotheticalWritableFields: failedFields.map(({ path: field }) => field),
    hypotheticalNoveltyWordsAdded: 1,
    hypotheticalCritiqueWordsRemoved: 7,
    debates: [
      { debateNumber: "58", result: replay58 },
      { debateNumber: "150", result: replay150 }
    ]
  },
  preservedControls: {
    modelContextsExecutedForDiagnosis: 0,
    retries: 0,
    timeoutExtensions: 0,
    correctionModelContexts: 0,
    repairPacketsPrepared: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0,
    scoresRecalculated: false,
    scoresChanged: false,
    modelAuthoredScores: 0,
    publicationCompiled: false,
    publicationFinalized: false,
    productionMutation: false,
    nextBatchSelected: false
  },
  prospectiveRecoveryOnly: {
    currentlyAuthorizedUnderFailureRecoveryStandingAuthorization: true,
    repairPacketsPrepared: 0,
    repairPacketMaximumWritableFields: 2,
    proposedRepairPacketCount: 3,
    proposedWritableFields: failedFields.map(({ path: field }) => field),
    proposedRepairPartition,
    proposedModel: {
      label: "5.6 Sol",
      slug: "gpt-5.6-sol",
      reasoningEffort: "low",
      authentication: "ChatGPT subscription"
    },
    proposedAttemptsMaximumPerPacket: 1,
    proposedRetriesMaximum: 0,
    requiredAfterRepair: [
      "merge-only-the-five-accepted-repair-fields",
      "validate-complete-debates-58-and-150",
      "replay-the-complete-four-debate-accepted-cohort",
      "resume-only-the-six-unattempted-publication-contexts"
    ]
  },
  authorization: {
    standingAuthorizationApplies: true,
    failureRecoveryStandingAuthorizationApplies: true,
    repairPacketPreparation: true,
    repairModelExecutionAfterFrozenPreparationAndActivation: true,
    publicationGateResumptionAfterCompleteDebateValidation: true,
    retry: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  artifacts: Object.fromEntries(
    Object.entries(paths)
      .filter(([name]) => name !== "diagnosis")
      .map(([name, file]) => [name, { path: file, sha256: sha256(bytes[name]) }])
  ),
  standingAuthorization: {
    path: POST_CANARY_BATCH_03_STANDING_AUTHORIZATION,
    sha256: standingAuthorization.sha256,
    status: standingAuthorization.record.status
  },
  failureRecoveryStandingAuthorization: {
    path: RECOVERY_AUTHORIZATION,
    sha256: recoveryAuthorization.sha256,
    status: recoveryAuthorization.record.status
  },
  nextRequiredAction:
    "prepare-three-bounded-batch-03-publication-resumption-repair-packets"
};

const serialized = `${JSON.stringify(diagnosis, null, 2)}\n`;
if (shouldWrite) {
  await writeFile(path.resolve(paths.diagnosis), serialized);
} else if (await exists(paths.diagnosis)) {
  assertV4(
    String(await readFile(path.resolve(paths.diagnosis))) === serialized,
    "the frozen resumption failure diagnosis changed"
  );
}

console.log(
  JSON.stringify(
    {
      status: diagnosis.status,
      failedDebates: diagnosis.preservedGate.failedDebates,
      failedFields: diagnosis.failureBoundary.failedFieldCount,
      hypotheticalFullReplaysPassed: diagnosis.diagnosticReplay.debates.length,
      proposedRepairPacketCount: 3,
      modelContextsExecutedForDiagnosis: 0,
      directIncrementalCostUsd: 0,
      nextRequiredAction: diagnosis.nextRequiredAction
    },
    null,
    2
  )
);
