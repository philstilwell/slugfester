#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validatePostCanaryBatch13PublicationOutput } from "./lib/assessment-production-post-canary-batch-13-publication-validation.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const root = "docs/assessment-production/post-canary-continuation-v1/batch-13/publication-reconstruction";
const resumptionRoot = `${root}/original-unattempted-context-resumption-4`;
const outputPath = `${root}/outputs/debate-34.json`;
const packetPath = `${root}/packets/debate-34.json`;
const executionPath = `${resumptionRoot}/model-execution.json`;
const validationPath = `${root}/validations/debate-34.json`;
const analysisPath = `${resumptionRoot}/debate-34-failure-analysis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [outputBytes, packetBytes, executionBytes, validationBytes] = await Promise.all(
  [outputPath, packetPath, executionPath, validationPath].map((file) => readFile(path.resolve(file)))
);
const output = JSON.parse(outputBytes); const packet = JSON.parse(packetBytes);
const execution = JSON.parse(executionBytes); const validationRecord = JSON.parse(validationBytes);
const failed = execution.results.find((item) => item.debateNumber === "34");
assertV4(execution.status === "four-context-publication-resumption-stopped-with-failure" && execution.contextsAttempted === 4 && execution.validContexts === 3 && execution.contextsUnattempted === 0 && failed?.status === "output-validation-failed" && failed.outputSha256 === sha256(outputBytes) && failed.retryCount === 0, "Debate 34 failure boundary changed");
assertV4(validationRecord.status === "failed" && validationRecord.outputSha256 === sha256(outputBytes), "Debate 34 failed validation record changed");

const labels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
const invalidCritiques = [];
for (const move of packet.moves) {
  const critique = String(output.moveProse[move.moveId].critique).trim();
  const words = wordCount(critique); const characters = critique.length;
  const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean); const defects = [];
  if (words < 105 || words > 130) defects.push(`words:${words}`);
  if (characters < 880) defects.push(`characters:${characters}`);
  if (sentences.length !== 4) defects.push(`sentences:${sentences.length}`);
  if (sentences.length === 4) labels.forEach((label, index) => {
    if (!sentences[index].toLowerCase().startsWith(label)) defects.push(`label:${index}`);
    if (!/[.!?]["')\]]?$/.test(sentences[index].trim())) defects.push(`punctuation:${index}`);
  });
  if (defects.length) invalidCritiques.push({ moveId: move.moveId, field: `moveProse.${move.moveId}.critique`, words, characters, defects, originalValueSha256: sha256(critique) });
}
const invalidQuotes = [];
for (const side of ["pro", "con"]) {
  const quote = output.representativeQuotes[side]; const move = packet.moves.find((item) => item.moveId === quote.sourceMoveId); const words = wordCount(quote.text); const defects = [];
  if (!move || move.side !== side || !move.quoteEligible) defects.push("ineligible-source");
  if (!move?.sourceExcerpt.includes(quote.text)) defects.push("non-exact-source-substring");
  if (words < 3 || words > 18) defects.push(`words:${words}`);
  if (defects.length) invalidQuotes.push({ side, field: `representativeQuotes.${side}.text`, sourceMoveId: quote.sourceMoveId, words, defects, originalValueSha256: sha256(quote.text) });
}
const structuralStandIn = Object.values(output.moveProse).map((entry) => entry.critique).find((critique) => {
  const value = String(critique).trim(); const words = wordCount(value); const sentences = value.split(/(?<=[.!?])\s+/).filter(Boolean);
  return words >= 105 && words <= 130 && value.length >= 880 && sentences.length === 4 && labels.every((label, index) => sentences[index].toLowerCase().startsWith(label));
});
assertV4(structuralStandIn, "Debate 34 has no validation-clean critique stand-in");
const auditClone = structuredClone(output);
for (const issue of invalidCritiques) auditClone.moveProse[issue.moveId].critique = structuralStandIn;
for (const issue of invalidQuotes) {
  const move = packet.moves.find((item) => item.moveId === issue.sourceMoveId);
  auditClone.representativeQuotes[issue.side].text = move.sourceExcerpt.trim().split(/\s+/).slice(0, 8).join(" ");
}
const nonTargetValidation = validatePostCanaryBatch13PublicationOutput(auditClone, packet);
assertV4(nonTargetValidation.status === "passed", "Debate 34 non-target fields do not validate");
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-13-debate-34-publication-failure-analysis",
  protocolId: "assessment-production-post-canary-batch-13-debate-34-publication-field-disjoint-repair-1",
  status: "debate-34-publication-failure-diagnosed-awaiting-field-disjoint-repair-1",
  debateNumber: "34",
  sources: { output: { path: outputPath, sha256: sha256(outputBytes) }, packet: { path: packetPath, sha256: sha256(packetBytes) }, execution: { path: executionPath, sha256: sha256(executionBytes) }, failedValidation: { path: validationPath, sha256: sha256(validationBytes) } },
  diagnosis: { invalidCritiques, invalidQuotes, invalidCritiqueCount: invalidCritiques.length, invalidQuoteCount: invalidQuotes.length, allOtherFieldsStructurallyValid: true, nonTargetValidation, temporaryStandInsPersisted: false },
  preservation: { failedOutputPreserved: true, unattemptedOriginalContextIndexes: execution.unattemptedOriginalContextIndexes, retries: 0, timeoutExtensions: 0, scorePassRerun: false, calculatedScoresChanged: false },
  authorization: { fieldDisjointRepairLevel1Preparation: true, attemptsPerShard: 1, retries: false, writableFieldsMaximumPerShard: 2, completeCohortReplayAfterPassingRepair: true, scorePass: false, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: "prepare-minimum-field-disjoint-debate-34-publication-repair-shards"
};
if (shouldWrite) await writeFile(path.resolve(analysisPath), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? analysis.status : "preview", invalidCritiques, invalidQuotes, allOtherFieldsStructurallyValid: true, nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
