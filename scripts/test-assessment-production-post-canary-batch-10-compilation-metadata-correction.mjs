#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_10_PUBLICATION_COMPILATION_ORDER,
  validatePostCanaryBatch10CompiledStagingRecord
} from "./lib/assessment-production-post-canary-batch-10-publication-compilation.mjs";
import {
  buildPostCanaryBatch10PublicationFinalization,
  validatePostCanaryBatch10PublicationFinalCandidate
} from "./lib/assessment-production-post-canary-batch-10-publication-finalization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-10";
const COMPILATION = `${ROOT}/deterministic-publication-compilation`;
const FINALIZATION = `${ROOT}/publication-finalization`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytes = (file) => readFile(path.resolve(file));
const parse = async (file) => JSON.parse(await readFile(path.resolve(file), "utf8"));
const hashFile = async (file) => sha256(await bytes(file));

const compilationPreparationPath = `${COMPILATION}/preparation-manifest.json`;
const finalizationPreparationPath = `${FINALIZATION}/preparation-manifest.json`;
const [analysis, identity, compilationPreparation, compilationActivation,
  compilationExecution, compilationAudit, finalizationPreparation,
  finalizationActivation, finalizationExecution, finalizationAudit] = await Promise.all([
  parse(`${COMPILATION}/metadata-correction/analysis.json`),
  parse(`${COMPILATION}/production-identity-snapshot.json`),
  parse(compilationPreparationPath),
  parse(`${COMPILATION}/execution-activation.json`),
  parse(`${COMPILATION}/execution.json`),
  parse(`${COMPILATION}/compilation-audit.json`),
  parse(finalizationPreparationPath),
  parse(`${FINALIZATION}/execution-activation.json`),
  parse(`${FINALIZATION}/execution.json`),
  parse(`${FINALIZATION}/finalization-audit.json`)
]);

assertV4(analysis.status === "batch-10-compilation-metadata-correction-passed" &&
  analysis.recordsCorrected === 10 && analysis.fieldsCorrected === 10 &&
  analysis.displayCandidatesChanged === 0 && analysis.participantScoresChanged === 0 &&
  analysis.retries === 0 && analysis.reruns === 0,
"passing Batch 10 metadata correction analysis required");

for (const [file, digest] of Object.entries(compilationPreparation.sourceHashes)) {
  assertV4(await hashFile(file) === digest, `compilation source hash mismatch: ${file}`);
}
assertV4(compilationActivation.preparationSha256 === await hashFile(compilationPreparationPath) &&
  canonicalJson(compilationActivation.sourceHashes) === canonicalJson({
    ...compilationPreparation.sourceHashes,
    [compilationPreparationPath]: await hashFile(compilationPreparationPath)
  }), "compilation activation chain mismatch");

for (const [file, digest] of Object.entries(finalizationPreparation.sourceHashes)) {
  assertV4(await hashFile(file) === digest, `finalization source hash mismatch: ${file}`);
}
assertV4(finalizationActivation.preparationSha256 === await hashFile(finalizationPreparationPath) &&
  canonicalJson(finalizationActivation.sourceHashes) === canonicalJson({
    ...finalizationPreparation.sourceHashes,
    [finalizationPreparationPath]: await hashFile(finalizationPreparationPath)
  }), "finalization activation chain mismatch");

for (const debateNumber of POST_CANARY_BATCH_10_PUBLICATION_COMPILATION_ORDER) {
  const compilationContext = compilationPreparation.contexts.find((row) => row.debateNumber === debateNumber);
  const finalizationContext = finalizationPreparation.contexts.find((row) => row.debateNumber === debateNumber);
  const identityRow = identity.rows.find((row) => row.number === debateNumber);
  const change = analysis.changes.find((row) => row.debateNumber === debateNumber);
  const [compiledBytes, outputBytes, packetBytes, candidateBytes, provenanceBytes] = await Promise.all([
    bytes(compilationContext.plannedCompiledOutput), bytes(compilationContext.publicationOutput),
    bytes(compilationContext.publicationPacket), bytes(finalizationContext.finalCandidate),
    bytes(finalizationContext.provenance)
  ]);
  const compiled = JSON.parse(compiledBytes);
  const output = JSON.parse(outputBytes);
  const packet = JSON.parse(packetBytes);
  const candidate = JSON.parse(candidateBytes);
  const provenance = JSON.parse(provenanceBytes);
  const compiledHash = sha256(compiledBytes);
  const provenanceHash = sha256(provenanceBytes);
  assertV4(compiled.stagingAudit.batchNumber === 10,
    `${debateNumber}: corrected Batch 10 metadata missing`);
  const compilationValidation = validatePostCanaryBatch10CompiledStagingRecord({
    compiled, output, packet, identity: identityRow
  });
  const rebuilt = buildPostCanaryBatch10PublicationFinalization({ compiled,
    compiledPath: compilationContext.plannedCompiledOutput,
    compiledSha256: compiledHash, output, packet, identity: identityRow });
  const finalizationValidation = validatePostCanaryBatch10PublicationFinalCandidate({
    candidate, provenance, compiled, output, packet, identity: identityRow
  });
  assertV4(canonicalJson(rebuilt.candidate) === canonicalJson(candidate) &&
    canonicalJson(rebuilt.provenance) === canonicalJson(provenance),
    `${debateNumber}: corrected finalization replay mismatch`);
  assertV4(compilationValidation.moves === finalizationValidation.moves &&
    compiledHash === change.compiledSha256After &&
    provenanceHash === change.provenanceSha256After &&
    sha256(candidateBytes) === change.candidateSha256 &&
    change.displayCandidateChanged === false && change.participantScoresChanged === false,
    `${debateNumber}: correction evidence mismatch`);
  for (const container of [compilationExecution, compilationAudit]) {
    assertV4(container.rows.find((row) => row.debateNumber === debateNumber).outputSha256 === compiledHash,
      `${debateNumber}: compilation audit hash mismatch`);
  }
  for (const container of [finalizationExecution, finalizationAudit]) {
    assertV4(container.rows.find((row) => row.debateNumber === debateNumber).provenanceSha256 === provenanceHash,
      `${debateNumber}: finalization audit hash mismatch`);
  }
}

console.log(JSON.stringify({ status: "passed", debates: 10,
  correctedFields: 10, displayCandidatesChanged: 0,
  participantScoresChanged: 0, modelContexts: 0,
  retries: 0, reruns: 0, directIncrementalCostUsd: 0 }, null, 2));
