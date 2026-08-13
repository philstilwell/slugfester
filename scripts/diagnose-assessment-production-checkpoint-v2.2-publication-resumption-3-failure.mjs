#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { wordCount } from "./lib/v388-reconstruction.mjs";
import { validateCheckpointV22PublicationOutput } from "./lib/assessment-production-checkpoint-v2.2-publication-validation.mjs";
import { CHECKPOINT_V22_RESUMPTION_3_ROOT } from "./lib/assessment-production-checkpoint-v2.2-publication-resumption-3.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = CHECKPOINT_V22_RESUMPTION_3_ROOT;
const paths = {
  activation: `${ROOT}/execution-activation.json`,
  execution: `${ROOT}/model-execution.json`,
  analysis: `${ROOT}/analysis.json`,
  output: `${ROOT}/outputs/debate-22.json`,
  packet: "docs/assessment-production/production-checkpoint-v2.2-1/publication-reconstruction/packets/debate-22.json",
  validation: `${ROOT}/validations/debate-22.json`,
  provenance: `${ROOT}/provenance/debate-22.json`,
  diagnosis: `${ROOT}/failure-diagnosis.json`
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
if (shouldWrite) assertV4(!(await exists(paths.diagnosis)), `${paths.diagnosis} already exists`);

const documents = {};
const bytes = {};
for (const [name, file] of Object.entries(paths)) {
  if (name === "diagnosis") continue;
  bytes[name] = await readFile(path.resolve(file));
  documents[name] = JSON.parse(bytes[name]);
}
const { activation, execution, analysis, output, packet, validation, provenance } = documents;
assertV4(
  activation.status === "frozen-publication-resumption-contexts-authorized" &&
    execution.status === "publication-resumption-complete-with-failure" &&
    execution.contextsAttempted === 7 &&
    execution.contextsUnattempted === 0 &&
    execution.validContexts === 6 &&
    execution.invalidContexts === 1 &&
    execution.retries === 0 &&
    execution.correctionContexts === 0 &&
    execution.modelAuthoredScores === 0 &&
    analysis.status === "production-checkpoint-v2.2-publication-resumption-failed-validation" &&
    analysis.authorization.failureDiagnosis === true &&
    analysis.authorization.repairPacketPreparation === false &&
    analysis.authorization.productionMutation === false &&
    analysis.nextAuthorizedAction === "diagnose-generic-publication-resumption-failure-only",
  "failed publication resumption-3 does not authorize this diagnosis"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `${file}: frozen source drifted`);
}

const result = execution.results.find(({ debateNumber }) => debateNumber === "22");
assertV4(
  result?.contextIndex === 3 &&
    result.originalContextIndex === 6 &&
    result.debateId === "turek-hitchens-god-existence-2008" &&
    result.status === "output-validation-failed" &&
    result.attemptCount === 1 &&
    result.retryCount === 0 &&
    result.correctionContextCount === 0 &&
    result.outputSha256 === sha256(bytes.output) &&
    result.validationSha256 === sha256(bytes.validation) &&
    result.provenanceSha256 === sha256(bytes.provenance) &&
    validation.status === "failed" &&
    provenance.outputSha256 === result.outputSha256,
  "failed Debate 22 publication context changed"
);
assertV4(
  execution.results.filter(({ status }) => status === "completed-valid").length === 6 &&
    execution.results.filter(({ status }) => status === "output-validation-failed").length === 1,
  "resumption-3 context disposition changed"
);

