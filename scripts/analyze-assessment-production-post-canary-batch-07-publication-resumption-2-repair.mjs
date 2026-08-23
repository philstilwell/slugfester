#!/usr/bin/env node
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_07_RESUMPTION_2_REPAIR_ROOT,
  mergeAndValidateResumption2Repair } from
  "./lib/assessment-production-post-canary-batch-07-publication-resumption-2-repair.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
const shouldWrite = process.argv.includes("--write");
const ROOT = POST_CANARY_BATCH_07_RESUMPTION_2_REPAIR_ROOT;
const [p, a, e] = await Promise.all([
  "execution-preparation-manifest.json", "execution-activation.json", "model-execution.json"
].map((file) => readFile(path.resolve(`${ROOT}/${file}`), "utf8").then(JSON.parse)));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
for (const [file, digest] of Object.entries(a.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `repair analysis source mismatch: ${file}`);
assertV4(e.contextsPlanned === 12 && e.attempts === e.contextsAttempted && e.retries === 0 &&
  e.timeoutExtensions === 0 && e.recursiveCorrections === 0 && e.meteredApiCostUsd === 0 &&
  e.paidServiceCallsThisStage === 0 && e.modelAuthoredScores === 0,
"repair execution changed");
if (shouldWrite) for (const file of [a.artifacts.analysis, ...a.artifacts.mergedOutputs,
  a.artifacts.completeValidation, a.artifacts.mergeAudit])
  assertV4(!(await exists(file)), `${file} exists`);

const mergeByDebate = {};
const sourceByDebate = {};
let failureMessage = null;
if (e.contextsAttempted === 12 && e.validContexts === 12 && e.invalidContexts === 0 &&
    e.results.every((row) => row.gateAcceptancePassed)) {
  try {
    for (const debateNumber of ["100", "78"]) {
      const input = p.inputs.debates[debateNumber];
      const debateContexts = a.contexts.filter((row) => row.debateNumber === debateNumber);
      const baseBytes = await readFile(path.resolve(input.immutableRejectedOutput));
      const publicationPacketBytes = await readFile(path.resolve(input.publicationPacket));
      const repairPacketBytes = await Promise.all(debateContexts.map((row) => readFile(path.resolve(row.packet))));
      const repairOutputBytes = await Promise.all(debateContexts.map((row) => readFile(path.resolve(row.output))));
      for (const context of debateContexts) {
        const result = e.results.find((row) => row.contextIndex === context.contextIndex);
        assertV4(result && sha256(await readFile(path.resolve(context.output))) === result.outputSha256,
          `repair ${context.contextIndex}: output changed`);
      }
      mergeByDebate[debateNumber] = mergeAndValidateResumption2Repair({
        baseOutput: JSON.parse(baseBytes), repairOutputs: repairOutputBytes.map(JSON.parse),
        repairPackets: repairPacketBytes.map(JSON.parse),
        publicationPacket: JSON.parse(publicationPacketBytes) });
      sourceByDebate[debateNumber] = { baseBytes, repairOutputBytes, debateContexts };
    }
  } catch (error) {
    failureMessage = (error.stack ?? error.message).slice(-10000);
  }
}
const passed = ["100", "78"].every((debateNumber) =>
  mergeByDebate[debateNumber]?.fullValidation?.status === "passed");
const movesByDebate = Object.fromEntries(["100", "78"].map((debateNumber) =>
  [debateNumber, mergeByDebate[debateNumber]?.fullValidation?.moves ?? 0]));
assertV4(!passed || canonicalJson(movesByDebate) === canonicalJson({ "78": 17, "100": 19 }),
  "complete debate move totals changed");
const analysis = { schemaVersion:
    "1.0-assessment-production-post-canary-batch-07-publication-resumption-2-repair-analysis",
  protocolId: a.protocolId, status: passed
    ? "batch-07-debates-100-and-78-twelve-packet-repair-and-complete-validation-passed"
    : "batch-07-debates-100-and-78-repair-or-complete-validation-failed",
  productionCanary: false, batchNumber: 7, stagingOnly: true,
  gate: { contextsPlanned: 12, contextsAttempted: e.contextsAttempted,
    contextsPassed: e.validContexts, contextsFailed: e.invalidContexts,
    correctedFields: 22, debatesCompletelyValidated: passed ? 2 : 0,
    movesValidatedByDebate: movesByDebate, immutableFieldsChanged: passed ? 0 : null,
    attempts: e.attempts, retries: 0, timeoutExtensions: 0, recursiveCorrections: 0,
    modelAuthoredScores: 0, scorePassesExecutedThisStage: 0 },
  failureMessage, totals: { modelContexts: e.contextsAttempted, meteredApiCostUsd: 0,
    paidServiceCallsThisStage: 0, modelAuthoredScores: 0 },
  authorization: { fiveContextResumptionPreparationAndExecution: passed,
    retry: false, timeoutExtension: false, recursiveCorrection: false,
    paidServices: false, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: passed
    ? "resume-exactly-five-untouched-publication-contexts-113-180-02-182-56"
    : "stop-after-failed-batch-07-debate-100-or-78-publication-repair" };

if (shouldWrite && passed) {
  const validations = [];
  const audits = [];
  for (const [outputIndex, debateNumber] of ["100", "78"].entries()) {
    const merge = mergeByDebate[debateNumber];
    const source = sourceByDebate[debateNumber];
    const mergedPath = a.artifacts.mergedOutputs[outputIndex];
    const mergedBytes = Buffer.from(`${JSON.stringify(merge.merged, null, 2)}\n`);
    await mkdir(path.dirname(path.resolve(mergedPath)), { recursive: true });
    await writeFile(path.resolve(mergedPath), mergedBytes);
    validations.push({ debateNumber, status: "passed", mergedOutput: mergedPath,
      mergedOutputSha256: sha256(mergedBytes), validationSummary: merge.fullValidation,
      authorizedFieldsChanged: debateNumber === "100" ? 7 : 15,
      immutableFieldsChanged: 0, modelAuthoredScores: 0, lockedScoresUnchanged: true });
    audits.push({ debateNumber,
      rejectedOutput: p.inputs.debates[debateNumber].immutableRejectedOutput,
      rejectedOutputSha256: sha256(source.baseBytes),
      repairOutputs: source.debateContexts.map((context, index) => ({ path: context.output,
        sha256: sha256(source.repairOutputBytes[index]), writableFields: context.writableFields })),
      mergedOutput: mergedPath, mergedOutputSha256: sha256(mergedBytes),
      authorizedTransformations: merge.transformations,
      authorizedFieldsChanged: debateNumber === "100" ? 7 : 15,
      immutableFieldsChanged: 0, completeValidation: merge.fullValidation,
      modelAuthoredScores: 0, lockedScoresUnchanged: true });
  }
  const validation = { schemaVersion:
      "1.0-assessment-production-post-canary-batch-07-publication-resumption-2-repair-complete-validation",
    protocolId: a.protocolId, status: "passed", debates: validations,
    debatesValidated: 2, movesValidated: 36, authorizedFieldsChanged: 22,
    immutableFieldsChanged: 0, modelAuthoredScores: 0, lockedScoresUnchanged: true };
  const audit = { schemaVersion:
      "1.0-assessment-production-post-canary-batch-07-publication-resumption-2-repair-merge-audit",
    protocolId: a.protocolId, status: "passed", debates: audits,
    authorizedFieldsChanged: 22, immutableFieldsChanged: 0,
    modelAuthoredScores: 0, lockedScoresUnchanged: true };
  await writeFile(path.resolve(a.artifacts.completeValidation), `${JSON.stringify(validation, null, 2)}\n`);
  await writeFile(path.resolve(a.artifacts.mergeAudit), `${JSON.stringify(audit, null, 2)}\n`);
}
if (shouldWrite) await writeFile(path.resolve(a.artifacts.analysis), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, contextsAttempted: e.contextsAttempted,
  contextsPassed: e.validContexts, completeValidationPassed: passed,
  debatesValidated: passed ? ["100", "78"] : [], correctedFields: 22,
  movesValidatedByDebate: movesByDebate, attempts: e.attempts, retries: 0,
  meteredApiCostUsd: 0, paidServiceCalls: 0, modelAuthoredScores: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
