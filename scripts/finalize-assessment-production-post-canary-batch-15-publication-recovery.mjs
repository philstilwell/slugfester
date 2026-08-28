#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validatePostCanaryBatch15PublicationOutput } from "./lib/assessment-production-post-canary-batch-15-publication-validation.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";

const publicationRoot = "docs/assessment-production/post-canary-continuation-v1/batch-15/publication-reconstruction";
const levelOneRoot = `${publicationRoot}/failure-recovery/level-1`;
const levelTwoRoot = `${publicationRoot}/failure-recovery/level-2`;
const root = `${publicationRoot}/failure-recovery/finalized`;
const analysisPath = `${root}/analysis.json`;
const overlayPath = `${root}/complete-publication-overlay.json`;
const shouldWrite = process.argv.includes("--write");
const finalizedAtIndex = process.argv.indexOf("--finalized-at");
const finalizedAt = finalizedAtIndex >= 0 ? process.argv[finalizedAtIndex + 1] : null;
assert(finalizedAt && !Number.isNaN(Date.parse(finalizedAt)), "--finalized-at requires an ISO timestamp");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) => `${JSON.stringify(value, null, 2)}\n`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const readJson = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
const labels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
const validateCritique = (critique, moveId) => {
  const text = String(critique).trim();
  const words = wordCount(text);
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  assert(words >= 105 && words <= 130, `${moveId}: critique word count ${words}`);
  assert(text.length >= 880, `${moveId}: critique shorter than 880 characters`);
  assert.equal(sentences.length, 4, `${moveId}: critique sentence count`);
  labels.forEach((label, index) => {
    assert(sentences[index].toLowerCase().startsWith(label), `${moveId}: label ${index + 1}`);
    assert(/[.!?]["')\]]?$/.test(sentences[index].trim()), `${moveId}: punctuation ${index + 1}`);
  });
};
const noveltyItems = (output) => ["pro", "con"].flatMap((side) => {
  const extension = output.aiExtension[side];
  return [extension.thesis, ...extension.premises, extension.conclusion, ...extension.newArguments];
});
const validationRecord = (output, packet, validation, bytes) => ({
  schemaVersion: "1.0-assessment-production-post-canary-batch-15-publication-validation",
  protocolId: output.protocolId,
  status: "passed",
  debateNumber: output.debateNumber,
  debateId: packet.debateId,
  outputSha256: sha256(bytes),
  validationSummary: validation,
  validationMessage: null,
  modelAuthoredScores: 0,
  lockedScoresUnchanged: true
});

assert(!(await exists(analysisPath)), `${analysisPath} already exists`);
assert(!(await exists(overlayPath)), `${overlayPath} already exists`);
const [diagnosis, levelOneActivation, levelOneExecution, levelTwoActivation, levelTwoExecution, levelTwoAnalysis] = await Promise.all([
  `${publicationRoot}/failure-recovery/diagnosis.json`,
  `${levelOneRoot}/execution-activation.json`,
  `${levelOneRoot}/model-execution.json`,
  `${levelTwoRoot}/execution-activation.json`,
  `${levelTwoRoot}/model-execution.json`,
  `${levelTwoRoot}/analysis.json`
].map(readJson));
assert.equal(diagnosis.status, "batch-15-publication-three-bounded-field-failures-and-one-timeout-diagnosed");
assert.equal(levelOneExecution.status, "batch-15-publication-recovery-level-1-execution-failed");
assert.equal(levelOneExecution.validContexts, 15);
assert.equal(levelOneExecution.invalidContexts, 2);
assert.equal(levelTwoExecution.status, "four-atomic-field-batch-15-publication-recovery-level-2-execution-passed");
assert.equal(levelTwoAnalysis.status, "four-atomic-field-batch-15-publication-recovery-level-2-passed");

const levelOneOutputs = new Map();
for (const result of levelOneExecution.results.filter((item) => item.gateAcceptancePassed)) {
  const context = levelOneActivation.contexts[result.contextIndex];
  const bytes = await readFile(path.resolve(context.output));
  assert.equal(sha256(bytes), result.outputSha256, `level-one context ${result.contextIndex} output hash changed`);
  levelOneOutputs.set(result.contextIndex, JSON.parse(bytes));
}
const levelTwoOutputs = new Map();
for (const result of levelTwoExecution.results) {
  assert.equal(result.gateAcceptancePassed, true);
  const context = levelTwoActivation.contexts[result.contextIndex];
  const bytes = await readFile(path.resolve(context.output));
  const rawBytes = await readFile(path.resolve(context.rawOutput));
  assert.equal(sha256(bytes), result.outputSha256);
  assert.equal(sha256(rawBytes), result.rawOutputSha256);
  assert.deepEqual(JSON.parse(bytes), JSON.parse(rawBytes));
  levelTwoOutputs.set(result.contextIndex, JSON.parse(bytes));
}

const mergedOutputs = new Map();
const recoverySummaries = [];
for (const debateNumber of ["98", "155", "178"]) {
  const packetPath = `${publicationRoot}/packets/debate-${debateNumber}.json`;
  const outputPath = `${publicationRoot}/outputs/debate-${debateNumber}.json`;
  const validationPath = `${publicationRoot}/validations/debate-${debateNumber}.json`;
  const provenancePath = `${publicationRoot}/provenance/debate-${debateNumber}.json`;
  const [packet, originalOutput, originalValidation, originalProvenance, originalOutputBytes, originalValidationBytes, originalProvenanceBytes] = await Promise.all([
    readJson(packetPath), readJson(outputPath), readJson(validationPath), readJson(provenancePath),
    readFile(path.resolve(outputPath)), readFile(path.resolve(validationPath)), readFile(path.resolve(provenancePath))
  ]);
  assert.equal(sha256(originalOutputBytes), diagnosis.preservedEvidence[outputPath]);
  const levelOneContexts = levelOneActivation.contexts.filter((context) => context.type === "field-repair" && context.debateNumber === debateNumber && levelOneOutputs.has(context.contextIndex));
  const corrections = levelOneContexts.flatMap((context) => levelOneOutputs.get(context.contextIndex).corrections);
  if (debateNumber === "178") corrections.push(...[...levelTwoOutputs.values()].map((output) => output.correction));
  const expected = diagnosis.validationFailures.find((item) => item.debateNumber === debateNumber);
  assert.equal(corrections.length, expected.invalidFieldCount);
  const keys = corrections.map((item) => item.kind === "critique" ? `critique:${item.moveId}` : `novelty:${item.itemId}`);
  assert.equal(new Set(keys).size, expected.invalidFieldCount);
  const merged = structuredClone(originalOutput);
  for (const correction of corrections) {
    if (correction.kind === "critique") {
      validateCritique(correction.critique, correction.moveId);
      merged.moveProse[correction.moveId].critique = correction.critique;
    } else {
      assert(wordCount(correction.explanation) >= 8, `${correction.itemId}: novelty explanation too short`);
      noveltyItems(merged).find((item) => item.id === correction.itemId).novelty.explanation = correction.explanation;
    }
  }
  const replay = structuredClone(merged);
  for (const correction of corrections) {
    if (correction.kind === "critique") replay.moveProse[correction.moveId].critique = originalOutput.moveProse[correction.moveId].critique;
    else noveltyItems(replay).find((item) => item.id === correction.itemId).novelty.explanation = noveltyItems(originalOutput).find((item) => item.id === correction.itemId).novelty.explanation;
  }
  assert.deepEqual(replay, originalOutput, `Debate ${debateNumber}: accepted companion fields changed`);
  const validation = validatePostCanaryBatch15PublicationOutput(merged, packet);
  assert.equal(validation.status, "passed");
  const mergedBytes = Buffer.from(pretty(merged));
  const provenance = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-15-publication-recovery-provenance",
    protocolId: levelTwoActivation.protocolId,
    debateNumber,
    originalFailure: { status: "output-validation-failed", originalOutputPreserved: true },
    recovery: { levelOneAcceptedContexts: levelOneContexts.map((item) => item.contextIndex), levelTwoAtomicContexts: debateNumber === "178" ? [0, 1, 2, 3] : [], acceptedFields: corrections.length, eachTargetFieldAcceptedExactlyOnce: true },
    merge: { acceptedCompanionFieldsChanged: false, rejectedProseReused: false, scoresChanged: false, scorePassRerun: false, modelAuthoredScores: 0, completeValidationPassed: true }
  };
  if (shouldWrite) {
    const preservedRoot = `${root}/preserved`;
    await mkdir(path.resolve(preservedRoot), { recursive: true });
    await writeFile(path.resolve(`${preservedRoot}/debate-${debateNumber}-original-output.json`), originalOutputBytes);
    await writeFile(path.resolve(`${preservedRoot}/debate-${debateNumber}-original-validation.json`), originalValidationBytes);
    await writeFile(path.resolve(`${preservedRoot}/debate-${debateNumber}-original-provenance.json`), originalProvenanceBytes);
    await writeFile(path.resolve(outputPath), mergedBytes);
    await writeFile(path.resolve(validationPath), pretty(validationRecord(merged, packet, validation, mergedBytes)));
    await writeFile(path.resolve(provenancePath), pretty(provenance));
  }
  mergedOutputs.set(debateNumber, { output: merged, bytes: mergedBytes, validation });
  recoverySummaries.push({ debateNumber, sourceFailure: "output-validation-failed", levelOneContexts: levelOneContexts.length, levelTwoContexts: debateNumber === "178" ? 4 : 0, repairedFields: corrections.length, validation });
}

const timeoutContexts = levelOneActivation.contexts.filter((context) => context.type === "timeout-recovery");
assert.deepEqual(timeoutContexts.map((item) => item.contextIndex), [14, 15, 16]);
const timeoutOutputs = timeoutContexts.map((context) => levelOneOutputs.get(context.contextIndex));
assert(timeoutOutputs.every(Boolean));
const packet128 = await readJson(`${publicationRoot}/packets/debate-128.json`);
const schema128 = await readJson(`${publicationRoot}/schemas/debate-128.schema.json`);
const constObject = (property) => Object.fromEntries(Object.entries(property.properties).map(([key, value]) => [key, value.const]));
const merged128 = {
  schemaVersion: schema128.properties.schemaVersion.const,
  protocolId: schema128.properties.protocolId.const,
  debateNumber: "128",
  debateId: packet128.debateId,
  assessmentModel: schema128.properties.assessmentModel.const,
  productionCanary: false,
  stagingOnly: true,
  completedAt: timeoutOutputs.map((output) => output.completedAt).sort().at(-1),
  moveProse: timeoutOutputs[0].moveProse,
  summary: timeoutOutputs[1].summary,
  representativeQuotes: timeoutOutputs[1].representativeQuotes,
  overallCommentary: timeoutOutputs[2].overallCommentary,
  aiExtension: timeoutOutputs[2].aiExtension,
  displayContract: constObject(schema128.properties.displayContract),
  audit: constObject(schema128.properties.audit)
};
const validation128 = validatePostCanaryBatch15PublicationOutput(merged128, packet128);
assert.equal(validation128.status, "passed");
const merged128Bytes = Buffer.from(pretty(merged128));
const provenance128 = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-15-publication-timeout-recovery-provenance",
  protocolId: levelOneActivation.protocolId,
  debateNumber: "128",
  sourceFailure: { status: "timed-out", originalOutputAvailable: false, partialOutputReused: false },
  shards: timeoutContexts.map((context) => ({ contextIndex: context.contextIndex, writableFields: context.writableFields, output: context.output, outputSha256: sha256(pretty(levelOneOutputs.get(context.contextIndex))) })),
  merge: { eachTopLevelWritableFieldAcceptedExactlyOnce: true, nonModelIdentityAndAuditFieldsFilledFromFrozenSchemaConstants: true, scoresChanged: false, scorePassRerun: false, fullValidationPassed: true }
};
if (shouldWrite) {
  await writeFile(path.resolve(`${publicationRoot}/outputs/debate-128.json`), merged128Bytes);
  await writeFile(path.resolve(`${publicationRoot}/validations/debate-128.json`), pretty(validationRecord(merged128, packet128, validation128, merged128Bytes)));
  await writeFile(path.resolve(`${publicationRoot}/provenance/debate-128.json`), pretty(provenance128));
}
mergedOutputs.set("128", { output: merged128, bytes: merged128Bytes, validation: validation128 });
recoverySummaries.push({ debateNumber: "128", sourceFailure: "timed-out", levelOneContexts: 3, levelTwoContexts: 0, recoveredTopLevelFields: 5, validation: validation128 });