const labels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
const critiqueRows = packet.moves.map((move) => {
  const critique = String(output.moveProse[move.moveId].critique).trim();
  const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
  return {
    moveId: move.moveId,
    words: wordCount(critique),
    characters: critique.length,
    sentences: sentences.length,
    orderedLabelsPassed: sentences.length === 4 && sentences.every((sentence, index) => sentence.toLowerCase().startsWith(labels[index])),
    terminalPunctuationPassed: sentences.every((sentence) => /[.!?]["')\]]?$/.test(sentence.trim()))
  };
});
const invalidCritiques = critiqueRows
  .filter((row) =>
    row.words < 105 || row.words > 130 || row.characters < 880 || row.sentences !== 4 ||
    !row.orderedLabelsPassed || !row.terminalPunctuationPassed
  )
  .map((row) => ({ ...row, excessWordsAboveAcceptanceMaximum: Math.max(0, row.words - 130) }));
const expected = [
  ["pro-cosmic-planetary-fine-tuning", 132, 2],
  ["pro-dna-specified-information-design", 135, 5],
  ["pro-reason-mathematics-freedom", 133, 3],
  ["con-autonomy-against-divine-permission", 140, 10],
  ["con-divine-tyranny-against-moral-autonomy", 132, 2],
  ["con-theistic-claimant-burden", 132, 2],
  ["con-designer-christianity-gap", 133, 3],
  ["con-secular-morality-and-religious-crime", 134, 4],
  ["pro-wrongdoing-generic-theism-distinction", 134, 4],
  ["con-evolution-parsimony-against-designer", 132, 2],
  ["con-dna-design-underdetermination", 132, 2],
  ["pro-resurrection-christian-evidence-bridge", 134, 4],
  ["con-secular-sacrifice-without-reward", 133, 3]
];
assertV4(
  JSON.stringify(invalidCritiques.map((row) => [row.moveId, row.words, row.excessWordsAboveAcceptanceMaximum])) === JSON.stringify(expected),
  "Debate 22 failure is not the expected thirteen-field word-boundary failure"
);
assertV4(
  critiqueRows.every((row) => row.characters >= 880 && row.sentences === 4 && row.orderedLabelsPassed && row.terminalPunctuationPassed),
  "an additional critique-integrity failure exists"
);
let originalValidationMessage = null;
try {
  validateCheckpointV22PublicationOutput(output, packet);
} catch (error) {
  originalValidationMessage = error.message;
}
assertV4(originalValidationMessage === "pro-cosmic-planetary-fine-tuning: critique outside 105–130 words", "original deterministic failure changed");

// This copy is never written. Removing only surplus whitespace-delimited words proves
// that the thirteen listed critique fields are the complete failure boundary.
const diagnosticOnly = structuredClone(output);
for (const row of invalidCritiques) {
  const sentences = diagnosticOnly.moveProse[row.moveId].critique.trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  while (wordCount(sentences.join(" ")) > 130) {
    const tokens = sentences[1].split(/\s+/);
    assertV4(tokens.length > 6, `${row.moveId}: diagnostic sentence cannot be shortened safely`);
    tokens.splice(tokens.length - 2, 1);
    sentences[1] = tokens.join(" ");
  }
  diagnosticOnly.moveProse[row.moveId].critique = sentences.join(" ");
}
const hypotheticalReplay = validateCheckpointV22PublicationOutput(diagnosticOnly, packet);
assertV4(
  hypotheticalReplay.status === "passed" &&
    hypotheticalReplay.moves === 19 &&
    hypotheticalReplay.critiques === 19 &&
    hypotheticalReplay.minimumCritiqueCharacters >= 880 &&
    hypotheticalReplay.quoteExactSourceMatches === 2 &&
    hypotheticalReplay.calculatedScoresAuthoredByModel === 0 &&
    hypotheticalReplay.lockedScoresUnchanged === true,
  "diagnostic-only substitutions did not isolate the Debate 22 failure"
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
const repairPackets = [];
for (let index = 0; index < failedFields.length; index += 2) {
  const fields = failedFields.slice(index, index + 2);
  repairPackets.push({
    packetIndex: repairPackets.length,
    writableFields: fields.map(({ path: field }) => field),
    writableFieldCount: fields.length,
    attemptsMaximum: 1,
    retriesMaximum: 0
  });
}
const excessWordsTotal = failedFields.reduce((sum, field) => sum + field.excessWordsAboveAcceptanceMaximum, 0);
assertV4(excessWordsTotal === 46 && repairPackets.length === 7, "prospective Debate 22 repair partition changed");

const diagnosis = {
  schemaVersion: "1.0-production-checkpoint-v2.2-publication-resumption-3-failure-diagnosis",
  protocolId: activation.protocolId,
  status: "diagnosed-resumption-3-steady-context-thirteen-critique-word-overruns",
  developmentValidationOnly: false,
  productionCanary: true,
  stagingOnly: true,
  failedContext: {
    contextIndex: 3,
    originalContextIndex: 6,
    debateNumber: "22",
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
    stoppedBeforeExpansion: false,
    independentContextsContinuedAfterFailure: true,
    contextsAttempted: 7,
    contextsValid: 6,
    contextsInvalid: 1,
    contextsUnattempted: 0,
    acceptedDebatesThisResumption: execution.results.filter(({ status }) => status === "completed-valid").map(({ debateNumber }) => debateNumber),
    retries: 0,
    correctionContexts: 0
  },
  failureBoundary: {
    failedFields,
    failedFieldCount: failedFields.length,
    excessWordsTotal,
    critiquesPassingUnchanged: critiqueRows.length - failedFields.length,
    critiquesWithCharacterFailure: 0,
    critiquesWithSentenceLabelOrPunctuationFailure: 0,
    originalValidationMessage
  },
  diagnosticReplay: {
    persistedCorrectedOutput: false,
    originalOutputModified: false,
    purpose: "prove-all-other-output-fields-pass-after-bounded-in-memory-removal-of-forty-six-excess-words",
    hypotheticalWritableFields: failedFields.map(({ path: field }) => field),
    hypotheticalWordsRemoved: excessWordsTotal,
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
    proposedRepairPackets: repairPackets,
    proposedModel: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low", authentication: "ChatGPT subscription" },
    proposedAttemptsMaximumPerPacket: 1,
    proposedRetriesMaximum: 0,
    requiredAfterRepair: [
      "revalidate-the-complete-debate-22-publication-output",
      "replay-the-complete-ten-debate-188-move-cohort-deterministically",
      "retain-deterministic-compilation-publication-finalization-rendering-and-production-mutation-stop-rules"
    ]
  },
  authorization: {
    repairPacketPreparation: false,
    repairModelExecution: false,
    retry: false,
    deterministicCohortReplay: false,
    deterministicCompilation: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  artifacts: Object.fromEntries(
    Object.entries(paths)
      .filter(([name]) => name !== "diagnosis")
      .map(([name, file]) => [name, { path: file, sha256: sha256(bytes[name]) }])
  ),
  nextRequiredAction: "user-decision-on-prospective-seven-packet-thirteen-field-debate-22-repair-and-complete-cohort-revalidation-plan"
};
if (shouldWrite) await writeFile(path.resolve(paths.diagnosis), `${JSON.stringify(diagnosis, null, 2)}\n`);
console.log(JSON.stringify({
  status: diagnosis.status,
  failedFields: diagnosis.failureBoundary.failedFields,
  critiquesPassingUnchanged: diagnosis.failureBoundary.critiquesPassingUnchanged,
  proposedRepairPackets: repairPackets,
  hypotheticalFullReplayPassed: hypotheticalReplay.status === "passed",
  persistedCorrectedOutput: false,
  contextsAttempted: 7,
  contextsValid: 6,
  contextsInvalid: 1,
  contextsUnattempted: 0,
  retries: 0,
  correctionContexts: 0,
  modelAuthoredScores: 0,
  productionMutation: false,
  prospectiveRecoveryCurrentlyAuthorized: false,
  nextRequiredAction: diagnosis.nextRequiredAction
}, null, 2));
