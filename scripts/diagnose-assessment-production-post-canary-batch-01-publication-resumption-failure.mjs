#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validatePostCanaryBatch01PublicationOutput } from "./lib/assessment-production-post-canary-batch-01-publication-validation.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/publication-reconstruction/resumption-1";
const diagnosisPath = `${ROOT}/failure-diagnosis.json`;
const paths = {
  preparation: `${ROOT}/execution-preparation-manifest.json`,
  activation: `${ROOT}/execution-activation.json`,
  execution: `${ROOT}/model-execution.json`,
  analysis: `${ROOT}/analysis.json`,
  packet91:
    "docs/assessment-production/post-canary-continuation-v1/batch-01/publication-reconstruction/packets/debate-91.json",
  output91: `${ROOT}/outputs/debate-91.json`,
  validation91: `${ROOT}/validations/debate-91.json`,
  provenance91: `${ROOT}/provenance/debate-91.json`,
  packet13:
    "docs/assessment-production/post-canary-continuation-v1/batch-01/publication-reconstruction/packets/debate-13.json",
  output13: `${ROOT}/outputs/debate-13.json`,
  validation13: `${ROOT}/validations/debate-13.json`,
  provenance13: `${ROOT}/provenance/debate-13.json`
};
const sourcePaths = [
  "docs/assessment-production-workflow.md",
  "docs/reassessment-rubric-v2.1.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/assessment-production/manifest-v1.json",
  ...Object.values(paths),
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-01-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-01-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-01-publication-resumption.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-01-publication-resumption.mjs",
  "scripts/run-assessment-production-post-canary-batch-01-publication-resumption.mjs",
  "scripts/diagnose-assessment-production-post-canary-batch-01-publication-resumption-failure.mjs",
  "scripts/test-assessment-production-post-canary-batch-01-publication-resumption-failure-diagnosis.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) =>
  access(path.resolve(file)).then(
    () => true,
    () => false
  );

if (shouldWrite) {
  assertV4(!(await exists(diagnosisPath)), `${diagnosisPath} already exists`);
}

const bytesByPath = new Map(
  await Promise.all(
    sourcePaths.map(async (file) => [file, await readFile(path.resolve(file))])
  )
);
const readJson = (file) =>
  JSON.parse(bytesByPath.get(file).toString("utf8"));
const preparation = readJson(paths.preparation);
const activation = readJson(paths.activation);
const execution = readJson(paths.execution);
const analysis = readJson(paths.analysis);
const packet91 = readJson(paths.packet91);
const output91 = readJson(paths.output91);
const validation91 = readJson(paths.validation91);
const provenance91 = readJson(paths.provenance91);
const packet13 = readJson(paths.packet13);
const output13 = readJson(paths.output13);
const validation13 = readJson(paths.validation13);
const provenance13 = readJson(paths.provenance13);

assertV4(
  preparation.status ===
      "frozen-nine-untouched-post-canary-batch-01-publication-resumption-contexts-prepared-not-authorized" &&
    activation.status ===
      "frozen-nine-untouched-post-canary-batch-01-publication-resumption-contexts-authorized" &&
    execution.status ===
      "post-canary-batch-01-publication-resumption-complete-with-failure" &&
    execution.contextsPlanned === 9 &&
    execution.contextsAttempted === 9 &&
    execution.contextsUnattempted === 0 &&
    execution.validContexts === 7 &&
    execution.invalidContexts === 2 &&
    execution.attempts === 9 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.correctionContexts === 0 &&
    execution.modelAuthoredScores === 0 &&
    execution.scorePassesExecutedThisStage === 0 &&
    execution.paidServiceCallsThisStage === 0 &&
    execution.meteredApiCostUsd === 0 &&
    execution.maximumObservedConcurrency === 2 &&
    analysis.status ===
      "post-canary-batch-01-publication-resumption-failed-validation" &&
    analysis.authorization?.failureDiagnosis === true &&
    analysis.authorization?.repairPacketPreparation === false &&
    analysis.authorization?.repairModelExecution === false &&
    analysis.authorization?.publicationCompilationPreparation === false &&
    analysis.authorization?.deterministicCompilation === false &&
    analysis.authorization?.productionMutation === false &&
    analysis.nextAuthorizedAction ===
      "user-approval-required-before-batch-01-publication-resumption-failure-diagnosis-only",
  "the failed Batch 1 publication resumption does not authorize diagnosis"
);
assertV4(
  analysis.execution.validContexts === 7 &&
    analysis.execution.invalidContexts === 2 &&
    analysis.totals.cohortDebates === 8 &&
    analysis.totals.cohortMoves === 147 &&
    analysis.gate.resumptionSemanticPass === false &&
    analysis.gate.cohortSemanticPass === false &&
    analysis.totals.publicationCompilationPasses === 0 &&
    analysis.totals.productionMutations === 0,
  "the preserved resumption analysis changed"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `${file}: frozen activation source drifted`
  );
}

