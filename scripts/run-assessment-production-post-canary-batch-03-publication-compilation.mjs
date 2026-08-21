#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_03_PUBLICATION_COMPILATION_ORDER,
  POST_CANARY_BATCH_03_PUBLICATION_COMPILATION_PROTOCOL_ID,
  POST_CANARY_BATCH_03_PUBLICATION_COMPILATION_ROOT,
  compilePostCanaryBatch03PublicationStagingRecord,
  validatePostCanaryBatch03CompiledStagingRecord
} from "./lib/assessment-production-post-canary-batch-03-publication-compilation.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const ROOT = POST_CANARY_BATCH_03_PUBLICATION_COMPILATION_ROOT;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const activation = JSON.parse(
  await readFile(path.resolve(ACTIVATION), "utf8")
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) =>
  access(path.resolve(file)).then(
    () => true,
    () => false
  );

assertV4(
  activation.status ===
      "frozen-post-canary-batch-03-deterministic-publication-compilation-authorized" &&
    activation.protocolId ===
      POST_CANARY_BATCH_03_PUBLICATION_COMPILATION_PROTOCOL_ID &&
    activation.productionCanary === false &&
    activation.batchNumber === 3 &&
    activation.stagingOnly === true &&
    activation.authorization?.deterministicCompilation === true &&
    activation.authorization?.deterministicCompilationPassesMaximum === 1 &&
    activation.authorization?.rerun === false &&
    activation.authorization?.modelExecution === false &&
    activation.authorization?.paidServices === false &&
    activation.authorization?.scoreRecalculation === false &&
    activation.authorization?.publicationFinalization === false &&
    activation.authorization?.renderingVerification === false &&
    activation.authorization?.productionMutation === false &&
    activation.authorization?.nextBatchSelection === false &&
    activation.executionPolicy
      ?.deterministicRepositoryCompilationPassesMaximum === 1 &&
    activation.executionPolicy?.rerunsMaximum === 0 &&
    activation.executionPolicy?.modelContexts === 0 &&
    canonicalJson(activation.explicitOrder) ===
      canonicalJson(POST_CANARY_BATCH_03_PUBLICATION_COMPILATION_ORDER),
  "Batch 3 deterministic publication compilation is not authorized"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `compilation activation source hash mismatch: ${file}`
  );
}
for (const file of activation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(file)), `future compilation output exists: ${file}`);
}

const startedAt = new Date().toISOString();
const started = Date.now();
let status = "failed";
let failureMessage = null;
let outputArtifactsWritten = false;
let rows = [];
try {
  const identitySnapshot = JSON.parse(
    await readFile(path.resolve(activation.artifacts.identitySnapshot), "utf8")
  );
  assertV4(
    identitySnapshot.status === "frozen-minimal-production-identity-only" &&
      canonicalJson(identitySnapshot.allowedFields) ===
        canonicalJson(["id", "number", "topicCategory"]) &&
      identitySnapshot.legacyScoresIncluded === false &&
      identitySnapshot.legacyProseIncluded === false &&
      identitySnapshot.legacyTagsIncluded === false &&
      identitySnapshot.legacyWinnerIncluded === false &&
      canonicalJson(identitySnapshot.rows.map(({ number }) => number)) ===
        canonicalJson(POST_CANARY_BATCH_03_PUBLICATION_COMPILATION_ORDER),
    "minimal production identity snapshot changed"
  );
  const candidates = [];
  for (const debateNumber of POST_CANARY_BATCH_03_PUBLICATION_COMPILATION_ORDER) {
    const context = activation.contexts.find(
      (item) => item.debateNumber === debateNumber
    );
    const identity = identitySnapshot.rows.find(
      (item) => item.number === debateNumber
    );
    assertV4(context && identity, `${debateNumber}: compilation context missing`);
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
    const compiled = compilePostCanaryBatch03PublicationStagingRecord({
      output,
      packet,
      identity
    });
    const validation = validatePostCanaryBatch03CompiledStagingRecord({
      compiled,
      output,
      packet,
      identity
    });
    assertV4(
      canonicalJson(compiled.score) ===
        canonicalJson(context.expectedOverallScores) &&
        compiled.stagingAudit.calculatedWinner === context.expectedWinner &&
        compiled.stagingAudit.winningMargin === context.expectedWinningMargin,
      `${debateNumber}: locked score or winner changed during compilation`
    );
    const bytes = Buffer.from(`${JSON.stringify(compiled, null, 2)}\n`);
    candidates.push({ context, bytes, validation });
  }
  assertV4(
    candidates.length === 10 &&
      candidates.reduce(
        (sum, candidate) => sum + candidate.validation.moves,
        0
      ) === 200 &&
      candidates.every(
        (candidate) =>
          candidate.validation.status === "passed" &&
          candidate.validation.scoresLocked === true &&
          candidate.validation.scoresRecalculated === false &&
          candidate.validation.modelAuthoredScores === 0
      ),
    "complete ten-debate deterministic compilation validation failed"
  );
  for (const candidate of candidates) {
    await mkdir(
      path.dirname(path.resolve(candidate.context.plannedCompiledOutput)),
      { recursive: true }
    );
    await writeFile(
      path.resolve(candidate.context.plannedCompiledOutput),
      candidate.bytes
    );
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
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-03-deterministic-publication-compilation-audit",
    protocolId: activation.protocolId,
    status: "passed-ten-debate-batch-03-deterministic-publication-compilation",
    explicitOrder: POST_CANARY_BATCH_03_PUBLICATION_COMPILATION_ORDER,
    rows,
    totals: {
      debates: rows.length,
      sections: rows.reduce(
        (sum, row) => sum + row.validation.sections,
        0
      ),
      moves: rows.reduce((sum, row) => sum + row.validation.moves, 0),
      deterministicCompilationPasses: 1,
      reruns: 0,
      scorePasses: 0,
      modelContexts: 0,
      modelAuthoredScores: 0,
      scoresRecalculated: false,
      directIncrementalCostUsd: 0
    },
    stagingOnly: true,
    publicationFinalizationPerformed: false,
    renderingVerificationPerformed: false,
    productionMutationPerformed: false,
    nextBatchSelectionPerformed: false
  };
  await writeFile(
    path.resolve(activation.artifacts.compilationAudit),
    `${JSON.stringify(audit, null, 2)}\n`
  );
  outputArtifactsWritten = true;
  status = "passed";
} catch (error) {
  failureMessage = (error.stack ?? error.message).slice(-10000);
}

