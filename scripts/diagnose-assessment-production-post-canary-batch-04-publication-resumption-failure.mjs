#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validatePostCanaryBatch04PublicationOutput } from "./lib/assessment-production-post-canary-batch-04-publication-validation.mjs";
import {
  POST_CANARY_BATCH_04_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch04StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-04-standing-authorization.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/publication-reconstruction/resumption-1";
const paths = {
  activation: `${ROOT}/execution-activation.json`,
  execution: `${ROOT}/model-execution.json`,
  analysis: `${ROOT}/analysis.json`,
  output: `${ROOT}/outputs/debate-49.json`,
  packet:
    "docs/assessment-production/post-canary-continuation-v1/batch-04/publication-reconstruction/packets/debate-49.json",
  validation: `${ROOT}/validations/debate-49.json`,
  provenance: `${ROOT}/provenance/debate-49.json`,
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
const standing = await loadAndValidatePostCanaryBatch04StandingAuthorization();
const { activation, execution, analysis, output, packet, validation, provenance } = documents;

assertV4(
  activation.status ===
      "frozen-nine-untouched-post-canary-batch-04-publication-resumption-contexts-authorized-under-standing-authorization" &&
    execution.status ===
      "post-canary-batch-04-publication-resumption-complete-with-failure" &&
    execution.contextsPlanned === 9 &&
    execution.contextsAttempted === 3 &&
    execution.contextsUnattempted === 6 &&
    execution.validContexts === 2 &&
    execution.invalidContexts === 1 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.correctionContexts === 0 &&
    analysis.status ===
      "post-canary-batch-04-publication-resumption-failed-validation" &&
    analysis.nextAuthorizedAction ===
      "diagnose-batch-04-publication-resumption-failure-under-standing-authorization" &&
    activation.userAuthorization?.standingAuthorization ===
      POST_CANARY_BATCH_04_STANDING_AUTHORIZATION &&
    activation.userAuthorization?.standingAuthorizationSha256 === standing.sha256,
  "the preserved Batch 4 resumption failure changed"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `${file}: frozen resumption source drifted`
  );
}

const result = execution.results.find((row) => row.debateNumber === "49");
assertV4(
  result?.contextIndex === 2 &&
    result.originalContextIndex === 3 &&
    result.status === "output-validation-failed" &&
    result.attemptCount === 1 &&
    result.retryCount === 0 &&
    result.timeoutExtensionCount === 0 &&
    result.correctionContextCount === 0 &&
    result.commandExitCode === 0 &&
    result.terminationSignal === null &&
    result.gateAcceptancePassed === false &&
    result.outputSha256 === sha256(bytes.output) &&
    result.validationSha256 === sha256(bytes.validation) &&
    result.provenanceSha256 === sha256(bytes.provenance) &&
    validation.status === "failed" &&
    provenance.outputSha256 === result.outputSha256,
  "the preserved Debate 49 failure artifacts changed"
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
  ["pro-theism-worldview-coherence", 132, 2],
  ["con-god-guarantor-assumes-foundation", 135, 5],
  ["con-reliability-parsimony-justify-use", 132, 2],
  ["pro-personal-god-unifies-categories", 133, 3],
  ["con-fallible-proportioned-confidence", 139, 9],
  ["pro-transcendentals-maximal-certainty", 136, 6],
  ["pro-coherentist-web-no-arbitrary-stop", 143, 13],
  ["con-reductio-must-exhaust-alternatives", 139, 9],
  ["con-divine-logic-dilemma", 142, 12],
  ["con-perfect-ground-fallible-access", 140, 10],
  ["pro-induction-pragmatic-circularity", 140, 10],
  ["con-use-without-causal-explanation", 141, 11],
  ["con-atheism-nonbelief-burden", 138, 8],
  ["pro-skeptical-neutrality-commitments", 142, 12],
  ["con-logic-describes-invariant-relations", 136, 6],
  ["con-explicit-form-required", 136, 6],
  ["pro-denial-dependent-positive-proof", 140, 10],
  ["pro-logic-reflects-divine-mind", 140, 10],
  ["pro-knowledge-requires-god", 132, 2],
  ["con-divine-guarantee-unnecessary-step", 141, 11],
  ["pro-logic-divine-energies", 137, 7],
  ["con-secular-moral-reasoning", 139, 9]
];
assertV4(
  canonicalJson(
    invalidCritiques.map((row) => [
      row.moveId,
      row.words,
      row.excessWordsAboveAcceptanceMaximum
    ])
  ) === canonicalJson(expected),
  "the Debate 49 critique-overrun boundary changed"
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

const noveltyRows = [];
for (const side of ["pro", "con"]) {
  const extension = output.aiExtension[side];
  for (const item of [
    extension.thesis,
    ...extension.premises,
    extension.conclusion,
    ...extension.newArguments
  ]) {
    noveltyRows.push({
      side,
      id: item.id,
      words: wordCount(item.novelty.explanation),
      characters: item.novelty.explanation.length
    });
  }
}
assertV4(
  noveltyRows.every((row) => row.words >= 8),
  "an additional AI-extension novelty failure exists"
);

let originalValidationMessage = null;
try {
  validatePostCanaryBatch04PublicationOutput(output, packet);
} catch (error) {
  originalValidationMessage = error.message;
}
assertV4(
  originalValidationMessage ===
    "pro-theism-worldview-coherence: critique outside 105–130 words",
  "the original deterministic validation message changed"
);

// This copy is never written. Boundary-only token removals prove that every
// other preserved output field passes the complete validator.
const diagnosticOnly = structuredClone(output);
let hypotheticalWordsRemoved = 0;
for (const row of invalidCritiques) {
  const sentences = diagnosticOnly.moveProse[row.moveId].critique
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
  while (wordCount(sentences.join(" ")) > 130) {
    const tokens = sentences[1].split(/\s+/);
    assertV4(tokens.length > 6, `${row.moveId}: diagnostic shortening failed`);
    tokens.splice(tokens.length - 2, 1);
    sentences[1] = tokens.join(" ");
    hypotheticalWordsRemoved += 1;
  }
  diagnosticOnly.moveProse[row.moveId].critique = sentences.join(" ");
}
assertV4(hypotheticalWordsRemoved === 173, "diagnostic word boundary changed");
const hypotheticalReplay = validatePostCanaryBatch04PublicationOutput(
  diagnosticOnly,
  packet
);
assertV4(
  hypotheticalReplay.status === "passed" &&
    hypotheticalReplay.moves === 24 &&
    hypotheticalReplay.critiques === 24 &&
    hypotheticalReplay.minimumCritiqueCharacters >= 880 &&
    hypotheticalReplay.quoteExactSourceMatches === 2 &&
    hypotheticalReplay.overallCommentarySides === 2 &&
    hypotheticalReplay.aiExtensionSides === 2 &&
    hypotheticalReplay.calculatedScoresAuthoredByModel === 0 &&
    hypotheticalReplay.lockedScoresUnchanged === true,
  "the in-memory boundary substitutions did not isolate the failure"
);

const failedFields = invalidCritiques.map((row) => ({
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
  excessWordsAboveAcceptanceMaximum: row.excessWordsAboveAcceptanceMaximum
}));
const proposedRepairPartition = [];
for (let index = 0; index < failedFields.length; index += 2) {
  proposedRepairPartition.push(
    failedFields.slice(index, index + 2).map(({ path: field }) => field)
  );
}
assertV4(
  proposedRepairPartition.length === 11 &&
    proposedRepairPartition.every((fields) => fields.length === 2) &&
    proposedRepairPartition.flat().length === 22,
  "the minimum field-disjoint repair partition changed"
);

const sourceHashes = {};
for (const file of [
  paths.activation,
  paths.execution,
  paths.analysis,
  paths.output,
  paths.packet,
  paths.validation,
  paths.provenance,
  POST_CANARY_BATCH_04_STANDING_AUTHORIZATION,
  "scripts/diagnose-assessment-production-post-canary-batch-04-publication-resumption-failure.mjs",
  "scripts/lib/assessment-production-post-canary-batch-04-publication-validation.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/v388-reconstruction.mjs"
]) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}

const diagnosis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-04-publication-resumption-failure-diagnosis",
  protocolId: activation.protocolId,
  status:
    "diagnosed-batch-04-debate-49-twenty-two-critique-word-overruns",
  productionCanary: false,
  batchNumber: 4,
  stagingOnly: true,
  preservedGate: {
    contextsPlanned: 9,
    contextsAttempted: 3,
    contextsValid: 2,
    contextsInvalid: 1,
    contextsUnattempted: 6,
    acceptedDebates: ["127", "67", "85"],
    failedDebates: ["49"],
    unattemptedDebates: ["186", "81", "148", "47", "03", "185"],
    attempts: 3,
    retries: 0,
    timeoutExtensions: 0,
    correctionContexts: 0
  },
  failedContext: {
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
  },
  failureBoundary: {
    failedFields,
    failedFieldCount: 22,
    critiquesPassingUnchanged: 2,
    excessWordsTotal: hypotheticalWordsRemoved,
    critiquesWithCharacterFailure: 0,
    critiquesWithSentenceLabelOrPunctuationFailure: 0,
    noveltyExplanationFailures: 0,
    additionalFailuresDetected: false,
    sourceFailureDetected: false,
    identityFailureDetected: false,
    transportFailureDetected: false,
    timeoutFailureDetected: false,
    responseSchemaFailureDetected: false,
    scoreFailureDetected: false,
    validatorFailureDetected: false,
    originalValidationMessage
  },
  diagnosticReplay: {
    inMemoryOnly: true,
    persistedCorrectedOutputs: 0,
    originalOutputBytesChanged: false,
    hypotheticalWritableFields: failedFields.map(({ path: field }) => field),
    hypotheticalCritiqueWordsRemoved: hypotheticalWordsRemoved,
    result: hypotheticalReplay
  },
  prospectiveRecoveryOnly: {
    currentlyAuthorizedUnderStandingAuthorization: true,
    repairPacketsPrepared: 0,
    repairPacketMaximumWritableFields: 2,
    minimumFieldDisjointRepairPacketCount: 11,
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
      "revalidate-the-complete-debate-49-publication-output",
      "replay-the-four-debate-accepted-cohort",
      "freeze-a-separate-six-context-resumption-manifest-only-if-debate-49-passes"
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
    productionMutation: false
  },
  authorization: {
    standingAuthorizationApplies: true,
    boundedFirstRecoveryApplies: true,
    repairPacketPreparation: true,
    repairModelExecutionAfterFrozenPreparationAndActivation: true,
    sixContextResumptionAfterCompleteDebateValidation: true,
    retry: false,
    recursiveCorrection: false,
    deterministicCompilation: false,
    publicationFinalization: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  artifacts: Object.fromEntries(
    Object.entries(paths)
      .filter(([name]) => name !== "diagnosis")
      .map(([name, file]) => [name, { path: file, sha256: sha256(bytes[name]) }])
  ),
  sourceHashes,
  nextAuthorizedAction:
    "prepare-eleven-field-disjoint-debate-49-publication-repair-packets-under-standing-authorization"
};

if (shouldWrite) await writeFile(path.resolve(paths.diagnosis), `${JSON.stringify(diagnosis, null, 2)}\n`);
console.log(JSON.stringify({
  status: shouldWrite ? diagnosis.status : "preview",
  failedDebate: "49",
  failedFields: diagnosis.failureBoundary.failedFieldCount,
  critiqueWordOverruns: diagnosis.failureBoundary.failedFieldCount,
  excessWordsTotal: diagnosis.failureBoundary.excessWordsTotal,
  additionalFailuresDetected: false,
  minimumRepairPackets: diagnosis.prospectiveRecoveryOnly.minimumFieldDisjointRepairPacketCount,
  repairPacketsPrepared: 0,
  modelContextsExecuted: 0,
  retries: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: diagnosis.nextAuthorizedAction
}, null, 2));
