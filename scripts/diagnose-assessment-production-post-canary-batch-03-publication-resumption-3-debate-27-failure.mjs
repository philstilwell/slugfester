#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validatePostCanaryBatch03PublicationOutput } from "./lib/assessment-production-post-canary-batch-03-publication-validation.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const index = process.argv.indexOf("--frozen-at");
const frozenAt = index >= 0 ? process.argv[index + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");

const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-03/publication-reconstruction/resumption-3";
const REPAIR_ROOT = `${ROOT}/repair-1`;
const DIAGNOSIS = `${REPAIR_ROOT}/failure-diagnosis.json`;
const OUTPUT = `${ROOT}/outputs/debate-27.json`;
const VALIDATION = `${ROOT}/validations/debate-27.json`;
const PROVENANCE = `${ROOT}/provenance/debate-27.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const PACKET = "docs/assessment-production/post-canary-continuation-v1/batch-03/publication-reconstruction/packets/debate-27.json";
const VALIDATOR = "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs";
const sourceFiles = [OUTPUT, VALIDATION, PROVENANCE, EXECUTION, ANALYSIS, PREPARATION, ACTIVATION, PACKET, VALIDATOR, "scripts/lib/assessment-production-post-canary-batch-03-publication-validation.mjs", "scripts/lib/v388-reconstruction.mjs"];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytesByFile = Object.fromEntries(await Promise.all(sourceFiles.map(async (file) => [file, await readFile(path.resolve(file))])));
const parsed = (file) => JSON.parse(bytesByFile[file]);
const output = parsed(OUTPUT);
const validation = parsed(VALIDATION);
const execution = parsed(EXECUTION);
const analysis = parsed(ANALYSIS);
const packet = parsed(PACKET);
assertV4(
  execution.status === "batch-03-five-context-publication-resumption-failed" &&
    execution.contextsPlanned === 5 && execution.contextsAttempted === 5 && execution.validContexts === 4 && execution.invalidContexts === 1 &&
    execution.attempts === 5 && execution.retries === 0 && execution.timeoutExtensions === 0 &&
    execution.results?.find(({ debateNumber }) => debateNumber === "27")?.gateAcceptancePassed === false &&
    analysis.status === "batch-03-publication-resumption-3-failed-stop-required" &&
    analysis.gate?.contextsPassed === 4 && analysis.gate?.contextsFailed === 1,
  "the preserved Debate 27 failure boundary changed"
);
assertV4(
  validation.status === "failed" && validation.outputSha256 === sha256(bytesByFile[OUTPUT]) &&
    /pro-moral-argument-limited-conclusion: critique outside 105–130 words/.test(validation.validationMessage) &&
    output.debateNumber === "27" && output.debateId === packet.debateId,
  "the preserved Debate 27 output or validation record changed"
);

const labels = ["Strongest feature:", "Principal limitation:", "Live burden:", "Locked score:"];
const fields = [];
for (const [moveId, prose] of Object.entries(output.moveProse)) {
  const critique = String(prose.critique).trim();
  const words = wordCount(critique);
  const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (words < 105 || words > 130) {
    fields.push({
      path: `moveProse.${moveId}.critique`,
      moveId,
      words,
      characters: critique.length,
      excessWordsAboveMaximum: Math.max(0, words - 130),
      deficitWordsBelowMinimum: Math.max(0, 105 - words),
      sentences: sentences.length,
      orderedLabelsPresent: labels.every((label, sentenceIndex) => sentences[sentenceIndex]?.startsWith(label)),
      terminalPunctuationPresent: sentences.every((sentence) => /[.!?]["')\]]?$/.test(sentence.trim())),
      minimumCharactersPresent: critique.length >= 880
    });
  }
}
const expectedMoveIds = [
  "pro-moral-argument-limited-conclusion",
  "con-conscious-moral-status-circular-grounding",
  "con-evolved-dispositions-conditional-rules",
  "pro-logic-reason-naturalist-grounding",
  "con-objective-logic-subjective-reasoning",
  "pro-evolution-self-reference-basic-belief",
  "pro-disagreement-not-unreality"
];
assertV4(canonicalJson(fields.map(({ moveId }) => moveId)) === canonicalJson(expectedMoveIds), "the diagnosed Debate 27 field set changed");
assertV4(
  fields.every((field) => field.words >= 131 && field.words <= 134 && field.sentences === 4 && field.orderedLabelsPresent && field.terminalPunctuationPresent && field.minimumCharactersPresent),
  "the diagnosed critique-only failure category changed"
);
const partitions = [fields.slice(0, 2), fields.slice(2, 4), fields.slice(4, 6), fields.slice(6, 7)].map((partition) => partition.map(({ path: field }) => field));
assertV4(partitions.length === 4 && partitions.every((partition) => partition.length >= 1 && partition.length <= 2), "the bounded 2+2+2+1 partition changed");

const diagnosticCopy = structuredClone(output);
const diagnosticTemplate = output.moveProse["pro-evil-good-divine-ground"].critique;
assertV4(wordCount(diagnosticTemplate) >= 105 && wordCount(diagnosticTemplate) <= 130 && diagnosticTemplate.length >= 880, "diagnostic template is not mechanically valid");
for (const { moveId } of fields) diagnosticCopy.moveProse[moveId].critique = diagnosticTemplate;
const replay = validatePostCanaryBatch03PublicationOutput(diagnosticCopy, packet);
assertV4(replay.status === "passed" && replay.moves === 19 && replay.critiques === 19 && replay.calculatedScoresAuthoredByModel === 0 && replay.lockedScoresUnchanged === true, "a hidden Debate 27 validation category remains");

const sourceHashes = Object.fromEntries(sourceFiles.sort().map((file) => [file, sha256(bytesByFile[file])]));
const diagnosis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-publication-resumption-3-debate-27-failure-diagnosis",
  protocolId: "assessment-production-post-canary-batch-03-publication-resumption-3-debate-27-repair-1",
  status: "diagnosed-debate-27-seven-critique-word-overruns-only",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  debateNumber: "27",
  debateId: packet.debateId,
  userAuthorization: {
    instruction: "I approve.",
    resolvedScope: "deterministic diagnosis and one bounded Debate 27 publication repair, followed on success by the ten-debate replay and remaining standing-authorized workflow",
    directIncrementalCostUsdMaximum: 0
  },
  preservedFailure: {
    output: OUTPUT,
    outputSha256: sha256(bytesByFile[OUTPUT]),
    outputAccepted: false,
    firstFailFastField: "moveProse.pro-moral-argument-limited-conclusion.critique",
    validationCategory: "critique-word-boundary",
    failedFieldCount: fields.length,
    totalExcessWordsAboveMaximum: fields.reduce((sum, field) => sum + field.excessWordsAboveMaximum, 0),
    fields
  },
  deterministicReplay: {
    method: "in-memory mechanical substitution into the seven diagnosed critique fields only",
    substitutionPersisted: false,
    substitutionPermittedAsRepairContent: false,
    originalOutputModified: false,
    replay,
    hiddenValidationCategoriesDetected: 0
  },
  boundedRepairPlan: {
    repairContexts: 4,
    partitionShape: [2, 2, 2, 1],
    partitions,
    writableFields: fields.map(({ path: field }) => field),
    writableFieldsPerPacketMaximum: 2,
    originalFailedOutputIsImmutableBase: true,
    acceptedFieldsScoresSourcesIdentityAndStructureImmutable: true,
    completeDebateValidationRequiredAfterMerge: true,
    completeTenDebateCohortReplayRequiredAfterMerge: true
  },
  executionControls: {
    model: "5.6 Sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    isolatedContexts: true,
    schedulerRamp: [1, 2],
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    recursiveRepairsMaximum: 0,
    directIncrementalCostUsdMaximum: 0
  },
  stopRules: {
    failedRepairOrUnexpectedValidationBlocks: true,
    retryBlocks: true,
    timeoutExtensionBlocks: true,
    protectedFieldChangeBlocks: true,
    paidServiceBlocks: true,
    productionMutationMismatchBlocks: true,
    batch4SelectionBlocks: true
  },
  sourceHashes,
  totals: { modelContextsExecuted: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0 },
  nextAuthorizedAction: "prepare-validate-freeze-commit-and-push-four-bounded-debate-27-publication-repair-contexts"
};
if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(DIAGNOSIS)), { recursive: true });
  await writeFile(path.resolve(DIAGNOSIS), `${JSON.stringify(diagnosis, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? diagnosis.status : "validated-preview", failedFields: fields.length, wordCounts: fields.map(({ words }) => words), partitions: [2, 2, 2, 1], hiddenValidationCategories: 0, directIncrementalCostUsd: 0, nextAuthorizedAction: diagnosis.nextAuthorizedAction }, null, 2));