const selected = ["39", "48", "23", "162", "86", "159", "128", "98", "155", "178"];
const complete = [];
for (const debateNumber of selected) {
  const packet = await readJson(`${publicationRoot}/packets/debate-${debateNumber}.json`);
  const output = mergedOutputs.get(debateNumber)?.output ?? await readJson(`${publicationRoot}/outputs/debate-${debateNumber}.json`);
  const validation = validatePostCanaryBatch15PublicationOutput(output, packet);
  assert.equal(validation.status, "passed");
  complete.push({ debateNumber, outputSha256: sha256(pretty(output)), validation });
}
assert.equal(complete.reduce((sum, item) => sum + item.validation.moves, 0), 191);
assert.equal(complete.reduce((sum, item) => sum + item.validation.critiques, 0), 191);
assert.equal(complete.reduce((sum, item) => sum + item.validation.quoteExactSourceMatches, 0), 20);
assert.equal(complete.reduce((sum, item) => sum + item.validation.overallCommentarySides, 0), 20);
assert.equal(complete.reduce((sum, item) => sum + item.validation.aiExtensionSides, 0), 20);

const overlay = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-15-complete-publication-recovery-overlay",
  status: "complete-ten-debate-batch-15-publication-cohort-valid-after-bounded-recovery",
  finalizedAt,
  debateOrder: selected,
  debates: complete,
  recoverySummaries,
  recoveryUse: { levelOneContexts: 17, levelOneValidContexts: 15, levelOneInvalidContexts: 2, levelTwoContexts: 4, levelTwoValidContexts: 4, exceptionalThirdLevelContexts: 0, retries: 0, timeoutExtensions: 0 },
  integrity: { originalFailuresPreservedExceptDocumentedLevelOneRawPayloadDefect: true, preservationDefect: `${levelTwoRoot}/level-1-preservation-defect.json`, acceptedFieldsChanged: false, rejectedProseReused: false, scoresChanged: false, scorePassRerun: false, modelAuthoredScores: 0 },
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: "prepare-batch-15-publication-finalization"
};
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-15-publication-recovery-finalization-analysis",
  status: "batch-15-publication-recovery-complete-ten-debate-gate-passed",
  finalizedAt,
  debates: 10,
  moves: 191,
  critiques: 191,
  exactSourceQuotes: 20,
  overallCommentarySides: 20,
  aiExtensionSides: 20,
  recoveryUse: overlay.recoveryUse,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  modelAuthoredScores: 0,
  scoresChanged: false,
  scorePassRerun: false,
  authorization: { publicationFinalization: true, furtherRecovery: false, scorePass: false, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: overlay.nextAuthorizedAction
};
if (shouldWrite) {
  await mkdir(path.resolve(root), { recursive: true });
  await writeFile(path.resolve(overlayPath), pretty(overlay));
  await writeFile(path.resolve(analysisPath), pretty(analysis));
}
console.log(pretty({ status: analysis.status, debates: 10, moves: 191, critiques: 191, exactSourceQuotes: 20, overallCommentarySides: 20, aiExtensionSides: 20, recoveryUse: analysis.recoveryUse, scoresChanged: false, scorePassRerun: false, directIncrementalCostUsd: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }));
