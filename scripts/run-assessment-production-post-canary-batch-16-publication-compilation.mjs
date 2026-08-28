#!/usr/bin/env node
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_16_PUBLICATION_COMPILATION_ORDER,
  POST_CANARY_BATCH_16_PUBLICATION_COMPILATION_ROOT,
  compilePostCanaryBatch16PublicationStagingRecord,
  validatePostCanaryBatch16CompiledStagingRecord } from
  "./lib/assessment-production-post-canary-batch-16-publication-compilation.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
const ROOT = POST_CANARY_BATCH_16_PUBLICATION_COMPILATION_ROOT;
const a = JSON.parse(await readFile(path.resolve(`${ROOT}/execution-activation.json`), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(a.status === "frozen-post-canary-batch-16-deterministic-publication-compilation-authorized" &&
  a.authorization?.deterministicCompilation === true &&
  a.authorization?.deterministicCompilationPassesMaximum === 1 && a.authorization?.rerun === false &&
  canonicalJson(a.explicitOrder) === canonicalJson(POST_CANARY_BATCH_16_PUBLICATION_COMPILATION_ORDER),
"Batch 16 compilation is not authorized");
for (const [file, digest] of Object.entries(a.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `${file}: activation source changed`);
for (const file of a.futureOutputPathsExcludedFromSourceHashes) assertV4(!(await exists(file)), `${file} exists`);
const startedAt = new Date().toISOString(); const started = Date.now();
let failureMessage = null; const rows = []; const candidates = [];
try {
  const identity = JSON.parse(await readFile(path.resolve(a.artifacts.identitySnapshot), "utf8"));
  for (const debateNumber of POST_CANARY_BATCH_16_PUBLICATION_COMPILATION_ORDER) {
    const context = a.contexts.find((row) => row.debateNumber === debateNumber);
    const id = identity.rows.find((row) => row.number === debateNumber);
    const [outputBytes, packetBytes] = await Promise.all([
      readFile(path.resolve(context.publicationOutput)), readFile(path.resolve(context.publicationPacket))]);
    assertV4(sha256(outputBytes) === context.publicationOutputSha256 &&
      sha256(packetBytes) === context.publicationPacketSha256, `${debateNumber}: input hash changed`);
    const output = JSON.parse(outputBytes); const packet = JSON.parse(packetBytes);
    const compiled = compilePostCanaryBatch16PublicationStagingRecord({ output, packet, identity: id });
    const validation = validatePostCanaryBatch16CompiledStagingRecord({ compiled, output, packet, identity: id });
    const bytes = Buffer.from(`${JSON.stringify(compiled, null, 2)}\n`);
    candidates.push({ context, bytes, validation });
  }
  assertV4(candidates.length === 10 && candidates.reduce((sum, row) => sum + row.validation.moves, 0) === 194,
    "complete compilation validation failed");
  for (const candidate of candidates) {
    await mkdir(path.dirname(path.resolve(candidate.context.plannedCompiledOutput)), { recursive: true });
    await writeFile(path.resolve(candidate.context.plannedCompiledOutput), candidate.bytes);
    rows.push({ debateNumber: candidate.context.debateNumber, debateId: candidate.context.debateId,
      output: candidate.context.plannedCompiledOutput, outputSha256: sha256(candidate.bytes),
      scores: candidate.context.expectedOverallScores, winner: candidate.context.expectedWinner,
      winningMargin: candidate.context.expectedWinningMargin, validation: candidate.validation });
  }
} catch (error) { failureMessage = (error.stack ?? error.message).slice(-10000); }
const passed = rows.length === 10 && !failureMessage;
if (passed) await writeFile(path.resolve(a.artifacts.compilationAudit), `${JSON.stringify({
  schemaVersion: "1.0-assessment-production-post-canary-batch-16-publication-compilation-audit",
  protocolId: a.protocolId, status: "passed", explicitOrder: a.explicitOrder, rows,
  totals: { debates: 10, sections: rows.reduce((sum, row) => sum + row.validation.sections, 0),
    moves: 194, deterministicCompilationPasses: 1, reruns: 0, scorePasses: 0,
    modelContexts: 0, modelAuthoredScores: 0, directIncrementalCostUsd: 0 },
  productionMutationPerformed: false }, null, 2)}\n`);
const execution = { schemaVersion: "1.0-assessment-production-post-canary-batch-16-publication-compilation-execution",
  protocolId: a.protocolId, status: passed ? "ten-debate-batch-16-deterministic-publication-compilation-passed" :
    "ten-debate-batch-16-deterministic-publication-compilation-failed",
  startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started,
  deterministicCompilationPasses: 1, reruns: 0, scorePasses: 0, modelContexts: 0,
  paidServiceCalls: 0, directIncrementalCostUsd: 0, rows, failureMessage,
  productionMutationPerformed: false };
const analysis = { schemaVersion: "1.0-assessment-production-post-canary-batch-16-publication-compilation-analysis",
  protocolId: a.protocolId, status: execution.status, productionCanary: false, batchNumber: 16,
  gate: { compiledRecordsPassed: rows.length, expectedCompiledRecords: 10,
    moves: rows.reduce((sum, row) => sum + row.validation.moves, 0),
    deterministicCompilationPasses: 1, reruns: 0, scoresRecalculated: false,
    modelContexts: 0, modelAuthoredScores: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0 },
  failureMessage, authorization: { publicationFinalizationPreparation: passed,
    productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: passed ? "prepare-batch-16-publication-finalization" : "diagnose-compilation-failure" };
await writeFile(path.resolve(a.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
await writeFile(path.resolve(a.artifacts.analysis), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, compiledRecords: rows.length,
  moves: analysis.gate.moves, deterministicCompilationPasses: 1, reruns: 0,
  modelContexts: 0, directIncrementalCostUsd: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
if (!passed) process.exitCode = 1;
