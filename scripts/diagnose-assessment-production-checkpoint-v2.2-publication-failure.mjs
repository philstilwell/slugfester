#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { wordCount } from "./lib/v388-reconstruction.mjs";
import { validateCheckpointV22PublicationOutput } from "./lib/assessment-production-checkpoint-v2.2-publication-validation.mjs";
import { CHECKPOINT_V22_PUBLICATION_ROOT } from "./lib/assessment-production-checkpoint-v2.2-publication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = CHECKPOINT_V22_PUBLICATION_ROOT;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const OUTPUT = `${ROOT}/outputs/debate-50.json`;
const PACKET = `${ROOT}/packets/debate-50.json`;
const VALIDATION = `${ROOT}/validations/debate-50.json`;
const PROVENANCE = `${ROOT}/provenance/debate-50.json`;
const DIAGNOSIS = `${ROOT}/failure-diagnosis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

if (shouldWrite) assertV4(!(await exists(DIAGNOSIS)), `${DIAGNOSIS} already exists`);
const [
  activationBytes,
  executionBytes,
  analysisBytes,
  outputBytes,
  packetBytes,
  validationBytes,
  provenanceBytes
] = await Promise.all(
  [ACTIVATION, EXECUTION, ANALYSIS, OUTPUT, PACKET, VALIDATION, PROVENANCE].map(
    (file) => readFile(path.resolve(file))
  )
);
const activation = JSON.parse(activationBytes);
const execution = JSON.parse(executionBytes);
const analysis = JSON.parse(analysisBytes);
const output = JSON.parse(outputBytes);
const packet = JSON.parse(packetBytes);
const validation = JSON.parse(validationBytes);
const provenance = JSON.parse(provenanceBytes);

assertV4(
  activation.status ===
      "frozen-ten-production-checkpoint-v2.2-publication-contexts-authorized" &&
    execution.status ===
      "production-checkpoint-v2.2-publication-gate-complete-with-failure" &&
    execution.contextsAttempted === 1 &&
    execution.validContexts === 0 &&
    execution.invalidContexts === 1 &&
    execution.retries === 0 &&
    execution.correctionContexts === 0 &&
    execution.modelAuthoredScores === 0 &&
    execution.scorePassesExecutedThisStage === 0 &&
    analysis.status ===
      "production-checkpoint-v2.2-publication-gate-failed-validation" &&
    analysis.authorization?.repairPacketPreparation === false &&
    analysis.authorization?.correctionModelExecution === false &&
    analysis.authorization?.productionMutation === false &&
    analysis.nextAuthorizedAction ===
      "diagnose-production-checkpoint-v2.2-publication-failure-only",
  "the failed publication gate does not authorize diagnosis"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `${file}: frozen source drifted`);
}
const result = execution.results[0];
assertV4(
  result.debateNumber === "50" &&
    result.status === "output-validation-failed" &&
    result.attemptCount === 1 &&
    result.retryCount === 0 &&
    result.correctionContextCount === 0 &&
    result.outputSha256 === sha256(outputBytes) &&
    result.validationSha256 === sha256(validationBytes) &&
    result.provenanceSha256 === sha256(provenanceBytes) &&
    validation.status === "failed" &&
    provenance.outputSha256 === result.outputSha256,
  "the failed operational publication context changed"
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
assertV4(
  JSON.stringify(
    invalidCritiques.map((row) => [row.moveId, row.words, row.excessWordsAboveAcceptanceMaximum])
  ) ===
    JSON.stringify([
      ["pro-gospels-cumulative-reliability", 131, 1],
      ["con-no-replacement-method-burden", 133, 3]
    ]),
  "the publication failure is not the expected two-field word-boundary failure"
);
assertV4(
  critiqueRows.filter((row) => row.characters < 880).length === 0 &&
    critiqueRows.filter((row) => row.sentences !== 4).length === 0 &&
    critiqueRows.filter((row) => !row.orderedLabelsPassed).length === 0 &&
    critiqueRows.filter((row) => !row.terminalPunctuationPassed).length === 0,
  "an additional critique-integrity failure exists"
);

let originalValidationMessage = null;
try {
  validateCheckpointV22PublicationOutput(output, packet);
} catch (error) {
  originalValidationMessage = error.message;
}
assertV4(
  originalValidationMessage ===
    "pro-gospels-cumulative-reliability: critique outside 105–130 words",
  "the original deterministic failure changed"
);

const diagnosticOnly = structuredClone(output);
diagnosticOnly.moveProse["pro-gospels-cumulative-reliability"].critique =
  diagnosticOnly.moveProse["pro-gospels-cumulative-reliability"].critique.replace(
    "several independent-looking",
    "independent-looking"
  );
diagnosticOnly.moveProse["con-no-replacement-method-burden"].critique =
  diagnosticOnly.moveProse["con-no-replacement-method-burden"].critique
    .replace("a complete competing", "a competing")
    .replace("helpful constructive engagement", "constructive engagement")
    .replace("The very strong band", "The strong band");
const hypotheticalReplay = validateCheckpointV22PublicationOutput(
  diagnosticOnly,
  packet
);
assertV4(
  hypotheticalReplay.status === "passed" &&
    hypotheticalReplay.moves === 19 &&
    hypotheticalReplay.critiques === 19 &&
    hypotheticalReplay.minimumCritiqueCharacters >= 880 &&
    hypotheticalReplay.quoteExactSourceMatches === 2 &&
    hypotheticalReplay.calculatedScoresAuthoredByModel === 0 &&
    hypotheticalReplay.lockedScoresUnchanged === true,
  "the diagnostic-only bounded substitution did not isolate the failure"
);

const diagnosis = {
  schemaVersion: "1.0-production-checkpoint-v2.2-publication-failure-diagnosis",
  protocolId: activation.protocolId,
  status:
    "diagnosed-operational-publication-context-two-critique-word-overruns",
  developmentValidationOnly: false,
  productionCanary: true,
  stagingOnly: true,
  failedContext: {
    contextIndex: 0,
    debateNumber: "50",
    debateId: result.debateId,
    elapsedMinutes: Number((result.elapsedMs / 60000).toFixed(2)),
    model: result.model,
    reasoningEffort: result.reasoningEffort,
    authentication: result.authentication,
    attemptCount: 1,
    retryCount: 0,
    correctionContextCount: 0,
    transportPassed: result.commandExitCode === 0 && result.terminationSignal === null,
    outputSha256: result.outputSha256
  },
  rampDisposition: {
    stoppedBeforeExpansion: true,
    contextsAttempted: 1,
    contextsUnattempted: 9,
    unattemptedDebates: execution.unattemptedContextIndexes.map(
      (index) => activation.contexts[index].debateNumber
    ),
    retries: 0,
    correctionContexts: 0
  },
  failureBoundary: {
    failedFields: invalidCritiques.map((row) => ({
      path: `moveProse.${row.moveId}.critique`,
      words: row.words,
      characters: row.characters,
      acceptanceWords: [105, 130],
      targetWords: [112, 118],
      minimumCharacters: 880,
      excessWordsAboveAcceptanceMaximum: row.excessWordsAboveAcceptanceMaximum
    })),
    failedFieldCount: invalidCritiques.length,
    excessWordsTotal: invalidCritiques.reduce(
      (sum, row) => sum + row.excessWordsAboveAcceptanceMaximum,
      0
    ),
    critiquesPassingUnchanged: critiqueRows.length - invalidCritiques.length,
    critiquesWithCharacterFailure: 0,
    critiquesWithSentenceLabelOrPunctuationFailure: 0,
    originalValidationMessage
  },
  diagnosticReplay: {
    persistedCorrectedOutput: false,
    originalOutputModified: false,
    purpose: "prove-all-other-output-fields-pass-after-bounded-in-memory-removal-of-four-excess-words",
    hypotheticalWritableFields: invalidCritiques.map(
      (row) => `moveProse.${row.moveId}.critique`
    ),
    hypotheticalWordsRemoved: 4,
    result: hypotheticalReplay
  },
  preservedControls: {
    participantJudgmentWasScoreBlind: true,
    scoresRecalculated: false,
    scoresChanged: false,
    modelAuthoredScores: 0,
    retries: 0,
    correctionModelContexts: 0,
    meteredApiCostUsd: 0,
    productionMutation: false
  },
  prospectiveRecoveryOnly: {
    currentlyAuthorized: false,
    repairPacketMaximumWritableFields: 2,
    proposedRepairPackets: 1,
    proposedWritableFields: invalidCritiques.map(
      (row) => `moveProse.${row.moveId}.critique`
    ),
    proposedModel: {
      label: "5.6 Sol",
      slug: "gpt-5.6-sol",
      reasoningEffort: "low",
      authentication: "ChatGPT subscription"
    },
    proposedAttemptsMaximum: 1,
    proposedRetriesMaximum: 0,
    requiredAfterRepair: [
      "revalidate-the-complete-debate-50-publication-output",
      "freeze-a-separate-nine-context-resumption-manifest-only-if-debate-50-passes",
      "retain-production-mutation-and-publication-finalization-stop-rules"
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
    productionMutation: false,
    remainingProductionBatches: false
  },
  artifacts: {
    activation: { path: ACTIVATION, sha256: sha256(activationBytes) },
    execution: { path: EXECUTION, sha256: sha256(executionBytes) },
    analysis: { path: ANALYSIS, sha256: sha256(analysisBytes) },
    failedOutput: { path: OUTPUT, sha256: sha256(outputBytes) },
    packet: { path: PACKET, sha256: sha256(packetBytes) },
    validation: { path: VALIDATION, sha256: sha256(validationBytes) },
    provenance: { path: PROVENANCE, sha256: sha256(provenanceBytes) }
  },
  nextRequiredAction:
    "user-decision-on-prospective-one-packet-two-field-repair-and-nine-context-resumption-plan"
};

if (shouldWrite) {
  await writeFile(path.resolve(DIAGNOSIS), `${JSON.stringify(diagnosis, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: diagnosis.status,
      failedFields: diagnosis.failureBoundary.failedFields,
      critiquesPassingUnchanged:
        diagnosis.failureBoundary.critiquesPassingUnchanged,
      hypotheticalFullReplayPassed:
        diagnosis.diagnosticReplay.result.status === "passed",
      persistedCorrectedOutput: false,
      contextsAttempted: 1,
      contextsUnattempted: 9,
      retries: 0,
      correctionContexts: 0,
      modelAuthoredScores: 0,
      productionMutation: false,
      prospectiveRecoveryCurrentlyAuthorized: false,
      nextRequiredAction: diagnosis.nextRequiredAction
    },
    null,
    2
  )
);
