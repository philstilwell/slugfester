#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { publishedDebates } from "../src/data/debates.js";
import {
  validateCheckpointV22SiteLedgerAdapter
} from "./lib/assessment-production-checkpoint-v2.2-compatibility-remedy.mjs";
import {
  CHECKPOINT_V22_PRODUCTION_MUTATION_ORDER,
  CHECKPOINT_V22_PRODUCTION_MUTATION_ROOT,
  buildDebatesProjection,
  publicProjectionRecord,
  renderSeoOutputsInMemory,
  serializedJson,
  sha256,
  summarizeSeoProjection
} from "./lib/assessment-production-checkpoint-v2.2-production-mutation.mjs";

const root = process.cwd();
const resolve = (relativePath) => path.resolve(root, relativePath);
const readJson = (relativePath) =>
  readFile(resolve(relativePath), "utf8").then(JSON.parse);
const exists = (relativePath) =>
  access(resolve(relativePath)).then(
    () => true,
    () => false
  );
const paths = {
  packet: `${CHECKPOINT_V22_PRODUCTION_MUTATION_ROOT}/mutation-packet.json`,
  preparation: `${CHECKPOINT_V22_PRODUCTION_MUTATION_ROOT}/preparation-manifest.json`,
  analysis: `${CHECKPOINT_V22_PRODUCTION_MUTATION_ROOT}/analysis.json`,
  activation: `${CHECKPOINT_V22_PRODUCTION_MUTATION_ROOT}/execution-activation.json`,
  execution: `${CHECKPOINT_V22_PRODUCTION_MUTATION_ROOT}/execution.json`,
  productionDebates: "src/data/debates.js"
};

const [packetBytes, preparationBytes, analysis, productionSource] =
  await Promise.all([
    readFile(resolve(paths.packet)),
    readFile(resolve(paths.preparation)),
    readJson(paths.analysis),
    readFile(resolve(paths.productionDebates), "utf8")
  ]);
const packet = JSON.parse(packetBytes);
const preparation = JSON.parse(preparationBytes);

assert.equal(
  preparation.status,
  "ten-debate-production-mutation-plan-prepared-and-frozen"
);
assert.equal(
  analysis.status,
  "ten-debate-production-mutation-plan-freeze-passed"
);
assert.equal(packet.status, "ten-debate-production-mutation-plan-packet-frozen");
assert.equal(preparation.planningOnly, true);
assert.equal(packet.planningOnly, true);
assert.equal(preparation.invariants.assessmentModel, "5.6 Sol");
assert.equal(preparation.invariants.reasoningEffort, "low");
assert.equal(preparation.invariants.authentication, "ChatGPT subscription");
assert.equal(
  preparation.invariants.scoreBlindnessOfCompletedIndependentJudgmentsPreserved,
  true
);
assert.equal(preparation.invariants.integerRoundedTiesAllowed, true);
assert.equal(preparation.invariants.oneCompletedScorePassOnly, true);
assert.equal(preparation.invariants.judgmentExecutionAllowed, false);
assert.equal(preparation.invariants.scoreRerunAllowed, false);
assert.deepEqual(
  preparation.scope.debateOrder,
  CHECKPOINT_V22_PRODUCTION_MUTATION_ORDER
);
assert.equal(preparation.scope.exactProductionPathCount, 23);
assert.equal(new Set(preparation.scope.exactProductionPaths).size, 23);

assert.equal(preparation.totals.debates, 10);
assert.equal(preparation.totals.sections, 51);
assert.equal(preparation.totals.moves, 188);
assert.equal(preparation.totals.overallScores, 20);
assert.equal(preparation.totals.integerRoundedTies, 2);
assert.equal(preparation.totals.sourceDebateObjectsUnchanged, 185);
assert.equal(preparation.totals.generatedSeoOutputsChecked, 380);
assert.equal(preparation.totals.generatedSeoOutputsChanged, 12);
assert.equal(preparation.totals.generatedSeoOutputsUnchanged, 368);
assert.equal(preparation.totals.exactProductionPathsPlanned, 23);
assert.equal(preparation.totals.judgmentModelContexts, 0);
assert.equal(preparation.totals.scorePassesRerun, 0);
assert.equal(preparation.totals.meteredApiCostUsd, 0);
assert.equal(preparation.totals.productionMutations, 0);

assert.equal(
  sha256(packetBytes),
  preparation.artifacts.mutationPacket.sha256
);
assert.equal(packetBytes.byteLength, preparation.artifacts.mutationPacket.bytes);
assert.equal(
  sha256(preparationBytes),
  analysis.preparation.sha256
);
assert.equal(preparationBytes.byteLength, analysis.preparation.bytes);
assert.equal(await exists(paths.activation), false);
assert.equal(await exists(paths.execution), false);

