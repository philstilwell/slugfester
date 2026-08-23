#!/usr/bin/env node
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_ROOT,
  mergeAndValidateDebate02PublicationRepair } from
  "./lib/assessment-production-post-canary-batch-07-debate-02-publication-repair.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";
const shouldWrite = process.argv.includes("--write");
const ROOT = POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_ROOT;
const [p, a, e] = await Promise.all([
  "execution-preparation-manifest.json", "execution-activation.json", "model-execution.json"
].map((file) => readFile(path.resolve(`${ROOT}/${file}`), "utf8").then(JSON.parse)));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
for (const [file, digest] of Object.entries(a.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `repair analysis source mismatch: ${file}`);
assertV4(e.contextsPlanned === 1 && e.contextsAttempted === 1 && e.attempts === 1 &&
  e.retries === 0 && e.timeoutExtensions === 0 && e.recursiveCorrections === 0 &&
  e.meteredApiCostUsd === 0 && e.paidServiceCallsThisStage === 0 && e.modelAuthoredScores === 0,
"Debate 02 repair execution changed");
if (shouldWrite) for (const file of [a.artifacts.analysis, a.artifacts.mergedOutput,
  a.artifacts.completeValidation, a.artifacts.mergeAudit])
  assertV4(!(await exists(file)), `${file} exists`);
let merge = null; let failureMessage = null; let source = null;
if (e.validContexts === 1 && e.invalidContexts === 0 && e.result.gateAcceptancePassed) {
  try {
    const baseBytes = await readFile(path.resolve(p.inputs.immutableRejectedOutput));
    const packetBytes = await readFile(path.resolve(p.inputs.publicationPacket));
    const repairPacketBytes = await readFile(path.resolve(a.context.packet));
    const repairOutputBytes = await readFile(path.resolve(a.context.output));
    assertV4(sha256(repairOutputBytes) === e.result.outputSha256,
      "Debate 02 repair output changed");
    merge = mergeAndValidateDebate02PublicationRepair({ baseOutput: JSON.parse(baseBytes),
      repairOutput: JSON.parse(repairOutputBytes), repairPacket: JSON.parse(repairPacketBytes),
      publicationPacket: JSON.parse(packetBytes) });
    source = { baseBytes, repairOutputBytes };
  } catch (error) { failureMessage = (error.stack ?? error.message).slice(-10000); }
}
const passed = merge?.fullValidation?.status === "passed" && merge.fullValidation.moves === 21;
const analysis = { schemaVersion:
    "1.0-assessment-production-post-canary-batch-07-debate-02-publication-repair-analysis",
  protocolId: a.protocolId, status: passed
    ? "batch-07-debate-02-single-field-repair-and-complete-validation-passed"
    : "batch-07-debate-02-publication-repair-or-complete-validation-failed",
  productionCanary: false, batchNumber: 7, stagingOnly: true,
  gate: { contextsPlanned: 1, contextsAttempted: 1, contextsPassed: e.validContexts,
    contextsFailed: e.invalidContexts, correctedFields: 1,
    completeValidationPassed: passed, movesValidated: merge?.fullValidation?.moves ?? 0,
    immutableFieldsChanged: passed ? 0 : null, attempts: 1, retries: 0,
    timeoutExtensions: 0, recursiveCorrections: 0, modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0 },
  failureMessage, totals: { modelContexts: 1, meteredApiCostUsd: 0,
    paidServiceCallsThisStage: 0, modelAuthoredScores: 0 },
  authorization: { twoContextResumptionPreparationAndExecution: passed,
    retry: false, timeoutExtension: false, recursiveCorrection: false,
    paidServices: false, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: passed
    ? "resume-exactly-two-untouched-publication-contexts-182-and-56"
    : "stop-after-failed-batch-07-debate-02-publication-repair" };
if (shouldWrite && passed) {
  const mergedBytes = Buffer.from(`${JSON.stringify(merge.merged, null, 2)}\n`);
  const validation = { schemaVersion:
      "1.0-assessment-production-post-canary-batch-07-debate-02-complete-publication-validation",
    protocolId: a.protocolId, status: "passed", debateNumber: "02",
    mergedOutputSha256: sha256(mergedBytes), validationSummary: merge.fullValidation,
    authorizedFieldsChanged: 1, immutableFieldsChanged: 0,
    modelAuthoredScores: 0, lockedScoresUnchanged: true };
  const audit = { schemaVersion:
      "1.0-assessment-production-post-canary-batch-07-debate-02-publication-repair-merge-audit",
    protocolId: a.protocolId, status: "passed", debateNumber: "02",
    rejectedOutput: p.inputs.immutableRejectedOutput,
    rejectedOutputSha256: sha256(source.baseBytes),
    repairOutput: a.context.output, repairOutputSha256: sha256(source.repairOutputBytes),
    mergedOutput: a.artifacts.mergedOutput, mergedOutputSha256: sha256(mergedBytes),
    authorizedTransformation: merge.transformation, authorizedFieldsChanged: 1,
    immutableFieldsChanged: 0, completeValidation: merge.fullValidation,
    modelAuthoredScores: 0, lockedScoresUnchanged: true };
  await mkdir(path.dirname(path.resolve(a.artifacts.mergedOutput)), { recursive: true });
  await writeFile(path.resolve(a.artifacts.mergedOutput), mergedBytes);
  await writeFile(path.resolve(a.artifacts.completeValidation), `${JSON.stringify(validation, null, 2)}\n`);
  await writeFile(path.resolve(a.artifacts.mergeAudit), `${JSON.stringify(audit, null, 2)}\n`);
}
if (shouldWrite) await writeFile(path.resolve(a.artifacts.analysis), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, contextsAttempted: 1,
  contextsPassed: e.validContexts, completeValidationPassed: passed,
  correctedFields: 1, movesValidated: analysis.gate.movesValidated,
  attempts: 1, retries: 0, meteredApiCostUsd: 0, paidServiceCalls: 0,
  modelAuthoredScores: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
