#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { validatePostCanaryBatch04PublicationOutput } from "./lib/assessment-production-post-canary-batch-04-publication-validation.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/publication-reconstruction";
const STAGE = `${ROOT}/resumption-2`;
const paths = { activation: `${STAGE}/execution-activation.json`,
  execution: `${STAGE}/model-execution.json`, analysis: `${STAGE}/analysis.json`,
  diagnosis: `${STAGE}/failure-diagnosis.json` };
const debates = {
  "03": { output: `${STAGE}/outputs/debate-03.json`,
    packet: `${ROOT}/packets/debate-03.json`, validation: `${STAGE}/validations/debate-03.json`,
    provenance: `${STAGE}/provenance/debate-03.json`, moveId: "con-c206-science-leaves-purpose-domain" },
  "185": { output: `${STAGE}/outputs/debate-185.json`,
    packet: `${ROOT}/packets/debate-185.json`, validation: `${STAGE}/validations/debate-185.json`,
    provenance: `${STAGE}/provenance/debate-185.json`, moveId: "con-desert-dispensability-dilemma" }
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
if (shouldWrite) assertV4(!(await exists(paths.diagnosis)), `${paths.diagnosis} already exists`);
const [activationBytes, executionBytes, analysisBytes] = await Promise.all([
  readFile(path.resolve(paths.activation)), readFile(path.resolve(paths.execution)),
  readFile(path.resolve(paths.analysis))]);
const activation = JSON.parse(activationBytes);
const execution = JSON.parse(executionBytes);
const analysis = JSON.parse(analysisBytes);
assertV4(activation.status ===
  "frozen-six-untouched-post-canary-batch-04-publication-resumption-2-contexts-authorized-under-standing-authorization" &&
  execution.status === "post-canary-batch-04-publication-resumption-2-complete-with-failure" &&
  execution.contextsAttempted === 6 && execution.contextsUnattempted === 0 &&
  execution.validContexts === 4 && execution.invalidContexts === 2 &&
  execution.retries === 0 && execution.timeoutExtensions === 0 &&
  analysis.status === "post-canary-batch-04-publication-resumption-2-failed-validation",
"the preserved resumption-2 failure changed");
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `${file}: frozen source drifted`);
}
const failedFields = [];
const diagnosticReplay = [];
const artifactHashes = {};
for (const debateNumber of ["03", "185"]) {
  const source = debates[debateNumber];
  const [outputBytes, packetBytes, validationBytes, provenanceBytes] = await Promise.all([
    readFile(path.resolve(source.output)), readFile(path.resolve(source.packet)),
    readFile(path.resolve(source.validation)), readFile(path.resolve(source.provenance))]);
  const output = JSON.parse(outputBytes);
  const packet = JSON.parse(packetBytes);
  const validation = JSON.parse(validationBytes);
  const provenance = JSON.parse(provenanceBytes);
  const result = execution.results.find((row) => row.debateNumber === debateNumber);
  assertV4(result?.status === "output-validation-failed" && result.attemptCount === 1 &&
    result.retryCount === 0 && result.timeoutExtensionCount === 0 &&
    result.outputSha256 === sha256(outputBytes) && result.validationSha256 === sha256(validationBytes) &&
    result.provenanceSha256 === sha256(provenanceBytes) && validation.status === "failed" &&
    provenance.outputSha256 === result.outputSha256,
  `Debate ${debateNumber}: preserved failure artifacts changed`);
  const critique = output.moveProse[source.moveId].critique.trim();
  const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (debateNumber === "03") {
    assertV4(wordCount(critique) === 134 && critique.length === 1042 &&
      sentences.length === 4 && validation.validationMessage.includes("critique outside 105–130 words"),
    "Debate 03 failure boundary changed");
    failedFields.push({ debateNumber, debateId: packet.debateId,
      path: `moveProse.${source.moveId}.critique`, moveId: source.moveId,
      failureType: "critique-word-overrun", words: 134, characters: 1042,
      sentences: 4, excessWordsAboveAcceptanceMaximum: 4 });
    const diagnostic = structuredClone(output);
    const parts = diagnostic.moveProse[source.moveId].critique
      .split(/(?<=[.!?])\s+/).filter(Boolean);
    while (wordCount(parts.join(" ")) > 130) {
      const tokens = parts[1].split(/\s+/); tokens.splice(tokens.length - 2, 1);
      parts[1] = tokens.join(" ");
    }
    diagnostic.moveProse[source.moveId].critique = parts.join(" ");
    diagnosticReplay.push({ debateNumber, inMemoryOperation: "remove-four-excess-words",
      result: validatePostCanaryBatch04PublicationOutput(diagnostic, packet) });
  } else {
    assertV4(wordCount(critique) === 110 && critique.length === 955 &&
      sentences.length === 3 && critique.includes("desert.” Principal limitation:") &&
      validation.validationMessage.includes("critique must contain exactly four sentences"),
    "Debate 185 failure boundary changed");
    failedFields.push({ debateNumber, debateId: packet.debateId,
      path: `moveProse.${source.moveId}.critique`, moveId: source.moveId,
      failureType: "sentence-boundary-quoted-terminal-punctuation", words: 110,
      characters: 955, sentencesObserved: 3, sentencesIntended: 4,
      diagnosedSubstring: "desert.” Principal limitation:" });
    const diagnostic = structuredClone(output);
    diagnostic.moveProse[source.moveId].critique = critique.replace(
      "desert.” Principal limitation:", "desert”. Principal limitation:");
    diagnosticReplay.push({ debateNumber,
      inMemoryOperation: "move-sentence-terminal-period-outside-closing-quote",
      result: validatePostCanaryBatch04PublicationOutput(diagnostic, packet) });
  }
  artifactHashes[debateNumber] = {
    output: { path: source.output, sha256: sha256(outputBytes) },
    packet: { path: source.packet, sha256: sha256(packetBytes) },
    validation: { path: source.validation, sha256: sha256(validationBytes) },
    provenance: { path: source.provenance, sha256: sha256(provenanceBytes) }
  };
}
assertV4(diagnosticReplay.every((row) => row.result.status === "passed" &&
  row.result.lockedScoresUnchanged === true && row.result.calculatedScoresAuthoredByModel === 0),
"the two bounded diagnostic replays failed");
const sourceHashes = {};
for (const file of [paths.activation, paths.execution, paths.analysis,
  ...Object.values(debates).flatMap((source) =>
    [source.output, source.packet, source.validation, source.provenance]),
  "scripts/diagnose-assessment-production-post-canary-batch-04-publication-resumption-2-failure.mjs",
  "scripts/lib/assessment-production-post-canary-batch-04-publication-validation.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/v388-reconstruction.mjs"]) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
