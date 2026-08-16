#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { wordCount } from "./lib/v388-reconstruction.mjs";
import { validatePostCanaryBatch01PublicationOutput } from "./lib/assessment-production-post-canary-batch-01-publication-validation.mjs";
import { POST_CANARY_BATCH_01_PUBLICATION_ROOT } from "./lib/assessment-production-post-canary-batch-01-publication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = POST_CANARY_BATCH_01_PUBLICATION_ROOT;
const paths = {
  activation: `${ROOT}/execution-activation.json`,
  execution: `${ROOT}/model-execution.json`,
  analysis: `${ROOT}/analysis.json`,
  output: `${ROOT}/outputs/debate-31.json`,
  packet: `${ROOT}/packets/debate-31.json`,
  validation: `${ROOT}/validations/debate-31.json`,
  provenance: `${ROOT}/provenance/debate-31.json`,
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

assertV4(
  activation.status ===
      "frozen-ten-post-canary-batch-01-publication-contexts-authorized" &&
    execution.status ===
      "post-canary-batch-01-publication-gate-complete-with-failure" &&
    execution.contextsPlanned === 10 &&
    execution.contextsAttempted === 1 &&
    execution.contextsUnattempted === 9 &&
    execution.validContexts === 0 &&
    execution.invalidContexts === 1 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.correctionContexts === 0 &&
    execution.modelAuthoredScores === 0 &&
    execution.scorePassesExecutedThisStage === 0 &&
    analysis.status ===
      "post-canary-batch-01-publication-output-gate-failed" &&
    analysis.authorization?.failureDiagnosis === true &&
    analysis.authorization?.repairPacketPreparation === false &&
    analysis.authorization?.repairModelExecution === false &&
    analysis.authorization?.productionMutation === false &&
    analysis.nextAuthorizedAction ===
      "user-approval-required-before-batch-01-publication-failure-diagnosis-only",
  "the failed Batch 1 publication gate does not authorize diagnosis"
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
    result.debateNumber === "31" &&
    result.debateId === "oconnor-craig-resurrection-2023" &&
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
  "the failed Debate 31 publication context changed"
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
  ["pro-experiential-warrant-and-factual-defeaters", 131, 1],
  ["con-bones-defeat-experiential-warrant", 131, 1],
  ["pro-equal-standard-and-pragmatic-stakes", 133, 3],
  ["con-divine-intent-evidence-expectation", 137, 7],
  ["pro-likelihood-ratio-over-extraordinary-evidence-rule", 135, 5],
  ["con-resurrection-low-prior", 136, 6],
  ["pro-theistic-context-for-miracle-prior", 139, 9],
  ["pro-five-facts-best-explanation-case", 136, 6],
  ["con-sincere-error-grief-hallucination", 136, 6],
  ["pro-hallucination-scope-and-power-objection", 132, 2],
  ["con-underlying-reports-unreliable", 134, 4],
  ["pro-early-and-independent-core-data-support", 133, 3],
  ["con-appearance-legendary-development", 132, 2],
  ["pro-early-sources-against-legend", 135, 5]
];
assertV4(
  JSON.stringify(
    invalidCritiques.map((row) => [
      row.moveId,
      row.words,
      row.excessWordsAboveAcceptanceMaximum
    ])
  ) === JSON.stringify(expected),
  "Debate 31 failure is not the expected fourteen-field word-boundary failure"
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
  validatePostCanaryBatch01PublicationOutput(output, packet);
} catch (error) {
  originalValidationMessage = error.message;
}
assertV4(
  originalValidationMessage ===
    "pro-experiential-warrant-and-factual-defeaters: critique outside 105–130 words",
  "the original deterministic failure changed"
);

// This copy is never written. Removing only surplus whitespace-delimited words
// proves that the fourteen listed critique fields are the complete failure boundary.
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
  hypotheticalWordsRemoved === 60,
  "Debate 31 diagnostic word-removal boundary changed"
);
const hypotheticalReplay = validatePostCanaryBatch01PublicationOutput(
  diagnosticOnly,
  packet
);
assertV4(
  hypotheticalReplay.status === "passed" &&
    hypotheticalReplay.moves === 14 &&
    hypotheticalReplay.critiques === 14 &&
    hypotheticalReplay.minimumCritiqueCharacters >= 880 &&
    hypotheticalReplay.quoteExactSourceMatches === 2 &&
    hypotheticalReplay.overallCommentarySides === 2 &&
    hypotheticalReplay.aiExtensionSides === 2 &&
    hypotheticalReplay.calculatedScoresAuthoredByModel === 0 &&
    hypotheticalReplay.lockedScoresUnchanged === true,
  "diagnostic-only substitutions did not isolate the Debate 31 failure"
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
  proposedRepairPartition.length === 7 &&
    proposedRepairPartition.every((fields) => fields.length === 2),
  "prospective Debate 31 repair partition changed"
);

const diagnosis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-publication-failure-diagnosis",
  protocolId: activation.protocolId,
  status:
    "diagnosed-batch-01-operational-canary-fourteen-critique-word-overruns",
  developmentValidationOnly: false,
  productionCanary: false,
  batchNumber: 1,
  stagingOnly: true,
  failedContext: {
    contextIndex: 0,
    debateNumber: "31",
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
    contextsPlanned: 10,
    contextsAttempted: 1,
    contextsUnattempted: 9,
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
      "prove-all-other-output-fields-pass-after-bounded-in-memory-removal-of-sixty-excess-words",
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
    currentlyAuthorized: false,
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
      "revalidate-the-complete-debate-31-publication-output",
      "freeze-a-separate-nine-context-resumption-manifest-only-if-debate-31-passes",
      "retain-publication-finalization-rendering-production-mutation-and-next-batch-stop-rules"
    ]
  },
  authorization: {
    repairPacketPreparation: false,
    repairModelExecution: false,
    publicationGateResumption: false,
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
  nextRequiredAction:
    "user-approval-required-before-preparation-of-seven-debate-31-publication-repair-packets-and-execution-preparation-manifest-only"
};

const serializedDiagnosis = `${JSON.stringify(diagnosis, null, 2)}\n`;
if (shouldWrite) {
  await writeFile(path.resolve(paths.diagnosis), serializedDiagnosis);
} else if (await exists(paths.diagnosis)) {
  assertV4(
    String(await readFile(path.resolve(paths.diagnosis))) === serializedDiagnosis,
    "the frozen Debate 31 publication failure diagnosis changed"
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
      contextsUnattempted: 9,
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