for (const [sourcePath, expectedSha256] of Object.entries(
  preparation.frozenSources
)) {
  assert.equal(
    sha256(await readFile(resolve(sourcePath))),
    expectedSha256,
    sourcePath
  );
}

const candidatesByNumber = new Map();
for (const record of packet.debates) {
  assert.equal(await exists(record.productionLedger.path), false);
  const [candidateBytes, stagedLedgerBytes] = await Promise.all([
    readFile(resolve(record.candidate.path)),
    readFile(resolve(record.stagedLedger.path))
  ]);
  assert.equal(candidateBytes.byteLength, record.candidate.bytes);
  assert.equal(sha256(candidateBytes), record.candidate.sha256);
  assert.equal(stagedLedgerBytes.byteLength, record.stagedLedger.bytes);
  assert.equal(sha256(stagedLedgerBytes), record.stagedLedger.sha256);
  const candidate = JSON.parse(candidateBytes);
  const stagedLedger = JSON.parse(stagedLedgerBytes);
  const validation = validateCheckpointV22SiteLedgerAdapter({
    adapter: stagedLedger,
    candidate,
    expectedSourceLocks: stagedLedger.sourceLocks
  });
  assert.equal(validation.repositoryScoreReplayPassed, true);
  candidatesByNumber.set(record.debateNumber, candidate);
}

const projection = buildDebatesProjection({
  source: productionSource,
  currentDebates: publishedDebates,
  candidatesByNumber
});
assert.deepEqual(projection.sourceProof, packet.transformation.productionDebates.proof);
assert.equal(
  projection.sourceProof.beforeSha256,
  "e0004963bc145d1f6a9e1c17a49e0fb848c23cccb4a6c03d6587cc24b8442bf6"
);
assert.equal(
  projection.sourceProof.projectedAfterSha256,
  "7043a9f8e3da3c6a2dbf9eb7af4c6df37c5eb63d91689c5c406397dca25a6561"
);
assert.equal(
  projection.sourceProof.unchangedDebateObjectSha256,
  "154a29f6e213ad8fcd574ce035812e7c7816d1ba991bac18dcb3e34adfc71152"
);
assert.equal(
  projection.sourceProof.outsideTargetSpanSha256,
  "b53b31254b708c2114d73927cbbf44ab293313d206c1bc57cd2157bc3f085e36"
);
for (const record of packet.debates) {
  const projectedRecord = projection.records.find(
    (candidateRecord) => candidateRecord.debateNumber === record.debateNumber
  );
  assert.deepEqual(
    publicProjectionRecord(projectedRecord),
    record.productionDebateProjection
  );
}

const tieDebates = packet.debates
  .filter(({ productionDebateProjection: { proposedScore } }) =>
    proposedScore.pro === proposedScore.con
  )
  .map((record) => record.debateNumber);
assert.deepEqual(tieDebates, ["129", "10"]);

const [beforeSeoOutputs, afterSeoOutputs] = await Promise.all([
  renderSeoOutputsInMemory({ root, debates: publishedDebates, tag: "test-before" }),
  renderSeoOutputsInMemory({
    root,
    debates: projection.projectedDebates,
    tag: "test-projected-after"
  })
]);
const seoProjection = summarizeSeoProjection({
  beforeOutputs: beforeSeoOutputs,
  afterOutputs: afterSeoOutputs
});
assert.deepEqual(
  seoProjection.changedOutputs,
  packet.transformation.generatedSeo.changedOutputs
);
assert.equal(
  seoProjection.unchangedOutputsManifestSha256,
  packet.transformation.generatedSeo.unchangedOutputsManifestSha256
);
for (const [outputPath, expectedContent] of beforeSeoOutputs) {
  assert.equal(
    await readFile(resolve(outputPath), "utf8"),
    expectedContent,
    outputPath
  );
}

for (const forbidden of [
  "productionMutationExecution",
  "productionLedgerPublication",
  "productionDebatesChange",
  "generatedSeoPublication",
  "remainingProductionBatches"
]) {
  assert.equal(preparation.authorization[forbidden], false, forbidden);
}
assert.equal(preparation.authorization.productionMutationExecutionActivation, true);
assert.equal(
  preparation.nextAuthorizedAction,
  "user-decision-on-ten-debate-production-mutation-execution-activation"
);
assert.equal(analysis.checks.productionFilesChanged, 0);
assert.equal(analysis.checks.productionMutationPerformed, false);
assert.equal(
  serializedJson(packet),
  packetBytes.toString("utf8")
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: packet.debates.length,
      moves: preparation.totals.moves,
      productionPathsFrozen: preparation.scope.exactProductionPathCount,
      generatedSeoOutputsProjected:
        preparation.totals.generatedSeoOutputsChanged,
      judgmentExecutions: 0,
      productionMutationPerformed: false
    },
    null,
    2
  )
);