const execution = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-03-deterministic-publication-compilation-execution",
  protocolId: activation.protocolId,
  status:
    status === "passed"
      ? "ten-debate-batch-03-deterministic-publication-compilation-passed"
      : "ten-debate-batch-03-deterministic-publication-compilation-failed",
  startedAt,
  completedAt: new Date().toISOString(),
  elapsedMs: Date.now() - started,
  explicitOrder: POST_CANARY_BATCH_03_PUBLICATION_COMPILATION_ORDER,
  deterministicCompilationPasses: 1,
  reruns: 0,
  scorePasses: 0,
  modelContexts: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  rows,
  outputArtifactsWritten,
  failureMessage,
  publicationFinalizationPerformed: false,
  renderingVerificationPerformed: false,
  productionMutationPerformed: false,
  nextBatchSelectionPerformed: false
};
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-03-deterministic-publication-compilation-analysis",
  protocolId: activation.protocolId,
  status: execution.status,
  productionCanary: false,
  batchNumber: 3,
  stagingOnly: true,
  gate: {
    sourceHashesPassed: failureMessage === null,
    explicitOrderPassed: status === "passed",
    compiledRecordsPassed: status === "passed" ? 10 : rows.length,
    expectedCompiledRecords: 10,
    moves: rows.reduce((sum, row) => sum + row.validation.moves, 0),
    deterministicCompilationPasses: 1,
    reruns: 0,
    scoresRecalculated: false,
    scoresChanged: false,
    modelContexts: 0,
    modelAuthoredScores: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0
  },
  failureMessage,
  artifacts:
    status === "passed"
      ? activation.artifacts
      : {
          execution: activation.artifacts.execution,
          analysis: activation.artifacts.analysis
        },
  authorization: {
    publicationFinalizationPreparation: status === "passed",
    publicationFinalization: false,
    renderingVerification: false,
    modelExecution: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction:
    status === "passed"
      ? "prepare-batch-03-publication-finalization-under-standing-authorization"
      : "failure-diagnosis-only"
};
await writeFile(
  path.resolve(activation.artifacts.execution),
  `${JSON.stringify(execution, null, 2)}\n`
);
await writeFile(
  path.resolve(activation.artifacts.analysis),
  `${JSON.stringify(analysis, null, 2)}\n`
);
console.log(
  JSON.stringify(
    {
      status: analysis.status,
      explicitOrder: execution.explicitOrder,
      compiledRecords: rows.length,
      moves: analysis.gate.moves,
      deterministicCompilationPasses: 1,
      reruns: 0,
      scorePasses: 0,
      modelContexts: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
      productionMutation: false,
      nextAuthorizedAction: analysis.nextAuthorizedAction
    },
    null,
    2
  )
);
if (status !== "passed") process.exitCode = 1;
