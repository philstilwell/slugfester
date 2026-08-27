#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

import { validatePostCanaryBatch14PublicationOutput } from "./lib/assessment-production-post-canary-batch-14-publication-validation.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";

const root = "docs/assessment-production/post-canary-continuation-v1/batch-14/publication-reconstruction";
const recovery =
  `${root}/failure-recovery/original-unattempted-context-resumption-3/debate-55-timeout-recovery`;
const shouldWrite = process.argv.includes("--write");
const readJson = (file) => readFile(file, "utf8").then(JSON.parse);
const [packet, fullSchema, execution, moveShard, quoteShard, extensionShard, validDebate160] = await Promise.all([
  `${root}/packets/debate-55.json`, `${root}/schemas/debate-55.schema.json`, `${recovery}/model-execution.json`, `${recovery}/outputs/context-0.json`, `${recovery}/outputs/context-1.json`, `${recovery}/outputs/context-2.json`, `${root}/outputs/debate-160.json`,
].map(readJson));
assert.equal(execution.status, "three-context-debate-55-publication-timeout-recovery-execution-passed");
const constObject = (property) => Object.fromEntries(Object.entries(property.properties).map(([key, value]) => [key, value.const]));
const merged = { schemaVersion: fullSchema.properties.schemaVersion.const, protocolId: fullSchema.properties.protocolId.const, debateNumber: "55", debateId: packet.debateId, assessmentModel: "5.6 Sol", productionCanary: false, stagingOnly: true, completedAt: [moveShard.completedAt, quoteShard.completedAt, extensionShard.completedAt].sort().at(-1), moveProse: moveShard.moveProse, summary: quoteShard.summary, representativeQuotes: quoteShard.representativeQuotes, overallCommentary: extensionShard.overallCommentary, aiExtension: extensionShard.aiExtension, displayContract: constObject(fullSchema.properties.displayContract), audit: constObject(fullSchema.properties.audit) };
const labels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
const invalidCritiques = packet.moves.map((move) => {
  const critique = merged.moveProse[move.moveId].critique.trim();
  const words = wordCount(critique);
  const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
  const violations = [];
  if (words < 105 || words > 130) violations.push("word-count");
  if (critique.length < 880) violations.push("minimum-characters");
  if (sentences.length !== 4) violations.push("sentence-count");
  labels.forEach((label, index) => {
    if (!sentences[index]?.toLowerCase().startsWith(label)) violations.push(`ordered-label-${index + 1}`);
    if (sentences[index] && !/[.!?]["')\]]?$/.test(sentences[index].trim())) violations.push(`terminal-punctuation-${index + 1}`);
  });
  return { moveId: move.moveId, words, characters: critique.length, sentences: sentences.length, violations, field: `moveProse.${move.moveId}.critique` };
}).filter((item) => item.violations.length > 0);
assert.equal(invalidCritiques.length, 12);
assert(invalidCritiques.every((item) => item.violations.length === 1 && item.violations[0] === "word-count" && item.words > 130), "Debate 55 critique failure type changed");
const standIn = Object.values(validDebate160.moveProse).map((item) => item.critique).find((critique) => wordCount(critique) >= 105 && wordCount(critique) <= 130 && critique.length >= 880);
assert(standIn, "validation-clean stand-in unavailable");
const auditClone = structuredClone(merged);
for (const item of invalidCritiques) auditClone.moveProse[item.moveId].critique = standIn;
const nonTargetValidation = validatePostCanaryBatch14PublicationOutput(auditClone, packet);
assert.equal(nonTargetValidation.status, "passed");
const analysis = { schemaVersion: "1.0-assessment-production-post-canary-batch-14-publication-timeout-recovery-diagnosis", protocolId: "assessment-production-post-canary-batch-14-publication-timeout-field-disjoint-recovery", status: "debate-55-three-shard-recovery-complete-merged-validation-failed-twelve-critiques", debateNumber: "55", originalTimeoutPreserved: true, recoveryLevel: 1, recoveryLevelsMaximum: 2, contextsAttempted: 3, contextsValid: 3, attempts: 3, retries: 0, timeoutExtensions: 0, directIncrementalCostUsd: 0, diagnosis: { invalidCritiques, invalidCritiqueCount: invalidCritiques.length, allOtherFieldsStructurallyValid: true, nonTargetValidation, temporaryStandInsPersisted: false, acceptedFieldsChanged: false, scoresChanged: false, scorePassRerun: false }, authorization: { recoveryLevel2Preparation: true, additionalWholeDebateAttempt: false, retries: false, scorePass: false, deterministicCompilation: false, productionMutation: false, nextBatchSelection: false }, nextAuthorizedAction: "prepare-minimum-six-field-disjoint-critique-recovery-shards" };
if (shouldWrite) await writeFile(`${recovery}/analysis.json`, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, invalidCritiques: 12, allOtherFieldsStructurallyValid: true, recoveryLevel2PreparationAuthorized: true, attempts: 3, retries: 0, directIncrementalCostUsd: 0 }, null, 2));
