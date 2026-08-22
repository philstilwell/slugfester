#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { wordCount } from "./lib/v388-reconstruction.mjs";
import { validatePostCanaryBatch05PublicationOutput } from "./lib/assessment-production-post-canary-batch-05-publication-validation.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");

const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-05/publication-reconstruction";
const RESUMPTION = `${ROOT}/resumption-1`;
const DIAGNOSIS = `${RESUMPTION}/failure-diagnosis.json`;
const paths = {
  preparation: `${RESUMPTION}/execution-preparation-manifest.json`,
  activation: `${RESUMPTION}/execution-activation.json`,
  execution: `${RESUMPTION}/model-execution.json`,
  analysis: `${RESUMPTION}/analysis.json`,
  output189: `${RESUMPTION}/outputs/debate-189.json`,
  validation189: `${RESUMPTION}/validations/debate-189.json`,
  provenance189: `${RESUMPTION}/provenance/debate-189.json`,
  packet189: `${ROOT}/packets/debate-189.json`,
  schema189: `${ROOT}/schemas/debate-189.schema.json`,
  packet109: `${ROOT}/packets/debate-109.json`,
  schema109: `${ROOT}/schemas/debate-109.schema.json`,
  standingAuthorization:
    "docs/assessment-production/post-canary-continuation-v1/batch-05/standing-authorization.json",
  validator: "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  batchValidator: "scripts/lib/assessment-production-post-canary-batch-05-publication-validation.mjs",
  diagnostic: "scripts/diagnose-assessment-production-post-canary-batch-05-publication-resumption-failures.mjs"
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
if (shouldWrite) assertV4(!(await exists(DIAGNOSIS)), `${DIAGNOSIS} already exists`);
const bytes = Object.fromEntries(await Promise.all(
  Object.entries(paths).map(async ([key, file]) => [key, await readFile(path.resolve(file))])
));
const json = (key) => JSON.parse(bytes[key]);
const preparation = json("preparation");
const activation = json("activation");
const execution = json("execution");
const analysis = json("analysis");
const output189 = json("output189");
const validation189 = json("validation189");
const provenance189 = json("provenance189");
const packet189 = json("packet189");
const packet109 = json("packet109");

assertV4(
  preparation.status ===
      "frozen-seven-untouched-post-canary-batch-05-publication-resumption-contexts-prepared-under-standing-authorization" &&
    activation.status ===
      "frozen-seven-untouched-post-canary-batch-05-publication-resumption-contexts-authorized-under-standing-authorization" &&
    execution.status === "post-canary-batch-05-publication-resumption-complete-with-failure" &&
    execution.contextsPlanned === 7 && execution.contextsAttempted === 3 &&
    execution.contextsUnattempted === 4 && execution.validContexts === 1 &&
    execution.invalidContexts === 2 && execution.attempts === 3 &&
    execution.retries === 0 && execution.timeoutExtensions === 0 &&
    execution.correctionContexts === 0 && execution.modelAuthoredScores === 0 &&
    canonicalJson(execution.unattemptedContextIndexes) === canonicalJson([3, 4, 5, 6]) &&
    analysis.status === "post-canary-batch-05-publication-resumption-failed-validation",
  "the preserved Batch 5 publication-resumption failure boundary changed"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `${file}: frozen resumption source drifted`);
}

const result189 = execution.results.find(({ debateNumber }) => debateNumber === "189");
const result109 = execution.results.find(({ debateNumber }) => debateNumber === "109");
assertV4(
  result189?.status === "output-validation-failed" &&
    result189.attemptCount === 1 && result189.retryCount === 0 &&
    result189.timeoutExtensionCount === 0 && result189.correctionContextCount === 0 &&
    result189.outputSha256 === sha256(bytes.output189) &&
    result189.validationSha256 === sha256(bytes.validation189) &&
    result189.provenanceSha256 === sha256(bytes.provenance189) &&
    validation189.status === "failed" &&
    provenance189.outputSha256 === result189.outputSha256,
  "the preserved Debate 189 validation failure changed"
);
assertV4(
  result109?.status === "timed-out" && result109.timedOut === true &&
    result109.terminationSignal === "SIGTERM" && result109.attemptCount === 1 &&
    result109.retryCount === 0 && result109.timeoutExtensionCount === 0 &&
    result109.correctionContextCount === 0 && result109.outputWritten === false &&
    result109.validationWritten === false && result109.provenanceWritten === false &&
    result109.stdoutSha256 === sha256(Buffer.alloc(0)),
  "the preserved Debate 109 timeout changed"
);

