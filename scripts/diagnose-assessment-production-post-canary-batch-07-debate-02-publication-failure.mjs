#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { validatePostCanaryBatch07PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-07-publication-validation.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--frozen-at");
const frozenAt = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires ISO");
const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-07/publication-reconstruction";
const RESUMPTION = `${ROOT}/resumption-3`;
const OUTPUT = `${RESUMPTION}/outputs/debate-02.json`;
const VALIDATION = `${RESUMPTION}/validations/debate-02.json`;
const PROVENANCE = `${RESUMPTION}/provenance/debate-02.json`;
const EXECUTION = `${RESUMPTION}/model-execution.json`;
const ANALYSIS = `${RESUMPTION}/analysis.json`;
const PACKET = `${ROOT}/packets/debate-02.json`;
const TARGET = "aiExtension.con.premises[1].novelty.explanation";
const DIAGNOSIS = `${RESUMPTION}/repair-1/failure-diagnosis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [outputBytes, validationBytes, provenanceBytes, executionBytes, analysisBytes, packetBytes] =
  await Promise.all([OUTPUT, VALIDATION, PROVENANCE, EXECUTION, ANALYSIS, PACKET]
    .map((file) => readFile(path.resolve(file))));
const output = JSON.parse(outputBytes);
const validation = JSON.parse(validationBytes);
const provenance = JSON.parse(provenanceBytes);
const execution = JSON.parse(executionBytes);
const analysis = JSON.parse(analysisBytes);
const packet = JSON.parse(packetBytes);
const result = execution.results.find((row) => row.debateNumber === "02");
assertV4(validation.status === "failed" &&
  validation.validationMessage?.startsWith("Error: ai02-con-premise-2: novelty explanation too short") &&
  validation.outputSha256 === sha256(outputBytes) && provenance.outputSha256 === sha256(outputBytes) &&
  result?.status === "output-validation-failed" && result.outputSha256 === sha256(outputBytes) &&
  execution.contextsAttempted === 3 && execution.contextsUnattempted === 2 &&
  canonicalJson(execution.unattemptedContextIndexes) === canonicalJson([3, 4]) &&
  analysis.status === "batch-07-publication-resumption-3-or-cohort-validation-failed",
"the preserved Debate 02 failure record changed");
const target = output.aiExtension?.con?.premises?.[1];
assertV4(target?.id === "ai02-con-premise-2" &&
  wordCount(target.novelty?.explanation) === 7 &&
  target.novelty.classification === "extends" &&
  canonicalJson(target.novelty.sourceMoveIds) ===
    canonicalJson(["con-creator-to-christianity-gap", "pro-cosmology-personal-cause"]),
"the reported Debate 02 novelty item changed");
const transient = structuredClone(output);
transient.aiExtension.con.premises[1].novelty.explanation =
  "This systematically extends the transcript's creator-to-Christianity nonentailment distinction.";
const transientValidation = validatePostCanaryBatch07PublicationOutput(transient, packet);
assertV4(transientValidation.status === "passed" && transientValidation.moves === 21 &&
  wordCount(transient.aiExtension.con.premises[1].novelty.explanation) === 8,
"the single-field transient diagnostic replay failed");
const maskedOriginal = structuredClone(output);
const maskedTransient = structuredClone(transient);
maskedOriginal.aiExtension.con.premises[1].novelty.explanation = "__DIAGNOSED_FIELD__";
maskedTransient.aiExtension.con.premises[1].novelty.explanation = "__DIAGNOSED_FIELD__";
assertV4(canonicalJson(maskedOriginal) === canonicalJson(maskedTransient),
  "the diagnostic overlay changed a second field");
const sourceHashes = Object.fromEntries([
  [OUTPUT, outputBytes], [VALIDATION, validationBytes], [PROVENANCE, provenanceBytes],
  [EXECUTION, executionBytes], [ANALYSIS, analysisBytes], [PACKET, packetBytes],
  ["scripts/lib/v4-lean-production.mjs", await readFile(path.resolve("scripts/lib/v4-lean-production.mjs"))],
  ["scripts/lib/v388-reconstruction.mjs", await readFile(path.resolve("scripts/lib/v388-reconstruction.mjs"))],
  ["scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
    await readFile(path.resolve("scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs"))],
  ["scripts/lib/assessment-production-post-canary-batch-07-publication-validation.mjs",
    await readFile(path.resolve("scripts/lib/assessment-production-post-canary-batch-07-publication-validation.mjs"))],
  ["scripts/diagnose-assessment-production-post-canary-batch-07-debate-02-publication-failure.mjs",
    await readFile(path.resolve("scripts/diagnose-assessment-production-post-canary-batch-07-debate-02-publication-failure.mjs"))]
].map(([file, bytes]) => [file, sha256(bytes)]));
const diagnosis = { schemaVersion:
    "1.0-assessment-production-post-canary-batch-07-debate-02-publication-failure-diagnosis",
  status: "frozen-diagnosed-batch-07-debate-02-single-novelty-explanation-length-defect",
  frozenAt, productionCanary: false, batchNumber: 7, stagingOnly: true,
  debateNumber: "02", debateId: packet.debateId,
  classification: "single-ai-extension-novelty-explanation-below-eight-word-minimum",
  preservedFailure: { output: OUTPUT, outputSha256: sha256(outputBytes),
    validation: VALIDATION, provenance: PROVENANCE, execution: EXECUTION,
    contextsAttempted: 3, contextsAccepted: 2, contextsRejected: 1,
    contextsUnattempted: 2, unattemptedDebates: ["182", "56"],
    attempts: 3, retries: 0, timeoutExtensions: 0 },
  diagnosedField: { path: TARGET, itemId: target.id,
    originalValue: target.novelty.explanation, originalWords: 7,
    acceptanceMinimumWords: 8, classification: target.novelty.classification,
    sourceMoveIds: target.novelty.sourceMoveIds },
  deterministicReplay: { transientCopyOnly: true, originalOutputModified: false,
    validatorModified: false, fieldsOverlaid: 1, overlayWords: 8,
    completeDebateValidation: transientValidation,
    immutableFieldsChanged: 0, calculatedScoresAuthoredByModel: 0,
    lockedScoresUnchanged: true },
  conclusion: { confirmedOnlyReportedDefect: true, writableFieldsRequired: 1,
    minimumRepairContexts: 1, otherFieldsAuthorized: false },
  userAuthorization: { instruction:
    "Diagnose Debate 02 and, only if the reported novelty-explanation length defect is the sole defect, prepare and execute one score-locked single-field repair",
    model: "5.6 Sol", reasoningEffort: "low", authentication: "ChatGPT subscription",
    attempts: 1, retriesMaximum: 0, timeoutExtensionsMaximum: 0,
    directIncrementalCostUsdMaximum: 0 },
  sourceHashes, authorization: { singleFieldRepairPreparation: true,
    repairModelExecution: false, twoContextResumption: false,
    paidServices: false, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: "prepare-one-score-locked-debate-02-novelty-explanation-repair-context" };
if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(DIAGNOSIS)), { recursive: true });
  await writeFile(path.resolve(DIAGNOSIS), `${JSON.stringify(diagnosis, null, 2)}\n`);
}
console.log(JSON.stringify({ status: diagnosis.status, debateNumber: "02",
  diagnosedField: TARGET, originalWords: 7, completeTransientReplay: "passed",
  immutableFieldsChanged: 0, modelContextsExecuted: 0,
  directIncrementalCostUsd: 0, nextAuthorizedAction: diagnosis.nextAuthorizedAction }, null, 2));
