#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { wordCount } from "./lib/v388-reconstruction.mjs";
import { validatePostCanaryBatch02PublicationOutput } from "./lib/assessment-production-post-canary-batch-02-publication-validation.mjs";
import { POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_3_ROOT } from "./lib/assessment-production-post-canary-batch-02-publication-resumption-3.mjs";
import {
  POST_CANARY_BATCH_02_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch02StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-02-standing-authorization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_3_ROOT;
const paths = {
  activation: `${ROOT}/execution-activation.json`,
  execution: `${ROOT}/model-execution.json`,
  analysis: `${ROOT}/analysis.json`,
  diagnosis: `${ROOT}/failure-diagnosis.json`
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
if (shouldWrite) {
  assertV4(!(await exists(paths.diagnosis)), `${paths.diagnosis} already exists`);
}

const readJsonBytes = async (file) => {
  const bytes = await readFile(path.resolve(file));
  return { bytes, value: JSON.parse(bytes) };
};
const core = Object.fromEntries(
  await Promise.all(
    Object.entries(paths)
      .filter(([name]) => name !== "diagnosis")
      .map(async ([name, file]) => [name, await readJsonBytes(file)])
  )
);
const activation = core.activation.value;
const execution = core.execution.value;
const analysis = core.analysis.value;
const standingAuthorization =
  await loadAndValidatePostCanaryBatch02StandingAuthorization();

assertV4(
  activation.status ===
      "frozen-five-untouched-post-canary-batch-02-publication-resumption-3-contexts-authorized-under-standing-authorization" &&
    execution.status ===
      "post-canary-batch-02-publication-resumption-3-complete-with-failure" &&
    execution.contextsPlanned === 5 &&
    execution.contextsAttempted === 3 &&
    execution.contextsUnattempted === 2 &&
    execution.validContexts === 2 &&
    execution.invalidContexts === 1 &&
    execution.attempts === 3 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.correctionContexts === 0 &&
    execution.modelAuthoredScores === 0 &&
    analysis.status ===
      "post-canary-batch-02-publication-resumption-3-failed-validation" &&
    analysis.authorization?.failureDiagnosis === true &&
    analysis.authorization?.repairPacketPreparation === true &&
    analysis.nextAuthorizedAction ===
      "diagnose-batch-02-publication-resumption-3-failure-under-standing-authorization",
  "the failed Batch 2 publication resumption-3 gate changed"
);

const failedResults = execution.results.filter(
  (result) => !result.gateAcceptancePassed
);
assertV4(
  failedResults.length === 1 &&
    failedResults[0].debateNumber === "99" &&
    failedResults[0].contextIndex === 2,
  "the failed debate set changed"
);
const result = failedResults[0];
const context = activation.contexts[result.contextIndex];
const [outputRecord, packetRecord, validationRecord, provenanceRecord] =
  await Promise.all([
    readJsonBytes(context.rawOutput),
    readJsonBytes(context.packet),
    readJsonBytes(context.validation),
    readJsonBytes(context.provenance)
  ]);
assertV4(
  result.status === "output-validation-failed" &&
    result.attemptCount === 1 &&
    result.retryCount === 0 &&
    result.timeoutExtensionCount === 0 &&
    result.correctionContextCount === 0 &&
    result.outputSha256 === sha256(outputRecord.bytes) &&
    result.validationSha256 === sha256(validationRecord.bytes) &&
    result.provenanceSha256 === sha256(provenanceRecord.bytes) &&
    validationRecord.value.status === "failed" &&
    provenanceRecord.value.outputSha256 === result.outputSha256,
  "the preserved failed Debate 99 context changed"
);

const labels = [
  "strongest feature:",
  "principal limitation:",
  "live burden:",
  "locked score:"
];
const rows = packetRecord.value.moves.map((move) => {
  const critique = String(
    outputRecord.value.moveProse[move.moveId].critique
  ).trim();
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
const invalid = rows.filter(
  (row) =>
    row.words < 105 ||
    row.words > 130 ||
    row.characters < 880 ||
    row.sentences !== 4 ||
    !row.orderedLabelsPassed ||
    !row.terminalPunctuationPassed
);
const expectedFailures = [
  ["con-natural-emergent-spacetime", 133],
  ["con-physical-basis-more-parsimonious", 134],
  ["con-induction-natural-consciousness", 133],
  ["pro-deeper-laws-compatible-with-mind", 132],
  ["pro-necessary-foundation-identified-as-god", 131],
  ["con-natural-cosmic-foundation", 133],
  ["pro-fundamental-consciousness-ends-regress", 134],
  ["con-conscious-god-not-physical-theory", 134],
  ["pro-neural-correlation-interface-model", 134]
];
assertV4(
  canonicalJson(invalid.map((row) => [row.moveId, row.words])) ===
      canonicalJson(expectedFailures) &&
    rows.every(
      (row) =>
        row.characters >= 880 &&
        row.sentences === 4 &&
        row.orderedLabelsPassed &&
        row.terminalPunctuationPassed
    ),
  "Debate 99 has an unexpected validation category"
);

const diagnosticOnly = structuredClone(outputRecord.value);
let wordsRemoved = 0;
for (const row of invalid) {
  const sentences = diagnosticOnly.moveProse[row.moveId].critique
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
  while (wordCount(sentences.join(" ")) > 130) {
    const tokens = sentences[1].split(/\s+/);
    assertV4(tokens.length > 6, `${row.moveId}: cannot shorten diagnostically`);
    tokens.splice(tokens.length - 2, 1);
    sentences[1] = tokens.join(" ");
    wordsRemoved += 1;
  }
  diagnosticOnly.moveProse[row.moveId].critique = sentences.join(" ");
}
assertV4(wordsRemoved === 28, "Debate 99 diagnostic word boundary changed");
const replay = validatePostCanaryBatch02PublicationOutput(
  diagnosticOnly,
  packetRecord.value
);
assertV4(
  replay.status === "passed" &&
    replay.moves === packetRecord.value.moves.length &&
    replay.critiques === packetRecord.value.moves.length &&
    replay.minimumCritiqueCharacters >= 880 &&
    replay.quoteExactSourceMatches === 2 &&
    replay.overallCommentarySides === 2 &&
    replay.aiExtensionSides === 2 &&
    replay.calculatedScoresAuthoredByModel === 0 &&
    replay.lockedScoresUnchanged === true,
  "Debate 99 diagnostic-only replay failed"
);

const failedFields = invalid.map((row) => ({
  path: `moveProse.${row.moveId}.critique`,
  words: row.words,
  characters: row.characters,
  acceptanceWords: [105, 130],
  targetWords: [112, 118],
  minimumCharacters: 880,
  wordsAboveMaximum: row.words - 130
}));
const proposedRepairPartition = [];
for (let index = 0; index < failedFields.length; index += 2) {
  proposedRepairPartition.push({
    debateNumber: "99",
    writableFields: failedFields
      .slice(index, index + 2)
      .map(({ path: field }) => field)
  });
}
assertV4(
  proposedRepairPartition.length === 5 &&
    proposedRepairPartition.every(
      (packet) =>
        packet.writableFields.length >= 1 &&
        packet.writableFields.length <= 2
    ) &&
    proposedRepairPartition.flatMap((packet) => packet.writableFields).length ===
      9,
  "the five-packet nine-field repair partition changed"
);

const diagnosis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-02-publication-resumption-3-failure-diagnosis",
  protocolId: activation.protocolId,
  status:
    "diagnosed-batch-02-resumption-3-debate-99-nine-critique-word-overruns",
  productionCanary: false,
  batchNumber: 2,
  stagingOnly: true,
  failureBoundary: {
    failedDebates: ["99"],
    failedDebateCount: 1,
    failedFieldCount: 9,
    overMaximumFieldCount: 9,
    underMinimumFieldCount: 0,
    wordsRemovedInDiagnosticCopy: wordsRemoved,
    unexpectedValidationCategories: 0,
    failedFields,
    diagnosticReplay: replay
  },
  rampDisposition: {
    contextsPlanned: 5,
    contextsAttempted: 3,
    contextsPassed: 2,
    contextsFailed: 1,
    contextsUnattempted: 2,
    acceptedDebates: ["66", "126"],
    unattemptedDebates: execution.unattemptedContextIndexes.map(
      (index) => activation.contexts[index].debateNumber
    ),
    retries: 0,
    timeoutExtensions: 0,
    correctionContexts: 0
  },
  diagnosticReplay: {
    persistedCorrectedOutputs: false,
    originalOutputModified: false,
    completeDebatePassed: replay
  },
  prospectiveRecoveryOnly: {
    currentlyAuthorizedUnderStandingAuthorization: true,
    repairPacketsPrepared: 0,
    repairPacketMaximumWritableFields: 2,
    proposedRepairPacketCount: 5,
    proposedRepairPartition,
    proposedModel: {
      label: "5.6 Sol",
      slug: "gpt-5.6-sol",
      reasoningEffort: "low",
      authentication: "ChatGPT subscription"
    },
    attemptsMaximumPerPacket: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    recursiveRepairsMaximum: 0
  },
  preservedControls: {
    participantJudgmentWasScoreBlind: true,
    scoresChanged: false,
    sourcesChanged: false,
    modelContextsExecutedForDiagnosis: 0,
    modelAuthoredScores: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0,
    productionMutation: false
  },
  authorization: {
    standingAuthorizationApplies: true,
    repairPacketPreparation: true,
    repairModelExecutionAfterFrozenPreparationAndActivation: true,
    retry: false,
    timeoutExtension: false,
    recursiveRepair: false,
    deterministicCompilation: false,
    publicationFinalization: false,
    renderingVerification: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  coreArtifacts: Object.fromEntries(
    Object.entries(core).map(([name, record]) => [
      name,
      { path: paths[name], sha256: sha256(record.bytes) }
    ])
  ),
  failedContextArtifacts: {
    output: { path: context.rawOutput, sha256: sha256(outputRecord.bytes) },
    packet: { path: context.packet, sha256: sha256(packetRecord.bytes) },
    validation: {
      path: context.validation,
      sha256: sha256(validationRecord.bytes)
    },
    provenance: {
      path: context.provenance,
      sha256: sha256(provenanceRecord.bytes)
    }
  },
  standingAuthorization: {
    path: POST_CANARY_BATCH_02_STANDING_AUTHORIZATION,
    sha256: standingAuthorization.sha256,
    status: standingAuthorization.record.status
  },
  nextRequiredAction:
    "prepare-five-bounded-debate-99-publication-repair-packets-under-standing-authorization"
};

const serialized = `${JSON.stringify(diagnosis, null, 2)}\n`;
if (shouldWrite) {
  await writeFile(path.resolve(paths.diagnosis), serialized);
} else if (await exists(paths.diagnosis)) {
  assertV4(
    String(await readFile(path.resolve(paths.diagnosis))) === serialized,
    "the frozen resumption-3 failure diagnosis changed"
  );
}
console.log(JSON.stringify({
  status: diagnosis.status,
  failedDebates: ["99"],
  failedFieldCount: 9,
  unexpectedValidationCategories: 0,
  hypotheticalCompleteDebateReplaysPassed: 1,
  proposedRepairPacketCount: 5,
  writableFieldsMaximumPerPacket: 2,
  modelContextsExecutedForDiagnosis: 0,
  directIncrementalCostUsd: 0,
  nextRequiredAction: diagnosis.nextRequiredAction
}, null, 2));
