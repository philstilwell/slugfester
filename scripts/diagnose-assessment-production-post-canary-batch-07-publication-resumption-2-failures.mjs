#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validatePostCanaryBatch07PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-07-publication-validation.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires ISO");

const PUBLICATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-07/publication-reconstruction";
const ROOT = `${PUBLICATION_ROOT}/resumption-2`;
const DIAGNOSIS = `${ROOT}/failure-diagnosis.json`;
const PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const SCRIPT =
  "scripts/diagnose-assessment-production-post-canary-batch-07-publication-resumption-2-failures.mjs";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(!(await exists(DIAGNOSIS)), `${DIAGNOSIS} already exists`);

const debateFiles = (debate) => ({
  output: `${ROOT}/outputs/debate-${debate}.json`,
  validation: `${ROOT}/validations/debate-${debate}.json`,
  provenance: `${ROOT}/provenance/debate-${debate}.json`,
  packet: `${PUBLICATION_ROOT}/packets/debate-${debate}.json`
});
const filesByDebate = Object.fromEntries(["121", "100", "78"].map((debate) =>
  [debate, debateFiles(debate)]));
const files = [PREPARATION, ACTIVATION, EXECUTION, ANALYSIS, SCRIPT,
  ...Object.values(filesByDebate).flatMap(Object.values)];
const bytes = Object.fromEntries(await Promise.all(files.map(async (file) =>
  [file, await readFile(path.resolve(file))])));
const parsed = (file) => JSON.parse(bytes[file]);
const activation = parsed(ACTIVATION);
const execution = parsed(EXECUTION);
const analysis = parsed(ANALYSIS);

assertV4(
  execution.status === "post-canary-batch-07-publication-resumption-2-complete-with-failure" &&
    execution.contextsPlanned === 8 && execution.contextsAttempted === 3 &&
    execution.contextsUnattempted === 5 && execution.validContexts === 1 &&
    execution.invalidContexts === 2 && execution.attempts === 3 &&
    execution.retries === 0 && execution.timeoutExtensions === 0 &&
    canonicalJson(execution.unattemptedContextIndexes) === canonicalJson([3, 4, 5, 6, 7]) &&
    analysis.status === "post-canary-batch-07-publication-resumption-2-failed-validation" &&
    analysis.gate?.timingPass === true,
  "the preserved two-failure resumption boundary changed"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `${file}: frozen resumption source drifted`);
}
const result121 = execution.results.find(({ debateNumber }) => debateNumber === "121");
assertV4(result121?.gateAcceptancePassed === true &&
  result121.outputSha256 === sha256(bytes[filesByDebate["121"].output]) &&
  validatePostCanaryBatch07PublicationOutput(parsed(filesByDebate["121"].output),
    parsed(filesByDebate["121"].packet)).status === "passed",
"the accepted Debate 121 output changed");