const failedResults = execution.results.filter(
  ({ status }) => status === "output-validation-failed"
);
assertV4(
  JSON.stringify(failedResults.map(({ debateNumber }) => debateNumber)) ===
    JSON.stringify(["91", "13"]) &&
    execution.results.filter(({ status }) => status === "completed-valid")
      .length === 7,
  "the resumption context disposition changed"
);

function assertPreservedFailure({
  debateNumber,
  debateId,
  contextIndex,
  originalContextIndex,
  packet,
  packetPath,
  output,
  outputPath,
  validation,
  validationPath,
  provenance,
  provenancePath
}) {
  const context = activation.contexts.find(
    (item) => item.debateNumber === debateNumber
  );
  const result = execution.results.find(
    (item) => item.debateNumber === debateNumber
  );
  assertV4(context && result, `Debate ${debateNumber}: context missing`);
  assertV4(
    context.contextIndex === contextIndex &&
      context.originalContextIndex === originalContextIndex &&
      context.debateId === debateId &&
      context.packet === packetPath &&
      context.packetSha256 === sha256(bytesByPath.get(packetPath)) &&
      result.contextIndex === contextIndex &&
      result.originalContextIndex === originalContextIndex &&
      result.debateId === debateId &&
      result.status === "output-validation-failed" &&
      result.attemptCount === 1 &&
      result.retryCount === 0 &&
      result.timeoutExtensionCount === 0 &&
      result.correctionContextCount === 0 &&
      result.commandExitCode === 0 &&
      result.terminationSignal === null &&
      result.timedOut === false &&
      result.gateAcceptancePassed === false &&
      result.outputSha256 === sha256(bytesByPath.get(outputPath)) &&
      result.validationSha256 === sha256(bytesByPath.get(validationPath)) &&
      result.provenanceSha256 === sha256(bytesByPath.get(provenancePath)) &&
      packet.debateNumber === debateNumber &&
      packet.debateId === debateId &&
      output.debateNumber === debateNumber &&
      output.debateId === debateId &&
      validation.status === "failed" &&
      validation.outputSha256 === result.outputSha256 &&
      provenance.outputSha256 === result.outputSha256 &&
      provenance.model.label === "5.6 Sol" &&
      provenance.model.slug === "gpt-5.6-sol" &&
      provenance.reasoningEffort === "low" &&
      provenance.authentication === "ChatGPT subscription" &&
      provenance.apiKeysRemoved === true &&
      provenance.isolatedTemporaryCodexHome === true &&
      provenance.isolatedTemporaryWorkingDirectory === true &&
      provenance.participantJudgmentWasScoreBlind === true &&
      provenance.ownDebateScoresImmutable === true &&
      provenance.attemptCount === 1 &&
      provenance.retryCount === 0 &&
      provenance.timeoutExtensionCount === 0 &&
      provenance.correctionContextCount === 0 &&
      provenance.modelAuthoredScores === 0 &&
      provenance.scorePassesExecutedThisStage === 0 &&
      provenance.paidServiceCallsThisStage === 0 &&
      provenance.meteredApiCostUsd === 0,
    `Debate ${debateNumber}: preserved failure changed`
  );
  return result;
}

