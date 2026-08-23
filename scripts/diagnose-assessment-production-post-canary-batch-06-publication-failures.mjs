#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_06_PUBLICATION_DEBATES,
  POST_CANARY_BATCH_06_PUBLICATION_ROOT
} from "./lib/assessment-production-post-canary-batch-06-publication.mjs";
import {
  validatePostCanaryBatch06PublicationOutput
} from "./lib/assessment-production-post-canary-batch-06-publication-validation.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires ISO");

const ROOT = POST_CANARY_BATCH_06_PUBLICATION_ROOT;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const DIAGNOSIS = `${ROOT}/failure-diagnosis.json`;
const STANDING_AUTHORIZATION =
  "docs/assessment-production/post-canary-continuation-v1/batch-06/standing-authorization.json";
const REJECTED = Object.freeze(["141", "168", "135", "143"]);
const ACCEPTED = Object.freeze(["73", "36", "38", "97", "06", "169"]);
const labels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

assertV4(!(await exists(DIAGNOSIS)), `${DIAGNOSIS} already exists`);
const files = [ACTIVATION, EXECUTION, ANALYSIS, STANDING_AUTHORIZATION];
for (const debateNumber of POST_CANARY_BATCH_06_PUBLICATION_DEBATES) {
  files.push(
    `${ROOT}/outputs/debate-${debateNumber}.json`,
    `${ROOT}/packets/debate-${debateNumber}.json`,
    `${ROOT}/validations/debate-${debateNumber}.json`,
    `${ROOT}/provenance/debate-${debateNumber}.json`
  );
}
const bytes = Object.fromEntries(await Promise.all(files.map(async (file) =>
  [file, await readFile(path.resolve(file))])));
const parsed = (file) => JSON.parse(bytes[file]);
const activation = parsed(ACTIVATION);
const execution = parsed(EXECUTION);
const analysis = parsed(ANALYSIS);

assertV4(
  activation.status === "frozen-ten-post-canary-batch-06-publication-contexts-authorized" &&
    execution.status === "post-canary-batch-06-publication-gate-complete-with-failure" &&
    execution.contextsPlanned === 10 && execution.contextsAttempted === 10 &&
    execution.contextsUnattempted === 0 && execution.validContexts === 6 &&
    execution.invalidContexts === 4 && execution.attempts === 10 &&
    execution.retries === 0 && execution.timeoutExtensions === 0 &&
    execution.correctionContexts === 0 &&
    canonicalJson(execution.results.map((row) => row.debateNumber)) ===
      canonicalJson(POST_CANARY_BATCH_06_PUBLICATION_DEBATES) &&
    canonicalJson(execution.results.filter((row) => row.gateAcceptancePassed)
      .map((row) => row.debateNumber)) === canonicalJson(ACCEPTED) &&
    canonicalJson(execution.results.filter((row) => !row.gateAcceptancePassed)
      .map((row) => row.debateNumber)) === canonicalJson(REJECTED) &&
    analysis.status === "post-canary-batch-06-publication-output-gate-failed" &&
    analysis.execution?.validContexts === 6 && analysis.execution?.invalidContexts === 4,
  "the preserved Batch 6 publication failure boundary changed"
);

const acceptedOutputs = [];
const rejectedOutputs = [];
for (const result of execution.results) {
  const debateNumber = result.debateNumber;
  const outputPath = `${ROOT}/outputs/debate-${debateNumber}.json`;
  const validationPath = `${ROOT}/validations/debate-${debateNumber}.json`;
  const provenancePath = `${ROOT}/provenance/debate-${debateNumber}.json`;
  const validation = parsed(validationPath);
  const provenance = parsed(provenancePath);
  assertV4(
    result.attemptCount === 1 && result.retryCount === 0 &&
      result.timeoutExtensionCount === 0 && result.correctionContextCount === 0 &&
      result.outputSha256 === sha256(bytes[outputPath]) &&
      result.validationSha256 === sha256(bytes[validationPath]) &&
      result.provenanceSha256 === sha256(bytes[provenancePath]) &&
      validation.outputSha256 === result.outputSha256 &&
      provenance.outputSha256 === result.outputSha256,
    `${debateNumber}: preserved output audit changed`
  );
  if (result.gateAcceptancePassed) {
    const replay = validatePostCanaryBatch06PublicationOutput(
      parsed(outputPath), parsed(`${ROOT}/packets/debate-${debateNumber}.json`)
    );
    assertV4(validation.status === "passed" && replay.status === "passed",
      `${debateNumber}: accepted output no longer validates`);
    acceptedOutputs.push({ debateNumber, outputSha256: result.outputSha256,
      validationSha256: result.validationSha256, provenanceSha256: result.provenanceSha256 });
  } else {
    assertV4(validation.status === "failed" && result.status === "output-validation-failed",
      `${debateNumber}: rejected output boundary changed`);
    rejectedOutputs.push({ debateNumber, outputSha256: result.outputSha256,
      validationSha256: result.validationSha256, provenanceSha256: result.provenanceSha256,
      firstReportedValidationMessage: validation.validationMessage.split("\n", 1)[0] });
  }
}