const expected = {
  "100": [
    ["con-rejection-needs-no-rival-explanation", 134],
    ["con-generic-foundation-lacks-divine-content", 133],
    ["pro-consciousness-with-reduced-or-absent-brains", 134],
    ["pro-top-down-mental-causation", 131],
    ["pro-convergent-indirect-inference", 131],
    ["pro-objects-as-properties-and-information", 131],
    ["pro-brainless-mind-idealist-account", 131]
  ],
  "78": [
    ["con-pauline-vision-underdetermination", 131],
    ["pro-paul-transformed-tangible-body", 136],
    ["con-pauline-secondhand-witness-reports", 137],
    ["con-unavailable-source-copying-uncertainty", 138],
    ["con-gospel-compositional-delay-and-sources", 138],
    ["pro-gospel-patristic-source-convergence", 139],
    ["con-preconciliar-christian-plurality", 136],
    ["con-winner-preservation-bias", 137],
    ["con-selective-hostile-source-survival", 137],
    ["pro-limited-spread-does-not-defeat-identification", 139],
    ["con-jewish-sect-and-syrian-divergence", 137],
    ["pro-syriac-roman-substantive-convergence", 138],
    ["pro-apostolic-church-shared-core", 133],
    ["pro-reform-versus-doctrinal-departure", 136],
    ["pro-catholic-orthodox-theological-compatibility", 136]
  ]
};
const labels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
const diagnoses = [];
for (const debate of ["100", "78"]) {
  const paths = filesByDebate[debate];
  const output = parsed(paths.output);
  const packet = parsed(paths.packet);
  const validation = parsed(paths.validation);
  const result = execution.results.find(({ debateNumber }) => debateNumber === debate);
  assertV4(result?.status === "output-validation-failed" &&
    result.gateAcceptancePassed === false && validation.status === "failed" &&
    result.outputSha256 === sha256(bytes[paths.output]) &&
    validation.outputSha256 === result.outputSha256,
  `Debate ${debate}: preserved failure changed`);
  const rows = packet.moves.map(({ moveId }) => {
    const critique = output.moveProse?.[moveId]?.critique;
    assertV4(typeof critique === "string", `Debate ${debate} ${moveId}: critique missing`);
    const words = wordCount(critique);
    const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
    return { moveId, path: `moveProse.${moveId}.critique`, words,
      characters: critique.length, sentences: sentences.length,
      orderedLabelsPassed: sentences.length === 4 && labels.every((label, index) =>
        sentences[index].toLowerCase().startsWith(label)),
      terminalPunctuationPassed: sentences.length === 4 && sentences.every((sentence) =>
        /[.!?]["')\]]?$/.test(sentence.trim())),
      excessWordsAboveAcceptanceMaximum: Math.max(0, words - 130) };
  });
  const failedFields = rows.filter(({ words }) => words > 130);
  assertV4(canonicalJson(failedFields.map(({ moveId, words }) => [moveId, words])) ===
    canonicalJson(expected[debate]), `Debate ${debate}: exact failure inventory changed`);
  assertV4(failedFields.every((row) => row.characters >= 880 && row.sentences === 4 &&
    row.orderedLabelsPassed && row.terminalPunctuationPassed),
  `Debate ${debate}: unexpected critique validation category`);
  for (const side of ["pro", "con"]) {
    const quote = output.representativeQuotes[side];
    const move = packet.moves.find(({ moveId }) => moveId === quote.sourceMoveId);
    assertV4(move?.sourceExcerpt.includes(quote.text),
      `Debate ${debate}: unexpected representative quote failure`);
  }
  const diagnosticCopy = structuredClone(output);
  let hypotheticalWordsRemoved = 0;
  for (const field of failedFields) {
    const sentences = diagnosticCopy.moveProse[field.moveId].critique
      .split(/(?<=[.!?])\s+/).filter(Boolean);
    while (wordCount(sentences.join(" ")) > 130) {
      const words = sentences[1].split(/\s+/);
      words.splice(words.length - 2, 1);
      sentences[1] = words.join(" ");
      hypotheticalWordsRemoved += 1;
    }
    diagnosticCopy.moveProse[field.moveId].critique = sentences.join(" ");
  }
  const diagnosticReplay = validatePostCanaryBatch07PublicationOutput(diagnosticCopy, packet);
  assertV4(diagnosticReplay.status === "passed",
    `Debate ${debate}: in-memory diagnostic replay failed`);
  diagnoses.push({ debateNumber: debate, failedFieldCount: failedFields.length,
    validMoveProseEntries: rows.length - failedFields.length,
    failedFields, excessWordsTotal: hypotheticalWordsRemoved,
    minimumRepairPacketCountAtTwoFieldsMaximum: Math.ceil(failedFields.length / 2),
    diagnosticReplay: { transientCopyOnly: true, originalOutputModified: false,
      persistedCorrectedOutput: false, validatorUnchanged: true,
      hypotheticalWordsRemoved, result: diagnosticReplay } });
}
assertV4(diagnoses[0].failedFieldCount === 7 && diagnoses[0].excessWordsTotal === 15 &&
  diagnoses[1].failedFieldCount === 15 && diagnoses[1].excessWordsTotal === 98,
"the combined critique-overrun boundary changed");

const diagnosis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-07-publication-resumption-2-failure-diagnosis",
  status: "frozen-diagnosed-batch-07-debates-100-and-78-critique-overruns-stop-rule-triggered",
  frozenAt, productionCanary: false, batchNumber: 7, stagingOnly: true,
  classification: "two-complete-rejected-publication-outputs-with-only-critique-word-boundary-failures",
  preservedExecution: { contextsPlanned: 8, contextsAttempted: 3,
    contextsAccepted: 1, contextsRejected: 2, contextsUnattempted: 5,
    acceptedDebates: ["193", "80", "121"], rejectedDebates: ["100", "78"],
    unattemptedDebates: ["113", "180", "02", "182", "56"],
    attempts: 3, retries: 0, timeoutExtensions: 0 },
  debates: diagnoses,
  totals: { failedFields: 22, excessWords: 113,
    minimumRepairPacketsAtTwoFieldsMaximum: 12, modelContextsExecuted: 3,
    paidServiceCalls: 0, directIncrementalCostUsd: 0 },
  underlyingProblemHistory: {
    category: "publication-critique-exceeds-130-word-maximum",
    priorAffectedContexts: ["193", "80"],
    newlyAffectedContexts: ["100", "78"],
    thirdFailureOfSameUnderlyingProblemReachedAt: "100",
    fourthFailureOfSameUnderlyingProblemReachedAt: "78",
    standingAuthorizationStopRule: "thirdFailureOfSameUnderlyingProblemBlocks",
    stopRuleTriggered: true
  },
  protectedEvidence: { completeRejectedOutputsPreserved: true,
    acceptedDebate121Preserved: true, acceptedDebates193And80Preserved: true,
    fiveUnattemptedContextsPreserved: true, packetsAndSchemasPreserved: true,
    sourcesIdentitiesAndScoresPreserved: true, validatorUnchanged: true,
    modelAuthoredScores: 0 },
  sourceHashes: Object.fromEntries(files.sort().map((file) => [file, sha256(bytes[file])])),
  authorization: { diagnosis: true, repairPacketPreparation: false,
    repairModelExecution: false, unattemptedContextResumption: false,
    publicationCompilation: false, paidServices: false,
    productionMutation: false, nextBatchSelection: false },
  approvalRequired: {
    reason: "The frozen Batch 7 standing authorization requires a stop at the third failure of the same underlying problem.",
    minimumProposedException: "Authorize one bounded exception to prepare and execute four Debate 100 and eight Debate 78 field-disjoint repair packets, at most two critique fields per packet, followed by complete validation and resumption of exactly five untouched contexts.",
    directIncrementalCostUsdMaximum: 0,
    model: "5.6 Sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    attemptsPerNewContext: 1,
    retries: 0,
    timeoutExtensions: 0
  },
  nextRequiredAction: "obtain-user-approval-for-third-failure-stop-rule-exception"
};
if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(DIAGNOSIS)), { recursive: true });
  await writeFile(path.resolve(DIAGNOSIS), `${JSON.stringify(diagnosis, null, 2)}\n`);
}
console.log(JSON.stringify({ status: diagnosis.status,
  failedDebates: ["100", "78"], failedFields: 22, excessWords: 113,
  minimumRepairPackets: 12, stopRuleTriggered: true,
  modelContextsExecuted: 3, paidServiceCalls: 0, directIncrementalCostUsd: 0,
  nextRequiredAction: diagnosis.nextRequiredAction }, null, 2));