const result91 = assertPreservedFailure({
  debateNumber: "91",
  debateId: "cutter-oppy-mind-brain-harmony-god-2025",
  contextIndex: 3,
  originalContextIndex: 4,
  packet: packet91,
  packetPath: paths.packet91,
  output: output91,
  outputPath: paths.output91,
  validation: validation91,
  validationPath: paths.validation91,
  provenance: provenance91,
  provenancePath: paths.provenance91
});
const result13 = assertPreservedFailure({
  debateNumber: "13",
  debateId: "knechtle-oconnor-christian-morality-2025",
  contextIndex: 7,
  originalContextIndex: 8,
  packet: packet13,
  packetPath: paths.packet13,
  output: output13,
  outputPath: paths.output13,
  validation: validation13,
  validationPath: paths.validation13,
  provenance: provenance13,
  provenancePath: paths.provenance13
});

function captureValidationFailure(output, packet) {
  try {
    validatePostCanaryBatch01PublicationOutput(output, packet);
  } catch (error) {
    return error.message;
  }
  return null;
}

const originalValidationMessage91 = captureValidationFailure(
  output91,
  packet91
);
const originalValidationMessage13 = captureValidationFailure(
  output13,
  packet13
);
assertV4(
  originalValidationMessage91 ===
      "con: quote is not an exact source substring" &&
    originalValidationMessage13 ===
      "con-consolation-not-truth: critique outside 105–130 words" &&
    validation91.validationMessage.startsWith(
      `Error: ${originalValidationMessage91}\n`
    ) &&
    validation13.validationMessage.startsWith(
      `Error: ${originalValidationMessage13}\n`
    ),
  "the original deterministic failure messages changed"
);

const quote91 = output91.representativeQuotes.con;
const quoteMove91 = packet91.moves.find(
  ({ moveId }) => moveId === quote91.sourceMoveId
);
const exactDiagnosticQuote91 =
  "a flat distribution presumably won't work because the the um, range is going to be infinite";
assertV4(
  quote91.sourceMoveId === "con-ignorance-provides-no-prior-measure" &&
    quote91.text ===
      "a flat distribution presumably won't work because the range is going to be infinite" &&
    quoteMove91?.side === "con" &&
    quoteMove91.quoteEligible === true &&
    quoteMove91.sourceExcerpt.includes(quote91.text) === false &&
    quoteMove91.sourceExcerpt.includes(exactDiagnosticQuote91) === true &&
    exactDiagnosticQuote91.replace("the the um, range", "the range") ===
      quote91.text &&
    wordCount(quote91.text) === 14 &&
    wordCount(exactDiagnosticQuote91) === 16,
  "Debate 91 is not the expected two-token verbatim-quote failure"
);
const diagnostic91 = structuredClone(output91);
diagnostic91.representativeQuotes.con.text = exactDiagnosticQuote91;
const replay91 = validatePostCanaryBatch01PublicationOutput(
  diagnostic91,
  packet91
);
assertV4(
  replay91.status === "passed" &&
    replay91.moves === 18 &&
    replay91.critiques === 18 &&
    replay91.quoteExactSourceMatches === 2 &&
    replay91.overallCommentarySides === 2 &&
    replay91.aiExtensionSides === 2 &&
    replay91.calculatedScoresAuthoredByModel === 0 &&
    replay91.lockedScoresUnchanged === true,
  "Debate 91 in-memory quote substitution did not isolate the failure"
);

