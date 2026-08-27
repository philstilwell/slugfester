#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

import { validatePostCanaryBatch13PublicationOutput } from "./lib/assessment-production-post-canary-batch-13-publication-validation.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";

const root = "docs/assessment-production/post-canary-continuation-v1/batch-13/publication-reconstruction";
const recovery = `${root}/timeout-recovery`;
const shouldWrite = process.argv.includes("--write");
const readJson = (file) => readFile(file, "utf8").then(JSON.parse);
const [packet, fullSchema, execution, moveShard, quoteShard, extensionShard, validDebate26] = await Promise.all([
  `${root}/packets/debate-87.json`, `${root}/schemas/debate-87.schema.json`, `${recovery}/model-execution.json`, `${recovery}/outputs/context-0.json`, `${recovery}/outputs/context-1.json`, `${recovery}/outputs/context-2.json`, `${root}/outputs/debate-26.json`,
].map(readJson));
assert.equal(execution.status, "three-context-debate-87-publication-timeout-recovery-execution-passed");
const constObject = (property) => Object.fromEntries(Object.entries(property.properties).map(([key, value]) => [key, value.const]));
const merged = { schemaVersion: fullSchema.properties.schemaVersion.const, protocolId: fullSchema.properties.protocolId.const, debateNumber: "87", debateId: packet.debateId, assessmentModel: "5.6 Sol", productionCanary: false, stagingOnly: true, completedAt: [moveShard.completedAt, quoteShard.completedAt, extensionShard.completedAt].sort().at(-1), moveProse: moveShard.moveProse, summary: quoteShard.summary, representativeQuotes: quoteShard.representativeQuotes, overallCommentary: extensionShard.overallCommentary, aiExtension: extensionShard.aiExtension, displayContract: constObject(fullSchema.properties.displayContract), audit: constObject(fullSchema.properties.audit) };
const invalidCritiques = packet.moves.map((move) => {
  const critique = merged.moveProse[move.moveId].critique;
  return { moveId: move.moveId, words: wordCount(critique), characters: critique.length, field: `moveProse.${move.moveId}.critique` };
}).filter((item) => item.words < 105 || item.words > 130 || item.characters < 880);
assert.equal(invalidCritiques.length, 19);
const standIn = Object.values(validDebate26.moveProse).map((item) => item.critique).find((critique) => wordCount(critique) >= 105 && wordCount(critique) <= 130 && critique.length >= 880);
assert(standIn, "validation-clean stand-in unavailable");
const auditClone = structuredClone(merged);
for (const item of invalidCritiques) auditClone.moveProse[item.moveId].critique = standIn;
const nonTargetValidation = validatePostCanaryBatch13PublicationOutput(auditClone, packet);
assert.equal(nonTargetValidation.status, "passed");
const analysis = { schemaVersion: "1.0-assessment-production-post-canary-batch-13-publication-timeout-recovery-diagnosis", protocolId: "assessment-production-post-canary-batch-13-publication-timeout-field-disjoint-recovery", status: "debate-87-three-shard-recovery-complete-merged-validation-failed-nineteen-critiques", debateNumber: "87", originalTimeoutPreserved: true, recoveryLevel: 1, contextsAttempted: 3, contextsValid: 3, attempts: 3, retries: 0, timeoutExtensions: 0, directIncrementalCostUsd: 0, diagnosis: { invalidCritiques, invalidCritiqueCount: invalidCritiques.length, allOtherFieldsStructurallyValid: true, nonTargetValidation, temporaryStandInsPersisted: false }, authorization: { recoveryLevel2Preparation: true, additionalWholeDebateAttempt: false, retries: false, scorePass: false, deterministicCompilation: false, productionMutation: false, nextBatchSelection: false }, nextAuthorizedAction: "prepare-minimum-ten-field-disjoint-critique-recovery-shards" };
if (shouldWrite) await writeFile(`${recovery}/analysis.json`, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, invalidCritiques: 19, allOtherFieldsStructurallyValid: true, recoveryLevel2PreparationAuthorized: true, attempts: 3, retries: 0, directIncrementalCostUsd: 0 }, null, 2));
