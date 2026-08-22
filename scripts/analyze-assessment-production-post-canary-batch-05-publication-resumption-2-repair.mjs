#!/usr/bin/env node
import { createHash } from "node:crypto"; import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_05_DEBATE_42_REPAIR_ROOT, mergeAndValidateDebate42Repair } from
  "./lib/assessment-production-post-canary-batch-05-publication-resumption-2-repair.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";
const shouldWrite = process.argv.includes("--write"); const ROOT = POST_CANARY_BATCH_05_DEBATE_42_REPAIR_ROOT;
const [p, a, e] = await Promise.all(["execution-preparation-manifest.json", "execution-activation.json", "model-execution.json"]
  .map((file) => readFile(path.resolve(`${ROOT}/${file}`), "utf8").then(JSON.parse)));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
for (const [file, digest] of Object.entries(a.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `repair analysis source mismatch: ${file}`);
assertV4(e.contextsPlanned === 2 && e.attempts === e.contextsAttempted && e.retries === 0 &&
  e.timeoutExtensions === 0 && e.recursiveCorrections === 0 && e.meteredApiCostUsd === 0 &&
  e.paidServiceCallsThisStage === 0 && e.modelAuthoredScores === 0, "repair execution changed");
if (shouldWrite) for (const file of [a.artifacts.analysis, a.artifacts.mergedOutput,
  a.artifacts.completeValidation, a.artifacts.mergeAudit]) assertV4(!(await exists(file)), `${file} exists`);
let merge = null; let failureMessage = null; let source = null;
if (e.contextsAttempted === 2 && e.validContexts === 2 && e.invalidContexts === 0 &&
    e.results.every((row) => row.gateAcceptancePassed)) {
  try { const baseBytes = await readFile(path.resolve(p.inputs.immutableRejectedOutput));
    const packetBytes = await readFile(path.resolve(p.inputs.publicationPacket));
    const repairPacketBytes = await Promise.all(a.contexts.map((row) => readFile(path.resolve(row.packet))));
    const repairOutputBytes = await Promise.all(a.contexts.map((row) => readFile(path.resolve(row.output))));
    for (const context of a.contexts) { const result = e.results.find((row) => row.contextIndex === context.contextIndex);
      assertV4(result && sha256(await readFile(path.resolve(context.output))) === result.outputSha256,
        `repair ${context.contextIndex}: output changed`); }
    merge = mergeAndValidateDebate42Repair({ baseOutput: JSON.parse(baseBytes),
      repairOutputs: repairOutputBytes.map(JSON.parse), repairPackets: repairPacketBytes.map(JSON.parse),
      publicationPacket: JSON.parse(packetBytes) });
    source = { baseBytes, repairOutputBytes };
  } catch (error) { failureMessage = (error.stack ?? error.message).slice(-10000); }
}
const passed = merge?.fullValidation?.status === "passed";
const analysis = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-42-repair-analysis",
  protocolId: a.protocolId, status: passed
    ? "batch-05-debate-42-two-packet-repair-and-complete-validation-passed"
    : "batch-05-debate-42-repair-or-complete-validation-failed",
  productionCanary: false, batchNumber: 5, stagingOnly: true,
  gate: { contextsPlanned: 2, contextsAttempted: e.contextsAttempted,
    contextsPassed: e.validContexts, contextsFailed: e.invalidContexts,
    correctedFields: 4, completeValidationPassed: passed,
    movesValidated: merge?.fullValidation?.moves ?? 0,
    immutableFieldsChanged: passed ? 0 : null, attempts: e.attempts,
    retries: 0, timeoutExtensions: 0, recursiveCorrections: 0,
    modelAuthoredScores: 0, scorePassesExecutedThisStage: 0 },
  failureMessage, totals: { modelContexts: e.contextsAttempted, meteredApiCostUsd: 0,
    paidServiceCallsThisStage: 0, modelAuthoredScores: 0 },
  authorization: { debate59ResumptionManifestPreparation: passed,
    debate59ModelExecution: false, retry: false, timeoutExtension: false,
    recursiveCorrection: false, paidServices: false, productionMutation: false,
    nextBatchSelection: false },
  nextAuthorizedAction: passed ? "prepare-and-resume-exactly-one-unattempted-debate-59-publication-context"
    : "stop-after-failed-debate-42-repair" };
if (shouldWrite && passed) { const mergedBytes = Buffer.from(`${JSON.stringify(merge.merged, null, 2)}\n`);
  const validation = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-42-complete-validation",
    protocolId: a.protocolId, status: "passed", debateNumber: "42",
    mergedOutputSha256: sha256(mergedBytes), validationSummary: merge.fullValidation,
    authorizedFieldsChanged: 4, immutableFieldsChanged: 0,
    modelAuthoredScores: 0, lockedScoresUnchanged: true };
  const audit = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-42-repair-merge-audit",
    protocolId: a.protocolId, status: "passed", debateNumber: "42",
    rejectedOutput: p.inputs.immutableRejectedOutput, rejectedOutputSha256: sha256(source.baseBytes),
    repairOutputs: a.contexts.map((context, index) => ({ path: context.output,
      sha256: sha256(source.repairOutputBytes[index]), writableFields: context.writableFields })),
    mergedOutput: a.artifacts.mergedOutput, mergedOutputSha256: sha256(mergedBytes),
    authorizedTransformations: merge.transformations, authorizedFieldsChanged: 4,
    immutableFieldsChanged: 0, completeValidation: merge.fullValidation,
    modelAuthoredScores: 0, lockedScoresUnchanged: true };
  await mkdir(path.dirname(path.resolve(a.artifacts.mergedOutput)), { recursive: true });
  await writeFile(path.resolve(a.artifacts.mergedOutput), mergedBytes);
  await writeFile(path.resolve(a.artifacts.completeValidation), `${JSON.stringify(validation, null, 2)}\n`);
  await writeFile(path.resolve(a.artifacts.mergeAudit), `${JSON.stringify(audit, null, 2)}\n`); }
if (shouldWrite) await writeFile(path.resolve(a.artifacts.analysis), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, contextsAttempted: e.contextsAttempted,
  contextsPassed: e.validContexts, completeValidationPassed: passed,
  correctedFields: 4, movesValidated: analysis.gate.movesValidated,
  attempts: e.attempts, retries: 0, meteredApiCostUsd: 0,
  paidServiceCalls: 0, modelAuthoredScores: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
