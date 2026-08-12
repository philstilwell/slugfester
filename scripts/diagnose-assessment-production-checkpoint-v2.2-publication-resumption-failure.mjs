#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { wordCount } from "./lib/v388-reconstruction.mjs";
import { validateCheckpointV22PublicationOutput } from "./lib/assessment-production-checkpoint-v2.2-publication-validation.mjs";
import { CHECKPOINT_V22_RESUMPTION_ROOT } from "./lib/assessment-production-checkpoint-v2.2-publication-resumption.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = CHECKPOINT_V22_RESUMPTION_ROOT;
const paths = {
  activation: `${ROOT}/execution-activation.json`,
  execution: `${ROOT}/model-execution.json`,
  analysis: `${ROOT}/analysis.json`,
  output: `${ROOT}/outputs/debate-192.json`,
  packet: "docs/assessment-production/production-checkpoint-v2.2-1/publication-reconstruction/packets/debate-192.json",
  validation: `${ROOT}/validations/debate-192.json`,
  provenance: `${ROOT}/provenance/debate-192.json`,
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
  activation.status === "frozen-nine-untouched-production-checkpoint-v2.2-publication-contexts-authorized" &&
    execution.status === "production-checkpoint-v2.2-publication-resumption-complete-with-failure" &&
    execution.contextsAttempted === 1 &&
    execution.contextsUnattempted === 8 &&
    execution.validContexts === 0 &&
    execution.invalidContexts === 1 &&
    execution.retries === 0 &&
    execution.correctionContexts === 0 &&
    execution.modelAuthoredScores === 0 &&
    analysis.status === "production-checkpoint-v2.2-publication-resumption-failed-validation" &&
    analysis.authorization.failureDiagnosis === true &&
    analysis.authorization.repairPacketPreparation === false &&
    analysis.authorization.productionMutation === false &&
    analysis.nextAuthorizedAction === "diagnose-production-checkpoint-v2.2-publication-resumption-failure-only",
  "failed publication resumption does not authorize this diagnosis"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `${file}: frozen source drifted`);
}
const result = execution.results[0];
assertV4(
  result.debateNumber === "192" &&
    result.contextIndex === 0 &&
    result.originalContextIndex === 1 &&
    result.status === "output-validation-failed" &&
    result.attemptCount === 1 &&
    result.retryCount === 0 &&
    result.correctionContextCount === 0 &&
    result.outputSha256 === sha256(bytes.output) &&
    result.validationSha256 === sha256(bytes.validation) &&
    result.provenanceSha256 === sha256(bytes.provenance) &&
    validation.status === "failed" &&
    provenance.outputSha256 === result.outputSha256,
  "failed Debate 192 publication context changed"
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
  ["pro-probability-needs-pathway", 133, 3],
  ["pro-receding-explanatory-target", 132, 2],
  ["pro-cumulative-unfavorable-steps", 132, 2],
  ["con-independent-origin-falsifier", 131, 1],
  ["pro-recurrence-without-mechanism", 131, 1],
  ["pro-laboratory-work-not-pathway", 132, 2],
  ["con-chemical-nonzero-possibility", 131, 1]
];
assertV4(
  JSON.stringify(invalidCritiques.map((row) => [row.moveId, row.words, row.excessWordsAboveAcceptanceMaximum])) === JSON.stringify(expected),
  "Debate 192 failure is not the expected seven-field word-boundary failure"
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
assertV4(originalValidationMessage === "pro-probability-needs-pathway: critique outside 105–130 words", "original deterministic failure changed");

const diagnosticOnly = structuredClone(output);
const diagnosticReplacements = {
  "pro-probability-needs-pathway": [["chemically meaningful", "meaningful"], ["molecular formation", "formation"], ["deliberately cautious", "cautious"]],
  "pro-receding-explanatory-target": [["actual explanatory", "explanatory"], ["stable historical", "historical"]],
  "pro-cumulative-unfavorable-steps": [["isolated reaction", "reaction"], ["bare nonzero", "nonzero"]],
  "con-independent-origin-falsifier": [["carefully requiring", "requiring"]],
  "pro-recurrence-without-mechanism": [["precise and charitable", "charitable"]],
  "pro-laboratory-work-not-pathway": [["important pathway-continuity", "pathway-continuity"], ["genuine partial", "partial"]],
  "con-chemical-nonzero-possibility": [["Finite nonzero", "Nonzero"]]
};
for (const [moveId, replacements] of Object.entries(diagnosticReplacements)) {
  for (const [before, after] of replacements) {
    assertV4(diagnosticOnly.moveProse[moveId].critique.includes(before), `${moveId}: diagnostic phrase missing`);
    diagnosticOnly.moveProse[moveId].critique = diagnosticOnly.moveProse[moveId].critique.replace(before, after);
  }
}
const hypotheticalReplay = validateCheckpointV22PublicationOutput(diagnosticOnly, packet);
assertV4(
  hypotheticalReplay.status === "passed" &&
    hypotheticalReplay.moves === 16 &&
    hypotheticalReplay.critiques === 16 &&
    hypotheticalReplay.minimumCritiqueCharacters >= 880 &&
    hypotheticalReplay.quoteExactSourceMatches === 2 &&
    hypotheticalReplay.calculatedScoresAuthoredByModel === 0 &&
    hypotheticalReplay.lockedScoresUnchanged === true,
  "diagnostic-only substitutions did not isolate the Debate 192 failure"
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
  repairPackets.push({
    packetIndex: repairPackets.length,
    writableFields: failedFields.slice(index, index + 2).map(({ path: field }) => field),
    writableFieldCount: failedFields.slice(index, index + 2).length,
    attemptsMaximum: 1,
    retriesMaximum: 0
  });
}
const diagnosis = {
  schemaVersion: "1.0-production-checkpoint-v2.2-publication-resumption-failure-diagnosis",
  protocolId: activation.protocolId,
  status: "diagnosed-resumption-operational-context-seven-critique-word-overruns",
  developmentValidationOnly: false,
  productionCanary: true,
  stagingOnly: true,
  failedContext: {
    contextIndex: 0,
    originalContextIndex: 1,
    debateNumber: "192",
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
    contextsUnattempted: 8,
    unattemptedDebates: execution.unattemptedContextIndexes.map((index) => activation.contexts[index].debateNumber),
    retries: 0,
    correctionContexts: 0
  },
  failureBoundary: {
    failedFields,
    failedFieldCount: failedFields.length,
    excessWordsTotal: failedFields.reduce((sum, field) => sum + field.excessWordsAboveAcceptanceMaximum, 0),
    critiquesPassingUnchanged: critiqueRows.length - failedFields.length,
    critiquesWithCharacterFailure: 0,
    critiquesWithSentenceLabelOrPunctuationFailure: 0,
    originalValidationMessage
  },
  diagnosticReplay: {
    persistedCorrectedOutput: false,
    originalOutputModified: false,
    purpose: "prove-all-other-output-fields-pass-after-bounded-in-memory-removal-of-twelve-excess-words",
    hypotheticalWritableFields: failedFields.map(({ path: field }) => field),
    hypotheticalWordsRemoved: 12,
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
      "revalidate-the-complete-debate-192-publication-output",
      "freeze-a-separate-eight-context-resumption-manifest-only-if-debate-192-passes",
      "retain-production-mutation-and-publication-finalization-stop-rules"
    ]
  },
  authorization: {
    repairPacketPreparation: false,
    repairModelExecution: false,
    eightContextResumption: false,
    retry: false,
    deterministicCompilation: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  artifacts: Object.fromEntries(Object.entries(paths).filter(([name]) => name !== "diagnosis").map(([name, file]) => [name, { path: file, sha256: sha256(bytes[name]) }])),
  nextRequiredAction: "user-decision-on-prospective-four-packet-seven-field-debate-192-repair-and-eight-context-resumption-plan"
};
if (shouldWrite) await writeFile(path.resolve(paths.diagnosis), `${JSON.stringify(diagnosis, null, 2)}\n`);
console.log(JSON.stringify({
  status: diagnosis.status,
  failedFields: diagnosis.failureBoundary.failedFields,
  critiquesPassingUnchanged: diagnosis.failureBoundary.critiquesPassingUnchanged,
  proposedRepairPackets: repairPackets,
  hypotheticalFullReplayPassed: hypotheticalReplay.status === "passed",
  persistedCorrectedOutput: false,
  contextsAttempted: 1,
  contextsUnattempted: 8,
  retries: 0,
  correctionContexts: 0,
  modelAuthoredScores: 0,
  productionMutation: false,
  prospectiveRecoveryCurrentlyAuthorized: false,
  nextRequiredAction: diagnosis.nextRequiredAction
}, null, 2));
