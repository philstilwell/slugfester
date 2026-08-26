#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_10_PUBLICATION_COMPILATION_ORDER,
  compilePostCanaryBatch10PublicationStagingRecord,
  validatePostCanaryBatch10CompiledStagingRecord
} from "./lib/assessment-production-post-canary-batch-10-publication-compilation.mjs";
import {
  buildPostCanaryBatch10PublicationFinalization,
  validatePostCanaryBatch10PublicationFinalCandidate
} from "./lib/assessment-production-post-canary-batch-10-publication-finalization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--corrected-at");
const correctedAt = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assertV4(correctedAt && !Number.isNaN(Date.parse(correctedAt)), "--corrected-at requires ISO");

const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-10";
const COMPILATION = `${ROOT}/deterministic-publication-compilation`;
const FINALIZATION = `${ROOT}/publication-finalization`;
const CORRECTION = `${COMPILATION}/metadata-correction`;
const IDENTITY = `${COMPILATION}/production-identity-snapshot.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const parse = async (file) => JSON.parse(await readFile(path.resolve(file), "utf8"));
const serialize = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const hashFile = async (file) => sha256(await readFile(path.resolve(file)));

const compilationPreparationPath = `${COMPILATION}/preparation-manifest.json`;
const compilationActivationPath = `${COMPILATION}/execution-activation.json`;
const compilationExecutionPath = `${COMPILATION}/execution.json`;
const compilationAuditPath = `${COMPILATION}/compilation-audit.json`;
const finalizationPreparationPath = `${FINALIZATION}/preparation-manifest.json`;
const finalizationActivationPath = `${FINALIZATION}/execution-activation.json`;
const finalizationExecutionPath = `${FINALIZATION}/execution.json`;
const finalizationAuditPath = `${FINALIZATION}/finalization-audit.json`;

const [identity, compilationPreparation, compilationActivation, compilationExecution,
  compilationAudit, finalizationPreparation, finalizationActivation,
  finalizationExecution, finalizationAudit] = await Promise.all([
  parse(IDENTITY), parse(compilationPreparationPath), parse(compilationActivationPath),
  parse(compilationExecutionPath), parse(compilationAuditPath),
  parse(finalizationPreparationPath), parse(finalizationActivationPath),
  parse(finalizationExecutionPath), parse(finalizationAuditPath)
]);

assertV4(compilationExecution.status ===
  "ten-debate-batch-10-deterministic-publication-compilation-passed" &&
  finalizationExecution.status === "ten-debate-batch-10-publication-finalization-passed",
"passing Batch 10 compilation and finalization required");

const changes = [];
const compiledWrites = [];
const provenanceWrites = [];

for (const debateNumber of POST_CANARY_BATCH_10_PUBLICATION_COMPILATION_ORDER) {
  const compilationContext = compilationPreparation.contexts.find(
    (row) => row.debateNumber === debateNumber);
  const finalizationContext = finalizationPreparation.contexts.find(
    (row) => row.debateNumber === debateNumber);
  const identityRow = identity.rows.find((row) => row.number === debateNumber);
  assertV4(compilationContext && finalizationContext && identityRow,
    `${debateNumber}: correction context missing`);

  const [originalCompiledBytes, outputBytes, packetBytes, candidateBytes,
    originalProvenanceBytes] = await Promise.all([
    readFile(path.resolve(compilationContext.plannedCompiledOutput)),
    readFile(path.resolve(compilationContext.publicationOutput)),
    readFile(path.resolve(compilationContext.publicationPacket)),
    readFile(path.resolve(finalizationContext.finalCandidate)),
    readFile(path.resolve(finalizationContext.provenance))
  ]);
  const originalCompiled = JSON.parse(originalCompiledBytes);
  assertV4(originalCompiled.stagingAudit?.batchNumber === 9,
    `${debateNumber}: expected inherited Batch 9 staging metadata`);

  const output = JSON.parse(outputBytes);
  const packet = JSON.parse(packetBytes);
  const correctedCompiled = compilePostCanaryBatch10PublicationStagingRecord({
    output, packet, identity: identityRow
  });
  const compilationValidation = validatePostCanaryBatch10CompiledStagingRecord({
    compiled: correctedCompiled, output, packet, identity: identityRow
  });
  assertV4(correctedCompiled.stagingAudit.batchNumber === 10,
    `${debateNumber}: corrected batch metadata missing`);

  const correctedCompiledBytes = serialize(correctedCompiled);
  const correctedCompiledSha256 = sha256(correctedCompiledBytes);
  const built = buildPostCanaryBatch10PublicationFinalization({
    compiled: correctedCompiled,
    compiledPath: compilationContext.plannedCompiledOutput,
    compiledSha256: correctedCompiledSha256,
    output,
    packet,
    identity: identityRow
  });
  const finalizationValidation = validatePostCanaryBatch10PublicationFinalCandidate({
    candidate: built.candidate,
    provenance: built.provenance,
    compiled: correctedCompiled,
    output,
    packet,
    identity: identityRow
  });
  const correctedCandidateBytes = serialize(built.candidate);
  const correctedProvenanceBytes = serialize(built.provenance);
  assertV4(sha256(correctedCandidateBytes) === sha256(candidateBytes),
    `${debateNumber}: display candidate changed during metadata correction`);

  const correctedProvenanceSha256 = sha256(correctedProvenanceBytes);
  compiledWrites.push({ path: compilationContext.plannedCompiledOutput,
    bytes: correctedCompiledBytes });
  provenanceWrites.push({ path: finalizationContext.provenance,
    bytes: correctedProvenanceBytes });

  for (const container of [compilationExecution, compilationAudit]) {
    const row = container.rows.find((item) => item.debateNumber === debateNumber);
    row.outputSha256 = correctedCompiledSha256;
    row.validation = compilationValidation;
  }
  for (const context of [finalizationPreparation, finalizationActivation]) {
    const row = context.contexts.find((item) => item.debateNumber === debateNumber);
    row.compiledInputSha256 = correctedCompiledSha256;
    row.expectedProvenanceSha256 = correctedProvenanceSha256;
    row.syntheticValidation = finalizationValidation;
  }
  for (const container of [finalizationExecution, finalizationAudit]) {
    const row = container.rows.find((item) => item.debateNumber === debateNumber);
    row.provenanceSha256 = correctedProvenanceSha256;
    row.validation = finalizationValidation;
  }
  changes.push({ debateNumber,
    compiled: compilationContext.plannedCompiledOutput,
    compiledSha256Before: sha256(originalCompiledBytes),
    compiledSha256After: correctedCompiledSha256,
    provenance: finalizationContext.provenance,
    provenanceSha256Before: sha256(originalProvenanceBytes),
    provenanceSha256After: correctedProvenanceSha256,
    candidate: finalizationContext.finalCandidate,
    candidateSha256: sha256(candidateBytes),
    displayCandidateChanged: false,
    participantScoresChanged: false,
    correctedField: "stagingAudit.batchNumber",
    valueBefore: 9,
    valueAfter: 10 });
}

const plannedFiles = new Map([
  ...compiledWrites.map((row) => [row.path, row.bytes]),
  ...provenanceWrites.map((row) => [row.path, row.bytes]),
  [compilationExecutionPath, serialize(compilationExecution)],
  [compilationAuditPath, serialize(compilationAudit)],
  [finalizationExecutionPath, serialize(finalizationExecution)],
  [finalizationAuditPath, serialize(finalizationAudit)]
]);
const plannedHash = async (file) => plannedFiles.has(file)
  ? sha256(plannedFiles.get(file))
  : hashFile(file);

for (const file of Object.keys(compilationPreparation.sourceHashes)) {
  compilationPreparation.sourceHashes[file] = await plannedHash(file);
}
plannedFiles.set(compilationPreparationPath, serialize(compilationPreparation));
compilationActivation.sourceHashes = { ...compilationPreparation.sourceHashes,
  [compilationPreparationPath]: sha256(plannedFiles.get(compilationPreparationPath)) };
compilationActivation.preparationSha256 = sha256(plannedFiles.get(compilationPreparationPath));
plannedFiles.set(compilationActivationPath, serialize(compilationActivation));

for (const file of Object.keys(finalizationPreparation.sourceHashes)) {
  finalizationPreparation.sourceHashes[file] = await plannedHash(file);
}
plannedFiles.set(finalizationPreparationPath, serialize(finalizationPreparation));
finalizationActivation.sourceHashes = { ...finalizationPreparation.sourceHashes,
  [finalizationPreparationPath]: sha256(plannedFiles.get(finalizationPreparationPath)) };
finalizationActivation.preparationSha256 = sha256(plannedFiles.get(finalizationPreparationPath));
finalizationActivation.contexts = structuredClone(finalizationPreparation.contexts);
plannedFiles.set(finalizationActivationPath, serialize(finalizationActivation));

const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-10-compilation-metadata-correction",
  protocolId: "assessment-production-post-canary-batch-10-compilation-metadata-correction",
  status: "batch-10-compilation-metadata-correction-passed",
  correctedAt,
  scope: "one deterministic provenance-only field in each of ten compiled staging records",
  diagnosis: "The Batch 10 compilation adapter inherited stagingAudit.batchNumber = 9 from the Batch 9 template.",
  correction: "Set stagingAudit.batchNumber to 10, deterministically replay finalization provenance, and refresh dependent hashes.",
  recordsCorrected: changes.length,
  fieldsCorrected: changes.length,
  displayCandidatesChanged: 0,
  participantScoresChanged: 0,
  deterministicModelPasses: 0,
  retries: 0,
  reruns: 0,
  directIncrementalCostUsd: 0,
  changes,
  productionMutationPerformed: false,
  nextAuthorizedAction: "prepare-batch-10-rendering-verification"
};
plannedFiles.set(`${CORRECTION}/analysis.json`, serialize(analysis));

if (shouldWrite) {
  await mkdir(path.resolve(CORRECTION), { recursive: true });
  for (const [file, bytes] of plannedFiles) {
    await mkdir(path.dirname(path.resolve(file)), { recursive: true });
    await writeFile(path.resolve(file), bytes);
  }
}

console.log(JSON.stringify({ status: analysis.status,
  recordsCorrected: changes.length, fieldsCorrected: changes.length,
  displayCandidatesChanged: 0, participantScoresChanged: 0,
  modelContexts: 0, retries: 0, reruns: 0,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
