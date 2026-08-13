#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_PUBLICATION_COMPILATION_ORDER,
  CHECKPOINT_V22_PUBLICATION_COMPILATION_PROTOCOL_ID,
  CHECKPOINT_V22_PUBLICATION_COMPILATION_ROOT,
  compileCheckpointV22PublicationStagingRecord,
  validateCheckpointV22CompiledStagingRecord
} from "./lib/assessment-production-checkpoint-v2.2-publication-compilation.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const activationPath = `${CHECKPOINT_V22_PUBLICATION_COMPILATION_ROOT}/execution-activation.json`;
const activation = JSON.parse(await readFile(path.resolve(activationPath), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(
  activation.status === "deterministic-publication-compilation-execution-authorized-and-frozen" &&
    activation.protocolId === CHECKPOINT_V22_PUBLICATION_COMPILATION_PROTOCOL_ID &&
    activation.authorization.deterministicCompilation === true &&
    activation.authorization.modelExecution === false &&
    activation.authorization.scoreRecalculation === false &&
    activation.authorization.publicationFinalization === false &&
    activation.authorization.renderingVerification === false &&
    activation.authorization.productionMutation === false &&
    canonicalJson(activation.explicitOrder) === canonicalJson(CHECKPOINT_V22_PUBLICATION_COMPILATION_ORDER),
  "deterministic publication compilation is not authorized or controls changed"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `activation source hash mismatch: ${file}`);
}
for (const file of activation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(file)), `future compilation output already exists: ${file}`);
}

const startedAt = new Date().toISOString();
const started = Date.now();
let status = "failed";
let failureMessage = null;
let outputArtifactsWritten = false;
let rows = [];
try {
  const identitySnapshot = JSON.parse(await readFile(path.resolve(activation.artifacts.identitySnapshot), "utf8"));
  assertV4(
    identitySnapshot.status === "frozen-minimal-production-identity-only" &&
      canonicalJson(identitySnapshot.allowedFields) === canonicalJson(["id", "number", "topicCategory"]) &&
      identitySnapshot.legacyScoresIncluded === false &&
      identitySnapshot.legacyProseIncluded === false &&
      identitySnapshot.legacyTagsIncluded === false &&
      identitySnapshot.legacyWinnerIncluded === false,
    "minimal production identity snapshot changed"
  );
  const candidates = [];
  // The frozen array is the sole loop driver; numeric object-key enumeration is prohibited.
  for (const debateNumber of CHECKPOINT_V22_PUBLICATION_COMPILATION_ORDER) {
    const context = activation.contexts.find((item) => item.debateNumber === debateNumber);
    const identity = identitySnapshot.rows.find((item) => item.number === debateNumber);
    assertV4(context && identity, `${debateNumber}: frozen compilation context missing`);
    const [outputBytes, packetBytes] = await Promise.all([
      readFile(path.resolve(context.publicationOutput)),
      readFile(path.resolve(context.publicationPacket))
    ]);
    assertV4(
      sha256(outputBytes) === context.publicationOutputSha256 &&
        sha256(packetBytes) === context.publicationPacketSha256,
      `${debateNumber}: frozen publication input hash changed`
    );
    const output = JSON.parse(outputBytes);
    const packet = JSON.parse(packetBytes);
    const compiled = compileCheckpointV22PublicationStagingRecord({ output, packet, identity });
    const validation = validateCheckpointV22CompiledStagingRecord({ compiled, output, packet, identity });
    const bytes = Buffer.from(`${JSON.stringify(compiled, null, 2)}\n`);
    candidates.push({ context, bytes, validation, compiled });
  }
  assertV4(
    candidates.length === 10 &&
      candidates.reduce((sum, candidate) => sum + candidate.validation.moves, 0) === 188 &&
      candidates.every((candidate) => candidate.validation.status === "passed"),
    "complete ten-debate deterministic compilation validation failed"
  );
  for (const candidate of candidates) {
    await mkdir(path.dirname(path.resolve(candidate.context.plannedCompiledOutput)), { recursive: true });
    await writeFile(path.resolve(candidate.context.plannedCompiledOutput), candidate.bytes);
    rows.push({
      debateNumber: candidate.context.debateNumber,
      debateId: candidate.context.debateId,
      output: candidate.context.plannedCompiledOutput,
      outputSha256: sha256(candidate.bytes),
      scores: candidate.context.expectedOverallScores,
      winner: candidate.context.expectedWinner,
      winningMargin: candidate.context.expectedWinningMargin,
      validation: candidate.validation
    });
  }
  const audit = {
    schemaVersion: "1.0-production-checkpoint-v2.2-deterministic-publication-compilation-audit",
    protocolId: activation.protocolId,
    status: "passed-ten-debate-deterministic-publication-compilation",
    explicitOrder: CHECKPOINT_V22_PUBLICATION_COMPILATION_ORDER,
    rows,
    totals: {
      debates: rows.length,
      sections: rows.reduce((sum, row) => sum + row.validation.sections, 0),
      moves: rows.reduce((sum, row) => sum + row.validation.moves, 0),
      modelContexts: 0,
      modelAuthoredScores: 0,
      scoresRecalculated: false,
      directCostUsd: 0
    },
    stagingOnly: true,
    publicationFinalizationPerformed: false,
    renderingVerificationPerformed: false,
    productionMutationPerformed: false
  };
  await writeFile(path.resolve(activation.artifacts.compilationAudit), `${JSON.stringify(audit, null, 2)}\n`);
  outputArtifactsWritten = true;
  status = "passed";
} catch (error) {
  failureMessage = (error.stack ?? error.message).slice(-10000);
}