const diagnosis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-04-publication-resumption-2-failure-diagnosis",
  protocolId: activation.protocolId,
  status: "diagnosed-batch-04-resumption-2-two-single-critique-validation-failures",
  productionCanary: false, batchNumber: 4, stagingOnly: true,
  preservedGate: { contextsPlanned: 6, contextsAttempted: 6,
    contextsValid: 4, contextsInvalid: 2, contextsUnattempted: 0,
    acceptedDebates: ["127","67","85","49","186","81","148","47"],
    failedDebates: ["03","185"], attempts: 6, retries: 0,
    timeoutExtensions: 0, correctionContexts: 0 },
  failureBoundary: { failedFields, failedFieldCount: 2, affectedDebates: 2,
    critiqueWordBoundaryFailures: 1, sentenceBoundaryFailures: 1,
    additionalFailuresDetected: false, sourceFailureDetected: false,
    identityFailureDetected: false, transportFailureDetected: false,
    timeoutFailureDetected: false, responseSchemaFailureDetected: false,
    scoreFailureDetected: false, validatorFailureDetected: false },
  diagnosticReplay: { inMemoryOnly: true, persistedCorrectedOutputs: 0,
    originalOutputBytesChanged: false, debates: diagnosticReplay },
  prospectiveRecoveryOnly: { currentlyAuthorizedUnderStandingAuthorization: true,
    repairPacketsPrepared: 0, repairPacketMaximumWritableFields: 2,
    minimumFieldDisjointRepairPacketCount: 2,
    proposedRepairPartition: failedFields.map((field) => [field.path]),
    proposedModel: { label: "5.6 Sol", slug: "gpt-5.6-sol",
      reasoningEffort: "low", authentication: "ChatGPT subscription" },
    proposedAttemptsMaximumPerPacket: 1, proposedRetriesMaximum: 0,
    requiredAfterRepair: ["revalidate-complete-debate-03",
      "revalidate-complete-debate-185", "replay-complete-ten-debate-cohort"] },
  preservedControls: { modelContextsExecutedForDiagnosis: 0, retries: 0,
    timeoutExtensions: 0, correctionModelContexts: 0, repairPacketsPrepared: 0,
    paidServiceCalls: 0, directIncrementalCostUsd: 0,
    scoresRecalculated: false, scoresChanged: false, modelAuthoredScores: 0,
    publicationCompiled: false, productionMutation: false },
  authorization: { standingAuthorizationApplies: true,
    boundedFirstRecoveryAppliesToEachFailedContext: true,
    repairPacketPreparation: true,
    repairModelExecutionAfterFrozenPreparationAndActivation: true,
    completeCohortReplayAfterRepair: true, retry: false,
    recursiveCorrection: false, paidServices: false,
    productionMutation: false, nextBatchSelection: false },
  artifacts: { activation: { path: paths.activation, sha256: sha256(activationBytes) },
    execution: { path: paths.execution, sha256: sha256(executionBytes) },
    analysis: { path: paths.analysis, sha256: sha256(analysisBytes) },
    debates: artifactHashes },
  sourceHashes,
  nextAuthorizedAction:
    "prepare-two-isolated-single-field-publication-repair-packets-for-debates-03-and-185"
};
if (shouldWrite) await writeFile(path.resolve(paths.diagnosis), `${JSON.stringify(diagnosis, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? diagnosis.status : "preview",
  failedDebates: ["03","185"], failedFields: 2,
  wordBoundaryFailures: 1, sentenceBoundaryFailures: 1,
  minimumRepairPackets: 2, repairPacketsPrepared: 0,
  modelContextsExecuted: 0, retries: 0, paidServiceCalls: 0,
  directIncrementalCostUsd: 0, nextAuthorizedAction: diagnosis.nextAuthorizedAction }, null, 2));