const critiqueLabels = [
  "strongest feature:",
  "principal limitation:",
  "live burden:",
  "locked score:"
];
const critiqueRows13 = packet13.moves.map((move) => {
  const critique = String(output13.moveProse[move.moveId].critique).trim();
  const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
  return {
    moveId: move.moveId,
    words: wordCount(critique),
    characters: critique.length,
    sentences: sentences.length,
    orderedLabelsPassed:
      sentences.length === 4 &&
      sentences.every((sentence, index) =>
        sentence.toLowerCase().startsWith(critiqueLabels[index])
      ),
    terminalPunctuationPassed: sentences.every((sentence) =>
      /[.!?]["')\]]?$/.test(sentence.trim())
    )
  };
});
const invalidCritiques13 = critiqueRows13.filter(
  (row) =>
    row.words < 105 ||
    row.words > 130 ||
    row.characters < 880 ||
    row.sentences !== 4 ||
    !row.orderedLabelsPassed ||
    !row.terminalPunctuationPassed
);
assertV4(
  JSON.stringify(invalidCritiques13) ===
    JSON.stringify([
      {
        moveId: "con-consolation-not-truth",
        words: 133,
        characters: 1088,
        sentences: 4,
        orderedLabelsPassed: true,
        terminalPunctuationPassed: true
      },
      {
        moveId: "con-job-terrifying-submission",
        words: 131,
        characters: 1042,
        sentences: 4,
        orderedLabelsPassed: true,
        terminalPunctuationPassed: true
      },
      {
        moveId: "pro-slavery-law-accommodation",
        words: 131,
        characters: 1089,
        sentences: 4,
        orderedLabelsPassed: true,
        terminalPunctuationPassed: true
      }
    ]),
  "Debate 13 is not the expected three-critique word-boundary failure"
);
const diagnostic13 = structuredClone(output13);
let hypotheticalWordsRemoved13 = 0;
for (const row of invalidCritiques13) {
  const sentences = diagnostic13.moveProse[row.moveId].critique
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
  while (wordCount(sentences.join(" ")) > 130) {
    const tokens = sentences[1].split(/\s+/);
    assertV4(
      tokens.length > 6,
      `Debate 13 ${row.moveId} diagnostic sentence is too short`
    );
    tokens.splice(tokens.length - 2, 1);
    sentences[1] = tokens.join(" ");
    hypotheticalWordsRemoved13 += 1;
  }
  diagnostic13.moveProse[row.moveId].critique = sentences.join(" ");
}
assertV4(
  hypotheticalWordsRemoved13 === 5,
  "Debate 13 diagnostic word-removal boundary changed"
);
const replay13 = validatePostCanaryBatch01PublicationOutput(
  diagnostic13,
  packet13
);
assertV4(
  replay13.status === "passed" &&
    replay13.moves === 12 &&
    replay13.critiques === 12 &&
    replay13.minimumCritiqueCharacters >= 880 &&
    replay13.quoteExactSourceMatches === 2 &&
    replay13.overallCommentarySides === 2 &&
    replay13.aiExtensionSides === 2 &&
    replay13.calculatedScoresAuthoredByModel === 0 &&
    replay13.lockedScoresUnchanged === true,
  "Debate 13 in-memory critique shortening did not isolate the failure"
);

const failedFields = [
  {
    debateNumber: "91",
    path: "representativeQuotes.con.text",
    failureClass:
      "non-exact-representative-quote-after-two-source-tokens-were-omitted",
    sourceMoveId: quote91.sourceMoveId,
    outputWords: wordCount(quote91.text),
    exactDiagnosticSourceSubstringWords: wordCount(exactDiagnosticQuote91),
    acceptanceWords: [3, 18],
    omittedSourceTokens: 2,
    originalValidationMessage: originalValidationMessage91
  },
  {
    debateNumber: "13",
    path: "moveProse.con-consolation-not-truth.critique",
    failureClass: "single-critique-three-words-above-acceptance-maximum",
    words: 133,
    characters: 1088,
    sentences: 4,
    acceptanceWords: [105, 130],
    targetWords: [112, 118],
    minimumCharacters: 880,
    excessWordsAboveAcceptanceMaximum: 3,
    orderedLabelsPassed: true,
    terminalPunctuationPassed: true,
    originalValidationMessage: originalValidationMessage13
  },
  {
    debateNumber: "13",
    path: "moveProse.con-job-terrifying-submission.critique",
    failureClass: "single-critique-one-word-above-acceptance-maximum",
    words: 131,
    characters: 1042,
    sentences: 4,
    acceptanceWords: [105, 130],
    targetWords: [112, 118],
    minimumCharacters: 880,
    excessWordsAboveAcceptanceMaximum: 1,
    orderedLabelsPassed: true,
    terminalPunctuationPassed: true,
    originalValidationMessage:
      "latent-after-con-consolation-not-truth-word-boundary-failure"
  },
  {
    debateNumber: "13",
    path: "moveProse.pro-slavery-law-accommodation.critique",
    failureClass: "single-critique-one-word-above-acceptance-maximum",
    words: 131,
    characters: 1089,
    sentences: 4,
    acceptanceWords: [105, 130],
    targetWords: [112, 118],
    minimumCharacters: 880,
    excessWordsAboveAcceptanceMaximum: 1,
    orderedLabelsPassed: true,
    terminalPunctuationPassed: true,
    originalValidationMessage:
      "latent-after-earlier-debate-13-word-boundary-failures"
  }
];

const diagnosis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-publication-resumption-failure-diagnosis",
  protocolId: activation.protocolId,
  status:
    "diagnosed-batch-01-publication-resumption-four-field-validation-failures",
  developmentValidationOnly: false,
  productionCanary: false,
  batchNumber: 1,
  stagingOnly: true,
  userAuthorization: {
    scope:
      "deterministic diagnosis, validation, freezing, committing, and pushing of the preserved Debate 91 and Debate 13 publication-resumption validation failures only",
    directIncrementalCostUsdMaximum: 0,
    repairPacketPreparation: false,
    modelExecution: false,
    retry: false,
    paidServices: false,
    publicationCompilation: false,
    publicationFinalization: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  preservedGate: {
    analysisStatus: analysis.status,
    contextsPlanned: 9,
    contextsAttempted: 9,
    contextsValid: 7,
    contextsInvalid: 2,
    contextsUnattempted: 0,
    validCohortDebates: 8,
    validCohortMoves: 147,
    failedDebates: ["91", "13"],
    failuresErasedReclassifiedOrRepaired: false
  },
  failedContexts: [
    {
      contextIndex: 3,
      originalContextIndex: 4,
      debateNumber: "91",
      debateId: result91.debateId,
      elapsedMinutes: Number((result91.elapsedMs / 60000).toFixed(2)),
      model: provenance91.model,
      scoreBlind: provenance91.participantJudgmentWasScoreBlind,
      apiKeysRemoved: provenance91.apiKeysRemoved,
      attemptCount: 1,
      retryCount: 0,
      timeoutExtensionCount: 0,
      correctionContextCount: 0,
      transportPassed:
        result91.commandExitCode === 0 && result91.terminationSignal === null,
      gateAcceptancePassed: false,
      outputSha256: result91.outputSha256
    },
    {
      contextIndex: 7,
      originalContextIndex: 8,
      debateNumber: "13",
      debateId: result13.debateId,
      elapsedMinutes: Number((result13.elapsedMs / 60000).toFixed(2)),
      model: provenance13.model,
      scoreBlind: provenance13.participantJudgmentWasScoreBlind,
      apiKeysRemoved: provenance13.apiKeysRemoved,
      attemptCount: 1,
      retryCount: 0,
      timeoutExtensionCount: 0,
      correctionContextCount: 0,
      transportPassed:
        result13.commandExitCode === 0 && result13.terminationSignal === null,
      gateAcceptancePassed: false,
      outputSha256: result13.outputSha256
    }
  ],
  failureBoundary: {
    failedFields,
    failedFieldCount: 4,
    affectedDebates: 2,
    debate91AdditionalFailuresDetected: false,
    debate13AdditionalFailuresDetected: false,
    sourceFailureDetected: false,
    identityFailureDetected: false,
    isolationFailureDetected: false,
    timeoutFailureDetected: false,
    commandFailureDetected: false,
    scoreBlindnessFailureDetected: false,
    validatorFailureDetected: false
  },
  diagnosticReplay: {
    inMemoryOnly: true,
    persistedCorrectedOutputs: 0,
    originalOutputBytesChanged: false,
    purpose:
      "prove-that-each-preserved-output-has-exactly-one-failed-field-and-all-other-publication-fields-pass",
    debates: [
      {
        debateNumber: "91",
        hypotheticalWritableFields: ["representativeQuotes.con.text"],
        hypotheticalOperation:
          "restore-the-two-omitted-caption-tokens-in-the-selected-source-substring",
        originalQuoteWords: 14,
        exactDiagnosticSourceSubstringWords: 16,
        exactDiagnosticSourceSubstringMatched: true,
        result: replay91
      },
      {
        debateNumber: "13",
        hypotheticalWritableFields: [
          "moveProse.con-consolation-not-truth.critique",
          "moveProse.con-job-terrifying-submission.critique",
          "moveProse.pro-slavery-law-accommodation.critique"
        ],
        hypotheticalOperation:
          "remove-five-surplus-whitespace-delimited-words-across-three-principal-limitation-sentences",
        hypotheticalWordsRemoved: 5,
        result: replay13
      }
    ]
  },
  preservedControls: {
    participantJudgmentWasScoreBlind: true,
    scoresRecalculated: false,
    scoresChanged: false,
    modelAuthoredScores: 0,
    modelContextsExecutedForDiagnosis: 0,
    retries: 0,
    timeoutExtensions: 0,
    correctionModelContexts: 0,
    repairPacketsPrepared: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0,
    publicationCompilationPasses: 0,
    publicationFinalized: false,
    productionMutation: false,
    nextBatchSelected: false
  },
  prospectiveRecoveryOnly: {
    currentlyAuthorized: false,
    repairPacketsPrepared: 0,
    repairPacketMaximumWritableFields: 2,
    proposedRepairPacketCount: 3,
    proposedRepairPackets: [
      {
        debateNumber: "91",
        writableFields: ["representativeQuotes.con.text"],
        writableFieldCount: 1,
        attemptsMaximum: 1,
        retriesMaximum: 0
      },
      {
        debateNumber: "13",
        writableFields: [
          "moveProse.con-consolation-not-truth.critique",
          "moveProse.con-job-terrifying-submission.critique"
        ],
        writableFieldCount: 2,
        attemptsMaximum: 1,
        retriesMaximum: 0
      },
      {
        debateNumber: "13",
        writableFields: [
          "moveProse.pro-slavery-law-accommodation.critique"
        ],
        writableFieldCount: 1,
        attemptsMaximum: 1,
        retriesMaximum: 0
      }
    ],
    proposedModel: {
      label: "5.6 Sol",
      slug: "gpt-5.6-sol",
      reasoningEffort: "low",
      authentication: "ChatGPT subscription"
    },
    requiredAfterRepair: [
      "revalidate-the-complete-debate-91-publication-output",
      "revalidate-the-complete-debate-13-publication-output",
      "replay-the-complete-ten-debate-177-move-cohort-deterministically",
      "retain-compilation-finalization-rendering-production-mutation-and-next-batch-stop-rules"
    ]
  },
  authorization: {
    repairPacketPreparation: false,
    repairModelExecution: false,
    retry: false,
    deterministicCohortReplay: false,
    publicationCompilationPreparation: false,
    deterministicCompilation: false,
    publicationFinalization: false,
    renderingVerification: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  sourceHashes: Object.fromEntries(
    sourcePaths.map((file) => [file, sha256(bytesByPath.get(file))])
  ),
  nextRequiredAction:
    "user-approval-required-before-preparation-of-three-batch-01-publication-resumption-repair-packets-covering-four-failed-fields-and-execution-preparation-manifest-only"
};

const serializedDiagnosis = `${JSON.stringify(diagnosis, null, 2)}\n`;
if (shouldWrite) {
  await writeFile(path.resolve(diagnosisPath), serializedDiagnosis);
} else if (await exists(diagnosisPath)) {
  assertV4(
    String(await readFile(path.resolve(diagnosisPath))) ===
      serializedDiagnosis,
    "the frozen Batch 1 publication-resumption failure diagnosis changed"
  );
}

console.log(
  JSON.stringify(
    {
      status: diagnosis.status,
      failedDebates: diagnosis.preservedGate.failedDebates,
      failedFields: diagnosis.failureBoundary.failedFields.map(
        ({ debateNumber, path: field, failureClass }) => ({
          debateNumber,
          field,
          failureClass
        })
      ),
      failedFieldCount: diagnosis.failureBoundary.failedFieldCount,
      hypotheticalFullReplaysPassed:
        diagnosis.diagnosticReplay.debates.filter(
          ({ result }) => result.status === "passed"
        ).length,
      originalOutputsModified: false,
      repairPacketsPrepared: 0,
      proposedRepairPacketCount:
        diagnosis.prospectiveRecoveryOnly.proposedRepairPacketCount,
      modelContextsExecutedForDiagnosis: 0,
      retries: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
      productionMutation: false,
      nextRequiredAction: diagnosis.nextRequiredAction
    },
    null,
    2
  )
);
