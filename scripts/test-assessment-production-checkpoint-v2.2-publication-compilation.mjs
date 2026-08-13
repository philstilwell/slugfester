#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_PUBLICATION_COMPILATION_ORDER,
  CHECKPOINT_V22_PUBLICATION_COMPILATION_ROOT,
  validateCheckpointV22CompiledStagingRecord
} from "./lib/assessment-production-checkpoint-v2.2-publication-compilation.mjs";
import { validateCheckpointV22PublicationOutput } from "./lib/assessment-production-checkpoint-v2.2-publication-validation.mjs";

const parse = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const root = CHECKPOINT_V22_PUBLICATION_COMPILATION_ROOT;
const [activation, execution, analysis, audit, identity] = await Promise.all([
  parse(`${root}/execution-activation.json`),
  parse(`${root}/execution.json`),
  parse(`${root}/analysis.json`),
  parse(`${root}/compilation-audit.json`),
  parse(`${root}/production-identity-snapshot.json`)
]);

assert.equal(activation.status, "deterministic-publication-compilation-execution-authorized-and-frozen");
assert.equal(execution.status, "ten-debate-deterministic-publication-compilation-passed");
assert.equal(analysis.status, "ten-debate-deterministic-publication-compilation-passed");
assert.equal(audit.status, "passed-ten-debate-deterministic-publication-compilation");
assert.deepEqual(execution.explicitOrder, CHECKPOINT_V22_PUBLICATION_COMPILATION_ORDER);
assert.deepEqual(audit.explicitOrder, CHECKPOINT_V22_PUBLICATION_COMPILATION_ORDER);
assert.deepEqual(audit.rows.map((row) => row.debateNumber), CHECKPOINT_V22_PUBLICATION_COMPILATION_ORDER);
assert.equal(execution.failureMessage, null);
assert.equal(execution.outputArtifactsWritten, true);
assert.equal(execution.contexts, 0);
assert.equal(execution.scorePasses, 0);
assert.equal(execution.directCostUsd, 0);
assert.equal(execution.productionMutationPerformed, false);
assert.equal(audit.productionMutationPerformed, false);
assert.equal(audit.publicationFinalizationPerformed, false);
assert.equal(audit.renderingVerificationPerformed, false);
assert.equal(analysis.authorization.publicationFinalization, false);
assert.equal(analysis.authorization.renderingVerification, false);
assert.equal(analysis.authorization.productionMutation, false);

const rows = [];
for (const debateNumber of CHECKPOINT_V22_PUBLICATION_COMPILATION_ORDER) {
  const context = activation.contexts.find((item) => item.debateNumber === debateNumber);
  const auditRow = audit.rows.find((item) => item.debateNumber === debateNumber);
  const identityRow = identity.rows.find((item) => item.number === debateNumber);
  assert.ok(context && auditRow && identityRow, `${debateNumber}: compilation evidence missing`);
  const [publicationBytes, packetBytes, compiledBytes] = await Promise.all([
    readFile(path.resolve(context.publicationOutput)),
    readFile(path.resolve(context.publicationPacket)),
    readFile(path.resolve(auditRow.output))
  ]);
  assert.equal(sha256(publicationBytes), context.publicationOutputSha256);
  assert.equal(sha256(packetBytes), context.publicationPacketSha256);
  assert.equal(sha256(compiledBytes), auditRow.outputSha256);
  const output = JSON.parse(publicationBytes);
  const packet = JSON.parse(packetBytes);
  const compiled = JSON.parse(compiledBytes);
  const publicationValidation = validateCheckpointV22PublicationOutput(output, packet);
  const compiledValidation = validateCheckpointV22CompiledStagingRecord({
    compiled,
    output,
    packet,
    identity: identityRow
  });
  for (const [file, digest] of [
    [packet.sourceChain.transcriptPath, packet.sourceChain.transcriptSha256],
    [packet.sourceChain.eventsPath, packet.sourceChain.eventsSha256],
    [packet.sourceChain.localManifestPath, packet.sourceChain.localManifestSha256]
  ]) {
    assert.equal(sha256(await readFile(path.resolve(file))), digest, `${debateNumber}: source hash mismatch: ${file}`);
  }
  assert.deepEqual(compiled.score, context.expectedOverallScores);
  assert.equal(compiled.stagingAudit.calculatedWinner, context.expectedWinner);
  assert.equal(compiled.stagingAudit.winningMargin, context.expectedWinningMargin);
  assert.equal(publicationValidation.lockedScoresUnchanged, true);
  assert.equal(publicationValidation.calculatedScoresAuthoredByModel, 0);
  assert.equal(compiledValidation.scoresLocked, true);
  assert.equal(compiledValidation.modelAuthoredScores, 0);
  rows.push({ publicationValidation, compiledValidation });
}

assert.equal(rows.length, 10);
assert.equal(rows.reduce((sum, row) => sum + row.compiledValidation.sections, 0), 51);
assert.equal(rows.reduce((sum, row) => sum + row.compiledValidation.moves, 0), 188);
assert.equal(rows.reduce((sum, row) => sum + row.publicationValidation.critiques, 0), 188);
assert.equal(rows.reduce((sum, row) => sum + row.publicationValidation.quoteExactSourceMatches, 0), 20);
assert.equal(rows.reduce((sum, row) => sum + row.publicationValidation.overallCommentarySides, 0), 20);
assert.equal(rows.reduce((sum, row) => sum + row.publicationValidation.aiExtensionSides, 0), 20);
assert.equal(audit.totals.debates, 10);
assert.equal(audit.totals.sections, 51);
assert.equal(audit.totals.moves, 188);
assert.equal(audit.totals.modelContexts, 0);
assert.equal(audit.totals.modelAuthoredScores, 0);
assert.equal(audit.totals.scoresRecalculated, false);
assert.equal(audit.totals.directCostUsd, 0);
assert.equal(
  sha256(await readFile(path.resolve("src/data/debates.js"))),
  activation.sourceHashes["src/data/debates.js"],
  "production debate data changed during compilation"
);

console.log(JSON.stringify({
  status: "passed",
  sourceChainsReplayed: 10,
  sourceFilesHashVerified: 30,
  publicationOutputsRevalidated: 10,
  compiledRecordsReplayed: 10,
  sections: 51,
  moves: 188,
  critiques: 188,
  exactSourceQuotes: 20,
  overallCommentarySides: 20,
  aiExtensionSides: 20,
  scoresChanged: false,
  modelContexts: 0,
  modelAuthoredScores: 0,
  directCostUsd: 0,
  productionMutation: false
}, null, 2));