const labels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
const critiqueRows = packet189.moves.map((move) => {
  const critique = output189.moveProse[move.moveId].critique.trim();
  const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
  return {
    moveId: move.moveId,
    path: `moveProse.${move.moveId}.critique`,
    words: wordCount(critique), characters: critique.length,
    sentences: sentences.length,
    orderedLabelsPassed: sentences.length === 4 &&
      sentences.every((sentence, index) => sentence.toLowerCase().startsWith(labels[index])),
    terminalPunctuationPassed: sentences.every((sentence) =>
      /[.!?]["')\]]?$/.test(sentence.trim()))
  };
});
const invalidCritiques = critiqueRows.filter((row) =>
  row.words < 105 || row.words > 130 || row.characters < 880 ||
  row.sentences !== 4 || !row.orderedLabelsPassed || !row.terminalPunctuationPassed
).map((row) => ({
  ...row,
  excessWordsAboveAcceptanceMaximum: Math.max(0, row.words - 130)
}));
const expectedCritiques = [
  ["con-information-agency-transition", 131, 1],
  ["pro-information-insufficient-without-cellular-matter", 132, 2],
  ["pro-autocatalysis-not-cellular-pathway", 131, 1],
  ["con-natural-molybdate-information", 131, 1],
  ["pro-growing-cell-knowledge-widens-target", 137, 7],
  ["con-copying-selection-pathway", 131, 1],
  ["pro-minimal-cell-complexity-gap", 133, 3],
  ["con-objective-molecular-complexity-theory", 133, 3]
];
assertV4(canonicalJson(invalidCritiques.map((row) => [
  row.moveId, row.words, row.excessWordsAboveAcceptanceMaximum
])) === canonicalJson(expectedCritiques),
"the Debate 189 critique-failure set changed");
assertV4(critiqueRows.every((row) => row.characters >= 880 && row.sentences === 4 &&
  row.orderedLabelsPassed && row.terminalPunctuationPassed),
"Debate 189 has an additional critique-integrity category");

const diagnostic189 = structuredClone(output189);
let hypotheticalWordsRemoved = 0;
for (const row of invalidCritiques) {
  const sentences = diagnostic189.moveProse[row.moveId].critique.trim()
    .split(/(?<=[.!?])\s+/).filter(Boolean);
  while (wordCount(sentences.join(" ")) > 130) {
    const tokens = sentences[1].split(/\s+/);
    assertV4(tokens.length > 6, `${row.moveId}: diagnostic shortening failed`);
    tokens.splice(tokens.length - 2, 1);
    sentences[1] = tokens.join(" ");
    hypotheticalWordsRemoved += 1;
  }
  diagnostic189.moveProse[row.moveId].critique = sentences.join(" ");
}
assertV4(hypotheticalWordsRemoved === 19, "Debate 189 diagnostic removal count changed");
const replay189 = validatePostCanaryBatch05PublicationOutput(diagnostic189, packet189);
assertV4(replay189.status === "passed" && replay189.moves === 19 &&
  replay189.critiques === 19 && replay189.minimumCritiqueCharacters >= 880 &&
  replay189.quoteExactSourceMatches === 2 &&
  replay189.calculatedScoresAuthoredByModel === 0 && replay189.lockedScoresUnchanged === true,
"the Debate 189 diagnostic replay did not isolate eight critique fields");
const repairPartitions189 = Array.from({ length: 4 }, (_, index) =>
  invalidCritiques.slice(index * 2, index * 2 + 2).map(({ path: field }) => field)
);
assertV4(repairPartitions189.length === 4 &&
  repairPartitions189.every((fields) => fields.length === 2) &&
  new Set(repairPartitions189.flat()).size === 8,
"the minimum four-packet Debate 189 repair partition changed");

const proMoveIds109 = packet109.moves.filter(({ side }) => side === "pro").map(({ moveId }) => moveId);
const conMoveIds109 = packet109.moves.filter(({ side }) => side === "con").map(({ moveId }) => moveId);
assertV4(proMoveIds109.length === 9 && conMoveIds109.length === 10 &&
  new Set([...proMoveIds109, ...conMoveIds109]).size === 19,
"the Debate 109 side partition changed");
const contentFields109 = [
  "summary", "representativeQuotes.pro", "representativeQuotes.con",
  ...packet109.moves.map(({ moveId }) => `moveProse.${moveId}`),
  "overallCommentary.pro", "overallCommentary.con",
  "aiExtension.pro", "aiExtension.con"
];
const shardFields109 = [
  ["summary", "representativeQuotes.pro",
    ...proMoveIds109.map((moveId) => `moveProse.${moveId}`),
    "overallCommentary.pro", "aiExtension.pro"],
  ["representativeQuotes.con",
    ...conMoveIds109.map((moveId) => `moveProse.${moveId}`),
    "overallCommentary.con", "aiExtension.con"]
];
assertV4(shardFields109[0].length === 13 && shardFields109[1].length === 13 &&
  canonicalJson([...shardFields109.flat()].sort()) === canonicalJson([...contentFields109].sort()),
"the Debate 109 recovery shards are not field-disjoint and complete");

const diagnosis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-05-publication-resumption-failure-diagnosis",
  status: "frozen-diagnosed-batch-05-debate-189-validation-and-debate-109-timeout",
  frozenAt, productionCanary: false, batchNumber: 5, stagingOnly: true,
  preservedGate: {
    contextsPlanned: 7, contextsAttempted: 3, contextsValid: 1,
    contextsInvalid: 2, contextsUnattempted: 4,
    validDebates: ["132"], failedDebates: ["189", "109"],
    unattemptedDebates: ["179", "05", "42", "59"],
    retries: 0, timeoutExtensions: 0, correctionContexts: 0,
    modelAuthoredScores: 0
  },
  debate189: {
    classification: "eight-critique-word-boundary-failures",
    originalAttemptCount: 1, acceptedOutput: false,
    originalOutputPreserved: true, outputSha256: result189.outputSha256,
    failedFields: invalidCritiques,
    failedFieldCount: 8, excessWordsTotal: 19,
    diagnosticReplay: {
      originalOutputModified: false, persistedCorrectedOutput: false,
      hypotheticalWordsRemoved, result: replay189
    },
    minimumBoundedRepair: {
      operation: "four-isolated-two-field-publication-repair-packets",
      reasonMinimum: "Eight diagnosed writable fields with a maximum of two fields per repair packet require four packets.",
      packetCount: 4, partition: repairPartitions189,
      attemptsPerPacket: 1, retries: 0, timeoutExtensions: 0,
      mergeRule: "Replace only the eight authorized critiques in original move order, preserve every other field, then validate the complete Debate 189 output."
    }
  },
  debate109: {
    classification: "timeout-before-result-without-reusable-partial-output",
    originalAttemptCount: 1, acceptedOutputs: 0,
    failedPartialOutputReusable: false, outputWritten: false, stdoutEmpty: true,
    timedOut: true, terminationSignal: "SIGTERM",
    frozenTimeoutMs: activation.executionPolicy.timeoutMsPerContext,
    recordedElapsedMs: result109.elapsedMs,
    retryCount: 0, timeoutExtensionCount: 0,
    workload: {
      packetBytes: preparation.contexts[2].packetBytes,
      schemaBytes: preparation.contexts[2].schemaBytes,
      copiedInputBytes: result109.copiedInputBytes,
      moves: packet109.moves.length, proMoves: proMoveIds109.length,
      conMoves: conMoveIds109.length,
      modelAuthoredContentFields: contentFields109.length
    },
    finding: {
      evidence: "The context produced no result file or stdout, reached the frozen timeout, and ended with SIGTERM without an extension.",
      inference: "The monolithic 19-move publication workload exceeded the frozen runtime; preserved evidence establishes no semantic, schema, source, identity, or score defect."
    },
    minimumBoundedResumption: {
      operation: "partition-original-context-into-two-side-based-field-disjoint-score-locked-shards",
      reasonMinimum: "One context would repeat the failed workload; two is the smallest nontrivial partition, and the 26 content fields divide evenly into two 13-field shards.",
      shardCount: 2,
      shards: [
        { shardId: "shard-01-pro-shared", side: "pro", moveIds: proMoveIds109,
          writableFields: shardFields109[0], writableFieldCount: 13 },
        { shardId: "shard-02-con", side: "con", moveIds: conMoveIds109,
          writableFields: shardFields109[1], writableFieldCount: 13 }
      ],
      fixedDeterministicFields: [
        "schemaVersion", "protocolId", "debateNumber", "debateId",
        "assessmentModel", "completedAt", "productionCanary", "stagingOnly",
        "displayContract", "audit"
      ],
      everyOriginalContentFieldAcceptedExactlyOnce: true,
      mergeRule: "Restore the original publication schema; take each content field from exactly one accepted shard; derive fixed contract fields deterministically; use the later shard completion timestamp; validate against the original packet.",
      originalPacketPreserved: true, originalSchemaPreserved: true,
      originalValidatorMeaningPreserved: true, originalFailedPartialOutputIgnored: true,
      attemptsPerShard: 1, retries: 0, timeoutExtensions: 0
    }
  },
  combinedRecovery: {
    model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low",
      authentication: "ChatGPT subscription" },
    contexts: 6, schedulerRamp: [1, 2], maximumParallelContexts: 2,
    attemptsPerContext: 1, retries: 0, timeoutExtensions: 0,
    recursiveCorrections: 0, directIncrementalCostUsdMaximum: 0
  },
  userAuthorization: {
    instruction: "I authorize deterministic diagnosis of the preserved Batch 5 Debate 189 publication-validation failure and Debate 109 publication timeout. Freeze and push the diagnosis, then prepare and execute one bounded Debate 189 field-level repair and the minimum hash-locked, field-disjoint Debate 109 resumption shards required by the diagnosis. Use 5.6 Sol with low reasoning through my ChatGPT subscription, one attempt per new context, no retries or timeout extensions, and a direct incremental cost cap of $0. Preserve all accepted outputs, sources, identities, scores, and unrelated fields. If both debates pass complete validation, resume exactly the four unattempted contexts, replay the ten-debate cohort, commit and push successful checkpoints, and resume the Batch 5 standing authorization. Stop on any further failed output, paid service, unexpected validation category, retry, protected-field change, or action outside this authorization.",
    directIncrementalCostUsdMaximum: 0
  },
  sourceHashes: Object.fromEntries(Object.entries(paths).map(([key, file]) =>
    [file, sha256(bytes[key])])),
  authorization: {
    recoveryPreparation: true, recoveryModelExecution: false,
    deterministicMergeAndValidation: false, fourContextResumption: false,
    paidServices: false, productionMutation: false, nextBatchSelection: false
  },
  directIncrementalCostUsd: 0,
  nextAuthorizedAction:
    "prepare-four-debate-189-repair-packets-and-two-debate-109-field-disjoint-resumption-shards"
};
const serialized = `${JSON.stringify(diagnosis, null, 2)}\n`;
if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(DIAGNOSIS)), { recursive: true });
  await writeFile(path.resolve(DIAGNOSIS), serialized);
} else if (await exists(DIAGNOSIS)) {
  assertV4(String(await readFile(path.resolve(DIAGNOSIS))) === serialized,
    "the frozen Batch 5 publication-resumption diagnosis changed");
}
console.log(JSON.stringify({
  status: shouldWrite ? diagnosis.status : "preview",
  debate189: { failedFields: 8, repairPackets: 4, hypotheticalReplayPassed: true },
  debate109: { classification: diagnosis.debate109.classification, shards: 2,
    fieldsPerShard: [13, 13], failedPartialOutputReusable: false },
  combinedRecoveryContexts: 6, retries: 0, timeoutExtensions: 0,
  directIncrementalCostUsd: 0, nextAuthorizedAction: diagnosis.nextAuthorizedAction
}, null, 2));
