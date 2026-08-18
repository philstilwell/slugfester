#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { wordCount } from "./lib/v388-reconstruction.mjs";
import { validatePostCanaryBatch02PublicationOutput } from "./lib/assessment-production-post-canary-batch-02-publication-validation.mjs";
import { POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_ROOT } from "./lib/assessment-production-post-canary-batch-02-publication-resumption.mjs";
import {
  POST_CANARY_BATCH_02_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch02StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-02-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_ROOT;
const paths = {
  activation: `${ROOT}/execution-activation.json`,
  execution: `${ROOT}/model-execution.json`,
  analysis: `${ROOT}/analysis.json`,
  output: `${ROOT}/outputs/debate-172.json`,
  packet:
    "docs/assessment-production/post-canary-continuation-v1/batch-02/publication-reconstruction/packets/debate-172.json",
  validation: `${ROOT}/validations/debate-172.json`,
  provenance: `${ROOT}/provenance/debate-172.json`,
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
const { activation, execution, analysis, output, packet, validation, provenance } =
  documents;
const standingAuthorization =
  await loadAndValidatePostCanaryBatch02StandingAuthorization();

assertV4(
  activation.status ===
      "frozen-nine-untouched-post-canary-batch-02-publication-resumption-contexts-authorized-under-standing-authorization" &&
    execution.status ===
      "post-canary-batch-02-publication-resumption-complete-with-failure" &&
    execution.contextsPlanned === 9 &&
    execution.contextsAttempted === 1 &&
    execution.contextsUnattempted === 8 &&
    execution.validContexts === 0 &&
    execution.invalidContexts === 1 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.correctionContexts === 0 &&
    execution.modelAuthoredScores === 0 &&
    execution.scorePassesExecutedThisStage === 0 &&
    analysis.status ===
      "post-canary-batch-02-publication-resumption-failed-validation" &&
    analysis.authorization?.failureDiagnosis === true &&
    analysis.authorization?.repairPacketPreparation === true &&
    analysis.authorization?.repairModelExecution === false &&
    analysis.authorization?.productionMutation === false &&
    analysis.nextAuthorizedAction ===
      "diagnose-batch-02-publication-resumption-failure-under-standing-authorization",
  "the failed Batch 2 publication-resumption gate does not authorize diagnosis"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `${file}: frozen source drifted`
  );
}

const result = execution.results[0];
assertV4(
  result.contextIndex === 0 &&
    result.debateNumber === "172" &&
    result.debateId === "hitchens-mcgrath-religious-belief-2007" &&
    result.status === "output-validation-failed" &&
    result.attemptCount === 1 &&
    result.retryCount === 0 &&
    result.timeoutExtensionCount === 0 &&
    result.correctionContextCount === 0 &&
    result.outputSha256 === sha256(bytes.output) &&
    result.validationSha256 === sha256(bytes.validation) &&
    result.provenanceSha256 === sha256(bytes.provenance) &&
    validation.status === "failed" &&
    provenance.outputSha256 === result.outputSha256,
  "the failed Debate 172 publication-resumption context changed"
);

const labels = [
  "strongest feature:",
  "principal limitation:",
  "live burden:",
  "locked score:"
];
const critiqueRows = packet.moves.map((move) => {
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
const invalidCritiques = critiqueRows
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
const expected = [
  ["pro-christ-centered-progressive-revelation", 131, 1],
  ["pro-enemy-love-resists-dehumanization", 132, 2]
];
assertV4(
  JSON.stringify(
    invalidCritiques.map((row) => [
      row.moveId,
      row.words,
      row.excessWordsAboveAcceptanceMaximum
    ])
  ) === JSON.stringify(expected),
  "Debate 172 failure is not the expected two-field word-boundary failure"
);
assertV4(
  critiqueRows.every(
    (row) =>
      row.characters >= 880 &&
      row.sentences === 4 &&
      row.orderedLabelsPassed &&
      row.terminalPunctuationPassed
  ),
  "an additional critique-integrity failure exists"
);

let originalValidationMessage = null;
try {
  validatePostCanaryBatch02PublicationOutput(output, packet);
} catch (error) {
  originalValidationMessage = error.message;
}
assertV4(
  originalValidationMessage ===
    "pro-christ-centered-progressive-revelation: critique outside 105–130 words",
  "the original deterministic failure changed"
);

// This copy is never written. Removing only surplus whitespace-delimited words
// proves that the two listed critique fields are the complete failure boundary.
const diagnosticOnly = structuredClone(output);
let hypotheticalWordsRemoved = 0;
for (const row of invalidCritiques) {
  const sentences = diagnosticOnly.moveProse[row.moveId].critique
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
  while (wordCount(sentences.join(" ")) > 130) {
    const tokens = sentences[1].split(/\s+/);
    assertV4(
      tokens.length > 6,
      `${row.moveId}: diagnostic sentence cannot be shortened safely`
    );
    tokens.splice(tokens.length - 2, 1);
    sentences[1] = tokens.join(" ");
    hypotheticalWordsRemoved += 1;
  }
  diagnosticOnly.moveProse[row.moveId].critique = sentences.join(" ");
}
assertV4(
  hypotheticalWordsRemoved === 3,
  "Debate 172 diagnostic word-removal boundary changed"
);
const hypotheticalReplay = validatePostCanaryBatch02PublicationOutput(
  diagnosticOnly,
  packet
);
assertV4(
  hypotheticalReplay.status === "passed" &&
    hypotheticalReplay.moves === 19 &&
    hypotheticalReplay.critiques === 19 &&
    hypotheticalReplay.minimumCritiqueCharacters >= 880 &&
    hypotheticalReplay.quoteExactSourceMatches === 2 &&
    hypotheticalReplay.overallCommentarySides === 2 &&
    hypotheticalReplay.aiExtensionSides === 2 &&
    hypotheticalReplay.calculatedScoresAuthoredByModel === 0 &&
    hypotheticalReplay.lockedScoresUnchanged === true,
  "diagnostic-only substitutions did not isolate the Debate 172 failure"
);

const failedFields = invalidCritiques.map((row) => ({
  path: `moveProse.${row.moveId}.critique`,
  words: row.words,
  characters: row.characters,
  acceptanceWords: [105, 130],
  targetWords: [112, 118],
  minimumCharacters: 880,
  excessWordsAboveAcceptanceMaximum: row.excessWordsAboveAcceptanceMaximum
}));
const proposedRepairPartition = [];
for (let index = 0; index < failedFields.length; index += 2) {
  proposedRepairPartition.push(
    failedFields.slice(index, index + 2).map(({ path: field }) => field)
  );
}
assertV4(
  proposedRepairPartition.length === 1 &&
    proposedRepairPartition.every(
      (fields) => fields.length >= 1 && fields.length <= 2
    ) &&
    proposedRepairPartition.flat().length === 2,
  "prospective Debate 172 repair partition changed"
);

const diagnosis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-02-publication-resumption-failure-diagnosis",
  protocolId: activation.protocolId,
  status:
    "diagnosed-batch-02-resumption-operational-canary-two-critique-word-overruns",
  developmentValidationOnly: false,
  productionCanary: false,
  batchNumber: 2,
  stagingOnly: true,
  failedContext: {
    contextIndex: 0,
    debateNumber: "172",
    debateId: result.debateId,
    elapsedMinutes: Number((result.elapsedMs / 60000).toFixed(2)),
    model: result.model,
    reasoningEffort: result.reasoningEffort,
    authentication: result.authentication,
    attemptCount: 1,
    retryCount: 0,
    timeoutExtensionCount: 0,
    correctionContextCount: 0,
    transportPassed:
      result.commandExitCode === 0 && result.terminationSignal === null,
    outputSha256: result.outputSha256
  },
  rampDisposition: {
    stoppedBeforeExpansion: true,
    contextsPlanned: 9,
    contextsAttempted: 1,
    contextsUnattempted: 8,
    unattemptedDebates: execution.unattemptedContextIndexes.map(
      (index) => activation.contexts[index].debateNumber
    ),
    retries: 0,
    timeoutExtensions: 0,
    correctionContexts: 0
  },
  failureBoundary: {
    failedFields,
    failedFieldCount: failedFields.length,
    excessWordsTotal: hypotheticalWordsRemoved,
    critiquesPassingUnchanged: critiqueRows.length - failedFields.length,
    critiquesWithCharacterFailure: 0,
    critiquesWithSentenceLabelOrPunctuationFailure: 0,
    originalValidationMessage
  },
  diagnosticReplay: {
    persistedCorrectedOutput: false,
    originalOutputModified: false,
    purpose:
      "prove-all-other-output-fields-pass-after-bounded-in-memory-removal-of-three-excess-words",
    hypotheticalWritableFields: failedFields.map(({ path: field }) => field),
    hypotheticalWordsRemoved,
    result: hypotheticalReplay
  },
  preservedControls: {
    participantJudgmentWasScoreBlind: true,
    scoresRecalculated: false,
    scoresChanged: false,
    modelAuthoredScores: 0,
    modelContextsExecutedForDiagnosis: 0,
    retries: 0,
    correctionModelContexts: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0,
    publicationFinalized: false,
    productionMutation: false
  },
  prospectiveRecoveryOnly: {
    currentlyAuthorizedUnderStandingAuthorization: true,
    repairPacketsPrepared: 0,
    repairPacketMaximumWritableFields: 2,
    proposedRepairPacketCount: proposedRepairPartition.length,
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
      "revalidate-the-complete-debate-172-publication-output",
      "freeze-a-separate-eight-context-resumption-manifest-only-if-debate-172-passes",
      "retain-publication-finalization-rendering-production-mutation-and-next-batch-stop-rules"
    ]
  },
  authorization: {
    standingAuthorizationApplies: true,
    repairPacketPreparation: true,
    repairModelExecutionAfterFrozenPreparationAndActivation: true,
    publicationGateResumptionAfterCompleteDebateValidation: true,
    retry: false,
    deterministicCompilation: false,
    publicationFinalization: false,
    renderingVerification: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  artifacts: Object.fromEntries(
    Object.entries(paths)
      .filter(([name]) => name !== "diagnosis")
      .map(([name, file]) => [
        name,
        { path: file, sha256: sha256(bytes[name]) }
      ])
  ),
  standingAuthorization: {
    path: POST_CANARY_BATCH_02_STANDING_AUTHORIZATION,
    sha256: standingAuthorization.sha256,
    status: standingAuthorization.record.status
  },
  nextRequiredAction:
    "prepare-one-bounded-debate-172-publication-repair-packet-under-standing-authorization"
};

const serializedDiagnosis = `${JSON.stringify(diagnosis, null, 2)}\n`;
if (shouldWrite) {
  await writeFile(path.resolve(paths.diagnosis), serializedDiagnosis);
} else if (await exists(paths.diagnosis)) {
  assertV4(
    String(await readFile(path.resolve(paths.diagnosis))) === serializedDiagnosis,
    "the frozen Debate 172 publication-resumption failure diagnosis changed"
  );
}
console.log(
  JSON.stringify(
    {
      status: diagnosis.status,
      failedFields: diagnosis.failureBoundary.failedFields,
      failedFieldCount: diagnosis.failureBoundary.failedFieldCount,
      excessWordsTotal: diagnosis.failureBoundary.excessWordsTotal,
      hypotheticalFullReplayPassed:
        diagnosis.diagnosticReplay.result.status === "passed",
      persistedCorrectedOutput: false,
      repairPacketsPrepared: 0,
      proposedRepairPacketCount:
        diagnosis.prospectiveRecoveryOnly.proposedRepairPacketCount,
      contextsAttempted: 1,
      contextsUnattempted: 8,
      modelContextsExecutedForDiagnosis: 0,
      retries: 0,
      modelAuthoredScores: 0,
      directIncrementalCostUsd: 0,
      productionMutation: false,
      nextRequiredAction: diagnosis.nextRequiredAction
    },
    null,
    2
  )
);