function trimCritiqueForDiagnosticReplay(critique) {
  const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
  let wordsRemoved = 0;
  while (wordCount(sentences.join(" ")) > 130) {
    const words = sentences[1].split(/\s+/);
    assertV4(words.length > 4, "diagnostic trimming exhausted the second sentence");
    words.splice(words.length - 2, 1);
    sentences[1] = words.join(" ");
    wordsRemoved += 1;
  }
  return { critique: sentences.join(" "), wordsRemoved };
}

const failedFieldsByDebate = {};
const diagnosticReplays = [];
let hypotheticalWordsRemoved = 0;
for (const debateNumber of REJECTED) {
  const output = parsed(`${ROOT}/outputs/debate-${debateNumber}.json`);
  const packet = parsed(`${ROOT}/packets/debate-${debateNumber}.json`);
  const moveById = new Map(packet.moves.map((move) => [move.moveId, move]));
  const failedFields = [];
  const diagnosticCopy = structuredClone(output);

  for (const side of ["pro", "con"]) {
    const quote = output.representativeQuotes[side];
    const move = moveById.get(quote.sourceMoveId);
    assertV4(move && move.side === side && move.quoteEligible,
      `${debateNumber}/${side}: quote source identity changed`);
    if (!move.sourceExcerpt.includes(quote.text)) {
      const replacement = move.sourceExcerpt.split(/\s+/).slice(0, 8).join(" ");
      assertV4(wordCount(replacement) >= 3 && wordCount(replacement) <= 18 &&
        move.sourceExcerpt.includes(replacement), `${debateNumber}/${side}: diagnostic quote failed`);
      failedFields.push({ type: "representative-quote-exact-source-substring",
        path: `representativeQuotes.${side}.text`, side, sourceMoveId: quote.sourceMoveId,
        originalText: quote.text, originalWords: wordCount(quote.text),
        sourceExcerptSha256: sha256(Buffer.from(move.sourceExcerpt)),
        diagnosedReason: "quote-is-not-an-exact-source-substring" });
      diagnosticCopy.representativeQuotes[side].text = replacement;
    }
  }

  for (const move of packet.moves) {
    const critique = output.moveProse?.[move.moveId]?.critique;
    assertV4(typeof critique === "string", `${debateNumber}/${move.moveId}: critique missing`);
    const words = wordCount(critique);
    if (words < 105 || words > 130) {
      const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
      const field = { type: "critique-word-boundary", path: `moveProse.${move.moveId}.critique`,
        moveId: move.moveId, words, characters: critique.length, sentences: sentences.length,
        orderedLabelsPassed: sentences.length === 4 && labels.every((label, index) =>
          sentences[index].toLowerCase().startsWith(label)),
        terminalPunctuationPassed: sentences.length === 4 && sentences.every((sentence) =>
          /[.!?]["')\]]?$/.test(sentence.trim())),
        excessWordsAboveAcceptanceMaximum: Math.max(0, words - 130),
        diagnosedReason: words > 130 ? "critique-exceeds-130-word-maximum" :
          "critique-below-105-word-minimum" };
      assertV4(words > 130 && critique.length >= 880 && field.sentences === 4 &&
        field.orderedLabelsPassed && field.terminalPunctuationPassed,
      `${debateNumber}/${move.moveId}: unexpected critique failure category`);
      failedFields.push(field);
      const trimmed = trimCritiqueForDiagnosticReplay(critique);
      diagnosticCopy.moveProse[move.moveId].critique = trimmed.critique;
      hypotheticalWordsRemoved += trimmed.wordsRemoved;
    }
  }

  const replay = validatePostCanaryBatch06PublicationOutput(diagnosticCopy, packet);
  assertV4(replay.status === "passed", `${debateNumber}: diagnostic full-output replay failed`);
  failedFieldsByDebate[debateNumber] = failedFields;
  diagnosticReplays.push({ debateNumber, originalOutputModified: false,
    correctedOutputPersisted: false, transientCopyOnly: true,
    diagnosedFieldCount: failedFields.length, result: replay });
}

const expectedCounts = { "141": 7, "168": 2, "135": 22, "143": 18 };
for (const [debateNumber, expected] of Object.entries(expectedCounts)) assertV4(
  failedFieldsByDebate[debateNumber].length === expected,
  `${debateNumber}: diagnosed field count changed`);
const failedFields = REJECTED.flatMap((debateNumber) =>
  failedFieldsByDebate[debateNumber].map((field) => ({ debateNumber, ...field })));
assertV4(failedFields.length === 49 &&
  failedFields.filter((field) => field.type === "critique-word-boundary").length === 48 &&
  failedFields.filter((field) => field.type === "representative-quote-exact-source-substring").length === 1,
"the exact 49-field Batch 6 publication failure inventory changed");

const repairContexts = [];
for (const debateNumber of REJECTED) {
  const fields = failedFieldsByDebate[debateNumber];
  for (let offset = 0; offset < fields.length; offset += 2) {
    const contextIndex = repairContexts.length;
    repairContexts.push({ contextIndex, packetId: `debate-${debateNumber}-packet-${Math.floor(offset / 2)}`,
      debateNumber, writableFields: fields.slice(offset, offset + 2).map((field) => field.path),
      writableFieldCount: fields.slice(offset, offset + 2).length });
  }
}
assertV4(repairContexts.length === 25 &&
  repairContexts.every((row) => row.writableFieldCount >= 1 && row.writableFieldCount <= 2) &&
  new Set(repairContexts.flatMap((row) => row.writableFields)).size === 49,
"the minimum 25-packet repair partition changed");

const diagnosis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-06-publication-failure-diagnosis",
  status: "frozen-diagnosed-batch-06-publication-49-field-formatting-failure",
  frozenAt, productionCanary: false, batchNumber: 6, stagingOnly: true,
  classification: "forty-eight-critique-word-overruns-and-one-nonexact-representative-quote",
  preservedExecution: { contextsPlanned: 10, contextsAttempted: 10,
    contextsUnattempted: 0, acceptedContexts: 6, rejectedContexts: 4,
    attempts: 10, retries: 0, timeoutExtensions: 0, correctionContexts: 0,
    acceptedOutputs, rejectedOutputs },
  failedFieldCount: 49,
  failedCritiqueCount: 48,
  failedQuoteCount: 1,
  failedFieldsByDebate,
  diagnosticReplays,
  diagnosticReplayControls: { originalOutputsModified: false,
    correctedOutputsPersisted: false, transientCopiesOnly: true,
    hypotheticalWordsRemoved, validatorUnchanged: true,
    everyRejectedDebatePassedAfterOnlyDiagnosedTransientSubstitutions: true },
  minimumBoundedRepair: { operation: "twenty-five-isolated-field-disjoint-score-locked-publication-repair-contexts",
    reasonMinimum: "Forty-nine diagnosed writable fields with a maximum of two fields per packet require twenty-five packets.",
    packetCount: 25, writableFieldsMaximumPerPacket: 2, repairContexts,
    attemptsPerContext: 1, retries: 0, timeoutExtensions: 0,
    mergeRule: "Replace only each packet's explicitly authorized fields in its immutable rejected base output, preserve every other field, validate all four repaired debates, and replay the complete ten-debate cohort." },
  protectedEvidence: { sixAcceptedOutputsImmutable: true,
    fourRejectedOutputsRemainImmutableBases: true, sourcesImmutable: true,
    identitiesImmutable: true, lockedScoresImmutable: true, everyUnrelatedFieldImmutable: true,
    modelAuthoredScores: 0 },
  sourceHashes: Object.fromEntries(files.sort().map((file) => [file, sha256(bytes[file])])),
  directIncrementalCostUsd: 0,
  authorization: { repairPacketPreparation: true, repairModelExecution: false,
    deterministicMergeAndCohortReplay: false, publicationCompilation: false,
    paidServices: false, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: "prepare-and-freeze-twenty-five-batch-06-field-disjoint-publication-repair-contexts"
};

if (shouldWrite) await writeFile(path.resolve(DIAGNOSIS), `${JSON.stringify(diagnosis, null, 2)}\n`);
console.log(JSON.stringify({ status: diagnosis.status, acceptedContexts: 6,
  rejectedContexts: 4, failedFieldCount: 49, failedCritiqueCount: 48,
  failedQuoteCount: 1, repairPacketCount: 25,
  diagnosticFullOutputReplaysPassed: diagnosticReplays.length,
  directIncrementalCostUsd: 0, nextAuthorizedAction: diagnosis.nextAuthorizedAction }, null, 2));
