#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_09_PUBLICATION_TIMEOUT_RECOVERY_ROOT as ROOT, validatePublicationTimeoutRecoveryShardOutput } from "./lib/assessment-production-post-canary-batch-09-publication-resumption-timeout-recovery.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--diagnosed-at");
const diagnosedAt = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assertV4(diagnosedAt && !Number.isNaN(Date.parse(diagnosedAt)), "--diagnosed-at requires an ISO timestamp");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const files = {
  preparation: `${ROOT}/execution-preparation-manifest.json`, activation: `${ROOT}/execution-activation.json`,
  execution: `${ROOT}/model-execution.json`, analysis: `${ROOT}/analysis.json`,
  output0: `${ROOT}/outputs/context-0.json`, output1: `${ROOT}/outputs/context-1.json`, output2: `${ROOT}/outputs/context-2.json`,
  packet0: `${ROOT}/packets/context-0.json`, packet1: `${ROOT}/packets/context-1.json`, packet2: `${ROOT}/packets/context-2.json`,
  validation0: `${ROOT}/validations/context-0.json`, validation1: `${ROOT}/validations/context-1.json`, validation2: `${ROOT}/validations/context-2.json`,
  provenance0: `${ROOT}/provenance/context-0.json`, provenance1: `${ROOT}/provenance/context-1.json`, provenance2: `${ROOT}/provenance/context-2.json`
};
const bytes = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, file]) => [key, await readFile(path.resolve(file))])));
const execution = JSON.parse(bytes.execution); const analysis = JSON.parse(bytes.analysis);
assertV4(execution.status === "publication-timeout-recovery-stopped-on-failure" && execution.contextsAttempted === 3 && execution.validContexts === 1 && execution.invalidContexts === 2 && canonicalJson(execution.unattemptedContextIndexes) === canonicalJson([3, 4, 5, 6, 7]) && execution.attempts === 3 && execution.retries === 0 && execution.timeoutExtensions === 0, "preserved recovery failure boundary changed");
assertV4(analysis.status === "batch-09-publication-timeout-recovery-failed", "preserved failure analysis changed");
const expected = new Map([
  [1, [{ id: "con-morality-c010-evolutionary-social-origin", words: 132 }, { id: "con-method-c10-evidence-over-faith", words: 131 }]],
  [2, [{ id: "pro-deliberative-indispensability", words: 132 }, { id: "pro-centrality-weighted-theory-cost", words: 131 }, { id: "pro-explanatory-not-contradictory-cost", words: 132 }]]
]);
const contextDiagnoses = [];
validatePublicationTimeoutRecoveryShardOutput(JSON.parse(bytes.output0), JSON.parse(bytes.packet0));
for (const contextIndex of [1, 2]) {
  const output = JSON.parse(bytes[`output${contextIndex}`]); const packet = JSON.parse(bytes[`packet${contextIndex}`]);
  const defects = Object.entries(output.content.moveProse).map(([moveId, prose]) => {
    const sentences = prose.critique.split(/(?<=[.!?])\s+/).filter(Boolean);
    return { moveId, words: wordCount(prose.critique), characters: prose.critique.length, sentences: sentences.length, labelsInOrder: ["strongest feature:", "principal limitation:", "live burden:", "locked score:"].every((label, index) => sentences[index]?.toLowerCase().startsWith(label)), terminalPunctuationPresent: sentences.every((sentence) => /[.!?][\"')\]]?$/.test(sentence.trim())) };
  }).filter((row) => row.words < 105 || row.words > 130 || row.characters < 880 || row.sentences !== 4 || !row.labelsInOrder || !row.terminalPunctuationPresent);
  assertV4(canonicalJson(defects.map(({ moveId: id, words }) => ({ id, words }))) === canonicalJson(expected.get(contextIndex)), `context ${contextIndex}: diagnosed defect set changed`);
  assertV4(defects.every((row) => row.words > 130 && row.words <= 132 && row.characters >= 880 && row.sentences === 4 && row.labelsInOrder && row.terminalPunctuationPresent), `context ${contextIndex}: unexpected validation category`);
  const overlay = structuredClone(output);
  const donor = Object.entries(overlay.content.moveProse).find(([moveId, prose]) => !defects.some((row) => row.moveId === moveId) && wordCount(prose.critique) >= 105 && wordCount(prose.critique) <= 130 && prose.critique.length >= 880)?.[1]?.critique;
  assertV4(donor, `context ${contextIndex}: diagnostic donor unavailable`);
  for (const defect of defects) overlay.content.moveProse[defect.moveId].critique = donor;
  const overlayValidation = validatePublicationTimeoutRecoveryShardOutput(overlay, packet);
  assertV4(overlayValidation.status === "passed", `context ${contextIndex}: an additional validation category remains after in-memory isolation overlay`);
  contextDiagnoses.push({ contextIndex, debateNumber: output.debateNumber, shardId: output.shardId, side: output.side, preservedOutput: files[`output${contextIndex}`], preservedOutputSha256: sha256(bytes[`output${contextIndex}`]), status: "rejected-complete-shard-output", diagnosedValidationCategory: "critique-word-count-above-130", defects, inMemoryIsolationOverlayOnly: true, overlayPersisted: false, overlayAcceptedAsContent: false, allOtherDeterministicShardValidationCategoriesPassedUnderIsolationOverlay: true });
}
const diagnosis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-09-publication-timeout-recovery-failure-diagnosis",
  protocolId: execution.protocolId,
  status: "frozen-diagnosed-five-overlong-critiques-across-two-rejected-shards",
  diagnosedAt, productionCanary: false, batchNumber: 9, stagingOnly: true,
  preservedBoundary: { contextsPlanned: 8, contextsAttempted: 3, contextsAccepted: 1, contextsRejected: 2, contextsUnattempted: 5, acceptedContextIndexes: [0], rejectedContextIndexes: [1, 2], unattemptedContextIndexes: [3, 4, 5, 6, 7], attempts: 3, retries: 0, timeoutExtensions: 0, recursiveCorrections: 0, meteredApiCostUsd: 0, paidServiceCalls: 0 },
  acceptedContext0Preserved: { debateNumber: "166", side: "pro", output: files.output0, outputSha256: sha256(bytes.output0), validation: files.validation0, validationSha256: sha256(bytes.validation0) },
  rejectedContexts: contextDiagnoses,
  defectTotals: { rejectedShards: 2, overlongCritiques: 5, excessWordsMinimum: 1, excessWordsMaximum: 2, unexpectedValidationCategoriesUnderIsolationOverlay: 0 },
  prospectiveMinimumRecoveryOnly: { prepared: false, activated: false, modelContextsExecuted: 0, failedOutputsMayServeOnlyAsImmutableBasesIfSeparatelyAuthorized: true, minimumFieldDisjointRepairPackets: 3, partition: [{ debateNumber: "166", side: "con", fields: expected.get(1).map((row) => `moveProse.${row.id}.critique`) }, { debateNumber: "183", side: "pro", fields: expected.get(2).slice(0, 2).map((row) => `moveProse.${row.id}.critique`) }, { debateNumber: "183", side: "pro", fields: expected.get(2).slice(2).map((row) => `moveProse.${row.id}.critique`) }], resumeOnlyUnattemptedContextIndexesAfterAllRepairsPass: [3, 4, 5, 6, 7] },
  controls: { diagnosisUsedOnlyPreservedRecordsAndLocalEvidence: true, rejectedOutputsModified: false, validationThresholdsModified: false, validatorModified: false, repairPacketsPrepared: false, modelExecutionDuringDiagnosis: false, paidServicesUsed: false, scoresChanged: false, sourcesChanged: false, acceptedFieldsChanged: false },
  sourceHashes: Object.fromEntries(Object.entries(files).map(([key, file]) => [file, sha256(bytes[key])])),
  nextRequiredAction: "obtain-explicit-recursive-recovery-authorization-for-three-field-disjoint-critique-repair-contexts-and-five-context-resumption"
};
const outputPath = `${ROOT}/failure-diagnosis.json`;
if (shouldWrite) await writeFile(path.resolve(outputPath), `${JSON.stringify(diagnosis, null, 2)}\n`);
console.log(JSON.stringify({ status: diagnosis.status, acceptedContexts: 1, rejectedContexts: 2, overlongCritiques: 5, prospectiveMinimumRepairPackets: 3, unattemptedContexts: 5, modelExecutionDuringDiagnosis: false, costUsd: 0, nextRequiredAction: diagnosis.nextRequiredAction }, null, 2));