const execution = {
  schemaVersion: "1.0-production-checkpoint-v2.2-deterministic-publication-compilation-execution",
  protocolId: activation.protocolId,
  status: status === "passed" ? "ten-debate-deterministic-publication-compilation-passed" : "ten-debate-deterministic-publication-compilation-failed",
  startedAt,
  completedAt: new Date().toISOString(),
  elapsedMs: Date.now() - started,
  explicitOrder: CHECKPOINT_V22_PUBLICATION_COMPILATION_ORDER,
  contexts: 0,
  retries: 0,
  scorePasses: 0,
  directCostUsd: 0,
  rows,
  outputArtifactsWritten,
  failureMessage,
  publicationFinalizationPerformed: false,
  renderingVerificationPerformed: false,
  productionMutationPerformed: false
};
const analysis = {
  schemaVersion: "1.0-production-checkpoint-v2.2-deterministic-publication-compilation-analysis",
  protocolId: activation.protocolId,
  status: status === "passed" ? "ten-debate-deterministic-publication-compilation-passed" : "ten-debate-deterministic-publication-compilation-failed",
  productionCanary: true,
  stagingOnly: true,
  gate: {
    sourceHashesPassed: failureMessage === null,
    explicitOrderPassed: status === "passed",
    compiledRecordsPassed: status === "passed" ? 10 : rows.length,
    expectedCompiledRecords: 10,
    moves: rows.reduce((sum, row) => sum + row.validation.moves, 0),
    scoresRecalculated: false,
    scoresChanged: false,
    modelContexts: 0,
    modelAuthoredScores: 0,
    directCostUsd: 0
  },
  failureMessage,
  artifacts: status === "passed" ? activation.artifacts : {
    execution: activation.artifacts.execution,
    analysis: activation.artifacts.analysis
  },
  authorization: {
    publicationFinalizationPlanPreparation: status === "passed",
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction: status === "passed"
    ? "user-decision-on-publication-finalization-plan-preparation"
    : "failure-diagnosis-only"
};
await writeFile(path.resolve(activation.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
await writeFile(path.resolve(activation.artifacts.analysis), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({
  status: analysis.status,
  explicitOrder: execution.explicitOrder,
  compiledRecords: rows.length,
  moves: analysis.gate.moves,
  modelContexts: 0,
  directCostUsd: 0,
  productionMutation: false,
  nextAuthorizedAction: analysis.nextAuthorizedAction
}, null, 2));
if (status !== "passed") process.exitCode = 1;
