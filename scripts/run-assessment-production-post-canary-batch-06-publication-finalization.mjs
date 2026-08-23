#!/usr/bin/env node
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_06_PUBLICATION_FINALIZATION_ORDER,
  POST_CANARY_BATCH_06_PUBLICATION_FINALIZATION_ROOT,
  buildPostCanaryBatch06PublicationFinalization,
  buildPostCanaryBatch06PublicationStagingPreviewHtml,
  validatePostCanaryBatch06PublicationFinalCandidate } from
  "./lib/assessment-production-post-canary-batch-06-publication-finalization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
const ROOT = POST_CANARY_BATCH_06_PUBLICATION_FINALIZATION_ROOT;
const a = JSON.parse(await readFile(path.resolve(`${ROOT}/execution-activation.json`), "utf8"));
const identity = JSON.parse(await readFile(path.resolve(
  "docs/assessment-production/post-canary-continuation-v1/batch-06/deterministic-publication-compilation/production-identity-snapshot.json"), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(a.status === "frozen-post-canary-batch-06-publication-finalization-authorized" &&
  a.authorization?.finalizationExecution === true &&
  a.authorization?.deterministicFinalizationPassesMaximum === 1 && a.authorization?.rerun === false &&
  canonicalJson(a.explicitOrder) === canonicalJson(POST_CANARY_BATCH_06_PUBLICATION_FINALIZATION_ORDER),
"Batch 6 finalization is not authorized");
for (const [file, digest] of Object.entries(a.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `${file}: activation source changed`);
for (const file of a.futureOutputPathsExcludedFromSourceHashes) assertV4(!(await exists(file)), `${file} exists`);
const startedAt = new Date().toISOString(); const started = Date.now();
const candidates = []; let failureMessage = null;
try {
  for (const debateNumber of POST_CANARY_BATCH_06_PUBLICATION_FINALIZATION_ORDER) {
    const context = a.contexts.find((row) => row.debateNumber === debateNumber);
    const id = identity.rows.find((row) => row.number === debateNumber);
    const [compiledBytes, outputBytes, packetBytes] = await Promise.all([
      readFile(path.resolve(context.compiledInput)), readFile(path.resolve(context.publicationOutput)),
      readFile(path.resolve(context.publicationPacket))]);
    assertV4(sha256(compiledBytes) === context.compiledInputSha256 &&
      sha256(outputBytes) === context.publicationOutputSha256 &&
      sha256(packetBytes) === context.publicationPacketSha256, `${debateNumber}: finalization input changed`);
    const compiled = JSON.parse(compiledBytes); const output = JSON.parse(outputBytes); const packet = JSON.parse(packetBytes);
    const built = buildPostCanaryBatch06PublicationFinalization({ compiled,
      compiledPath: context.compiledInput, compiledSha256: sha256(compiledBytes), output, packet, identity: id });
    const validation = validatePostCanaryBatch06PublicationFinalCandidate({
      candidate: built.candidate, provenance: built.provenance, compiled, output, packet, identity: id });
    const candidateBytes = Buffer.from(`${JSON.stringify(built.candidate, null, 2)}\n`);
    const provenanceBytes = Buffer.from(`${JSON.stringify(built.provenance, null, 2)}\n`);
    assertV4(sha256(candidateBytes) === context.expectedCandidateSha256 &&
      sha256(provenanceBytes) === context.expectedProvenanceSha256, `${debateNumber}: expected output changed`);
    candidates.push({ context, candidateBytes, provenanceBytes, validation });
  }
  assertV4(candidates.length === 10 && candidates.reduce((sum, row) => sum + row.validation.moves, 0) === 200,
    "complete finalization validation failed");
} catch (error) { failureMessage = (error.stack ?? error.message).slice(-10000); }
const passed = candidates.length === 10 && !failureMessage;
const rows = [];
if (passed) {
  for (const item of candidates) {
    await mkdir(path.dirname(path.resolve(item.context.finalCandidate)), { recursive: true });
    await mkdir(path.dirname(path.resolve(item.context.provenance)), { recursive: true });
    await writeFile(path.resolve(item.context.finalCandidate), item.candidateBytes);
    await writeFile(path.resolve(item.context.provenance), item.provenanceBytes);
    rows.push({ debateNumber: item.context.debateNumber, debateId: item.context.debateId,
      candidate: item.context.finalCandidate, candidateSha256: sha256(item.candidateBytes),
      provenance: item.context.provenance, provenanceSha256: sha256(item.provenanceBytes),
      validation: item.validation });
  }
  const preview = Buffer.from(buildPostCanaryBatch06PublicationStagingPreviewHtml());
  assertV4(sha256(preview) === a.preview.expectedSha256, "preview changed");
  await mkdir(path.dirname(path.resolve(a.artifacts.preview)), { recursive: true });
  await writeFile(path.resolve(a.artifacts.preview), preview);
  await writeFile(path.resolve(a.artifacts.audit), `${JSON.stringify({
    schemaVersion: "1.0-assessment-production-post-canary-batch-06-publication-finalization-audit",
    protocolId: a.protocolId, status: "passed", rows,
    totals: { debates: 10, moves: 200, deterministicFinalizationPasses: 1,
      reruns: 0, modelContexts: 0, modelAuthoredScores: 0, displayFieldsChanged: 0,
      participantScoresChanged: 0, directIncrementalCostUsd: 0 },
    preview: { path: a.artifacts.preview, sha256: sha256(preview) },
    productionMutationPerformed: false }, null, 2)}\n`);
}
const execution = { schemaVersion: "1.0-assessment-production-post-canary-batch-06-publication-finalization-execution",
  protocolId: a.protocolId, status: passed ? "ten-debate-batch-06-publication-finalization-passed" :
    "ten-debate-batch-06-publication-finalization-failed", startedAt,
  completedAt: new Date().toISOString(), elapsedMs: Date.now() - started,
  deterministicFinalizationPasses: 1, reruns: 0, modelContexts: 0, paidServiceCalls: 0,
  directIncrementalCostUsd: 0, rows, failureMessage, productionMutationPerformed: false };
const analysis = { schemaVersion: "1.0-assessment-production-post-canary-batch-06-publication-finalization-analysis",
  protocolId: a.protocolId, status: execution.status, productionCanary: false, batchNumber: 6,
  gate: { finalCandidatesPassed: rows.length, expectedFinalCandidates: 10,
    moves: rows.reduce((sum, row) => sum + row.validation.moves, 0),
    deterministicFinalizationPasses: 1, reruns: 0, displayFieldsChanged: 0,
    participantScoresChanged: 0, modelContexts: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0 },
  failureMessage, authorization: { renderingVerificationPreparation: passed,
    productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: passed ? "prepare-batch-06-rendering-verification" : "diagnose-finalization-failure" };
await writeFile(path.resolve(a.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
await writeFile(path.resolve(a.artifacts.analysis), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, finalCandidates: rows.length,
  moves: analysis.gate.moves, deterministicFinalizationPasses: 1, reruns: 0,
  displayFieldsChanged: 0, participantScoresChanged: 0, modelContexts: 0,
  directIncrementalCostUsd: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
if (!passed) process.exitCode = 1;
