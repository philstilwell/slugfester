#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { wordCount } from "./lib/v388-reconstruction.mjs";
import { validatePostCanaryBatch05PublicationOutput } from "./lib/assessment-production-post-canary-batch-05-publication-validation.mjs";
import { POST_CANARY_BATCH_05_PUBLICATION_ROOT } from "./lib/assessment-production-post-canary-batch-05-publication.mjs";
import {
  POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch05StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-05-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = POST_CANARY_BATCH_05_PUBLICATION_ROOT;
const paths = {
  activation: `${ROOT}/execution-activation.json`,
  execution: `${ROOT}/model-execution.json`,
  analysis: `${ROOT}/analysis.json`,
  output: `${ROOT}/outputs/debate-64.json`,
  packet: `${ROOT}/packets/debate-64.json`,
  validation: `${ROOT}/validations/debate-64.json`,
  provenance: `${ROOT}/provenance/debate-64.json`,
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
const standingAuthorization = await loadAndValidatePostCanaryBatch05StandingAuthorization();

assertV4(
  activation.status === "frozen-ten-post-canary-batch-05-publication-contexts-authorized" &&
    execution.status === "post-canary-batch-05-publication-gate-complete-with-failure" &&
    execution.contextsAttempted === 3 && execution.contextsUnattempted === 7 &&
    execution.validContexts === 2 && execution.invalidContexts === 1 &&
    execution.retries === 0 && execution.timeoutExtensions === 0 &&
    execution.correctionContexts === 0 && execution.modelAuthoredScores === 0 &&
    analysis.status === "post-canary-batch-05-publication-output-gate-failed" &&
    analysis.authorization?.failureDiagnosis === true,
  "the failed Batch 5 publication gate does not authorize diagnosis"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `${file}: frozen source drifted`);
}

const result = execution.results.find((row) => row.contextIndex === 2);
assertV4(
  result?.debateNumber === "64" && result.debateId === "pine-watkins-god-existence-2020" &&
    result.status === "output-validation-failed" && result.attemptCount === 1 &&
    result.retryCount === 0 && result.timeoutExtensionCount === 0 &&
    result.correctionContextCount === 0 && result.outputSha256 === sha256(bytes.output) &&
    result.validationSha256 === sha256(bytes.validation) &&
    result.provenanceSha256 === sha256(bytes.provenance) &&
    validation.status === "failed" && provenance.outputSha256 === result.outputSha256,
  "the preserved Debate 64 failure changed"
);

const quoteField = "representativeQuotes.con.text";
const critiqueField = "moveProse.con-first-cause-identification-gap.critique";
const failedQuote = output.representativeQuotes.con;
const quoteMove = packet.moves.find((move) => move.moveId === failedQuote.sourceMoveId);
const failedCritique = output.moveProse["con-first-cause-identification-gap"].critique.trim();
const critiqueSentences = failedCritique.split(/(?<=[.!?])\s+/).filter(Boolean);
assertV4(
  quoteMove?.moveId === "con-quantifier-shift-in-thomistic-ways" &&
    quoteMove.side === "con" && quoteMove.quoteEligible === true &&
    failedQuote.text === "each student having a counselor with one counselor for all" &&
    !quoteMove.sourceExcerpt.includes(failedQuote.text),
  "the failed Debate 64 quote boundary changed"
);
assertV4(
  wordCount(failedCritique) === 131 && failedCritique.length === 976 &&
    critiqueSentences.length === 4,
  "the failed Debate 64 critique boundary changed"
);

let originalValidationMessage = null;
try { validatePostCanaryBatch05PublicationOutput(output, packet); }
catch (error) { originalValidationMessage = error.message; }
assertV4(originalValidationMessage === "con: quote is not an exact source substring",
  "the original validation failure changed");

const quoteDiagnosticOnly = structuredClone(output);
const diagnosticExactQuote = "there's a single unique counselor for all students";
assertV4(quoteMove.sourceExcerpt.includes(diagnosticExactQuote) && wordCount(diagnosticExactQuote) === 8,
  "the diagnostic exact-source quote changed");
quoteDiagnosticOnly.representativeQuotes.con.text = diagnosticExactQuote;
let secondaryValidationMessage = null;
try { validatePostCanaryBatch05PublicationOutput(quoteDiagnosticOnly, packet); }
catch (error) { secondaryValidationMessage = error.message; }
assertV4(secondaryValidationMessage ===
  "con-first-cause-identification-gap: critique outside 105–130 words",
  "the diagnosed secondary validation category changed");

const fullDiagnosticOnly = structuredClone(quoteDiagnosticOnly);
fullDiagnosticOnly.moveProse["con-first-cause-identification-gap"].critique =
  failedCritique.replace("functions principally as", "functions as");
assertV4(wordCount(fullDiagnosticOnly.moveProse["con-first-cause-identification-gap"].critique) === 130,
  "the diagnostic critique boundary changed");
const hypotheticalReplay = validatePostCanaryBatch05PublicationOutput(fullDiagnosticOnly, packet);
assertV4(
  hypotheticalReplay.status === "passed" && hypotheticalReplay.debateNumber === "64" &&
    hypotheticalReplay.moves === 17 && hypotheticalReplay.critiques === 17 &&
    hypotheticalReplay.minimumCritiqueCharacters >= 880 &&
    hypotheticalReplay.quoteExactSourceMatches === 2 &&
    hypotheticalReplay.overallCommentarySides === 2 && hypotheticalReplay.aiExtensionSides === 2 &&
    hypotheticalReplay.calculatedScoresAuthoredByModel === 0 &&
    hypotheticalReplay.lockedScoresUnchanged === true,
  "the two diagnostic substitutions did not isolate the complete Debate 64 failure"
);

const failedFields = [
  {
    path: quoteField,
    repairType: "representative-quote",
    sourceMoveId: failedQuote.sourceMoveId,
    originalText: failedQuote.text,
    originalWords: wordCount(failedQuote.text),
    exactSourceSubstring: false,
    acceptanceWords: [3, 18]
  },
  {
    path: critiqueField,
    repairType: "critique",
    moveId: "con-first-cause-identification-gap",
    words: 131,
    characters: 976,
    sentences: 4,
    excessWordsAboveAcceptanceMaximum: 1,
    acceptanceWords: [105, 130],
    acceptanceMinimumCharacters: 880
  }
];
const diagnosis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-publication-failure-diagnosis",
  protocolId: activation.protocolId,
  status: "diagnosed-batch-05-debate-64-two-field-publication-validation-failure",
  productionCanary: false,
  batchNumber: 5,
  stagingOnly: true,
  failedContext: {
    contextIndex: 2, debateNumber: "64", debateId: result.debateId,
    elapsedMinutes: Number((result.elapsedMs / 60000).toFixed(2)),
    model: result.model, reasoningEffort: result.reasoningEffort,
    authentication: result.authentication, attemptCount: 1, retryCount: 0,
    timeoutExtensionCount: 0, correctionContextCount: 0,
    transportPassed: result.commandExitCode === 0 && result.terminationSignal === null,
    outputSha256: result.outputSha256
  },
  rampDisposition: {
    stoppedBeforeFurtherExpansion: true, contextsPlanned: 10,
    contextsAttempted: 3, contextsValid: 2, contextsUnattempted: 7,
    unattemptedDebates: execution.unattemptedContextIndexes.map(
      (index) => activation.contexts[index].debateNumber
    ),
    retries: 0, timeoutExtensions: 0, correctionContexts: 0
  },
  failureBoundary: {
    failedFields, failedFieldCount: 2,
    originalValidationMessage, secondaryValidationMessage,
    completeFailureOrderProven: true,
    allOtherFieldsPassedUnderDiagnosticReplay: true
  },
  diagnosticReplay: {
    persistedCorrectedOutput: false, originalOutputModified: false,
    purpose: "prove-all-other-fields-pass-after-two-bounded-in-memory-substitutions",
    hypotheticalWritableFields: [quoteField, critiqueField],
    hypotheticalReplacementContentPersisted: false,
    result: hypotheticalReplay
  },
  preservedControls: {
    participantJudgmentWasScoreBlind: true, scoresRecalculated: false,
    scoresChanged: false, modelAuthoredScores: 0,
    modelContextsExecutedForDiagnosis: 0, retries: 0, correctionModelContexts: 0,
    paidServiceCalls: 0, directIncrementalCostUsd: 0,
    publicationFinalized: false, productionMutation: false
  },
  prospectiveRecoveryOnly: {
    explicitlyAuthorized: true, repairPacketsPrepared: 0,
    proposedRepairPacketCount: 1, maximumWritableFieldsPerPacket: 2,
    proposedWritableFields: [quoteField, critiqueField],
    proposedModel: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low",
      authentication: "ChatGPT subscription" },
    proposedAttemptsMaximum: 1, proposedRetriesMaximum: 0,
    requiredAfterRepair: [
      "merge-only-the-two-accepted-fields-into-the-preserved-debate-64-output",
      "revalidate-the-complete-debate-64-publication-output",
      "freeze-and-resume-only-the-seven-unattempted-publication-contexts",
      "replay-the-complete-ten-debate-publication-cohort"
    ]
  },
  userAuthorization: {
    instruction: "I authorize deterministic diagnosis of the two preserved Debate 64 publication-validation failures and preparation, freezing, activation, and one-time execution of exactly one bounded correction context exposing only representativeQuotes.con.text and moveProse.con-first-cause-identification-gap.critique. Preserve all other publication fields, sources, identities, scores, and accepted outputs unchanged. Use 5.6 Sol with low reasoning through my ChatGPT subscription, one attempt, no retries or timeout extensions, and a direct incremental cost cap of $0. If the correction passes, merge only those two fields, validate Debate 64, resume the seven unattempted frozen Batch 5 publication contexts, replay the complete cohort, commit and push successful checkpoints, and resume the Batch 5 standing authorization. Stop on any further failed or unexpected validation, retry, paid service, protected-field change, or action outside this authorization.",
    directIncrementalCostUsdMaximum: 0
  },
  artifacts: Object.fromEntries(Object.entries(paths)
    .filter(([name]) => name !== "diagnosis")
    .map(([name, file]) => [name, { path: file, sha256: sha256(bytes[name]) }])),
  standingAuthorization: {
    path: POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
    sha256: standingAuthorization.sha256, status: standingAuthorization.record.status
  },
  directIncrementalCostUsd: 0,
  nextRequiredAction: "prepare-one-bounded-two-field-debate-64-publication-repair-packet"
};

const serialized = `${JSON.stringify(diagnosis, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(paths.diagnosis), serialized);
else if (await exists(paths.diagnosis)) assertV4(
  String(await readFile(path.resolve(paths.diagnosis))) === serialized,
  "the frozen Debate 64 publication diagnosis changed"
);
console.log(JSON.stringify({
  status: diagnosis.status, failedFields: [quoteField, critiqueField],
  failedFieldCount: 2, hypotheticalFullReplayPassed: true,
  proposedRepairPacketCount: 1, contextsUnattempted: 7,
  modelContextsExecutedForDiagnosis: 0, directIncrementalCostUsd: 0,
  nextRequiredAction: diagnosis.nextRequiredAction
}, null, 2));
