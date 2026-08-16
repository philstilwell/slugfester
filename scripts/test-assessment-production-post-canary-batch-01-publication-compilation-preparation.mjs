#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_01_PUBLICATION_COMPILATION_ORDER,
  POST_CANARY_BATCH_01_PUBLICATION_COMPILATION_ROOT
} from "./lib/assessment-production-post-canary-batch-01-publication-compilation.mjs";
import { validatePostCanaryBatch01PublicationOutput } from "./lib/assessment-production-post-canary-batch-01-publication-validation.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) =>
  access(path.resolve(file)).then(
    () => true,
    () => false
  );
const ROOT = POST_CANARY_BATCH_01_PUBLICATION_COMPILATION_ROOT;
const manifest = JSON.parse(
  await readFile(path.resolve(`${ROOT}/preparation-manifest.json`), "utf8")
);
const identity = JSON.parse(
  await readFile(path.resolve(manifest.artifacts.identitySnapshot), "utf8")
);

assert.equal(
  manifest.status,
  "frozen-post-canary-batch-01-deterministic-publication-compilation-prepared-not-authorized"
);
assert.equal(manifest.productionCanary, false);
assert.equal(manifest.batchNumber, 1);
assert.equal(manifest.stagingOnly, true);
assert.deepEqual(
  manifest.explicitOrder,
  POST_CANARY_BATCH_01_PUBLICATION_COMPILATION_ORDER
);
assert.equal(manifest.contexts.length, 10);
assert.deepEqual(
  manifest.contexts.map(({ debateNumber }) => debateNumber),
  POST_CANARY_BATCH_01_PUBLICATION_COMPILATION_ORDER
);
assert.equal(manifest.aggregateExpectations.debates, 10);
assert.equal(manifest.aggregateExpectations.moves, 177);
assert.equal(manifest.aggregateExpectations.critiques, 177);
assert.equal(manifest.aggregateExpectations.exactSourceQuotes, 20);
assert.equal(manifest.aggregateExpectations.modelContexts, 0);
assert.equal(manifest.aggregateExpectations.modelAuthoredScores, 0);
assert.equal(manifest.aggregateExpectations.scorePasses, 0);
assert.equal(manifest.costEstimate.directIncrementalCostUsd, 0);
assert.equal(manifest.model.label, "5.6 Sol");
assert.equal(manifest.model.slug, "gpt-5.6-sol");
assert.equal(manifest.model.reasoningEffort, "low");
assert.equal(manifest.model.authentication, "ChatGPT subscription");
assert.equal(manifest.model.participantJudgmentWasScoreBlind, true);
assert.equal(manifest.model.contextsPlannedThisStage, 0);
assert.equal(manifest.authorization.compilationPreparation, true);
assert.equal(manifest.authorization.deterministicCompilationActivation, false);
assert.equal(manifest.authorization.deterministicCompilation, false);
assert.equal(manifest.authorization.modelExecution, false);
assert.equal(manifest.authorization.paidServices, false);
assert.equal(manifest.authorization.scoreRecalculation, false);
assert.equal(manifest.authorization.publicationFinalization, false);
assert.equal(manifest.authorization.renderingVerification, false);
assert.equal(manifest.authorization.productionMutation, false);
assert.equal(manifest.authorization.nextBatchSelection, false);
assert.equal(
  manifest.executionPolicy.deterministicRepositoryCompilationPassesMaximum,
  1
);
assert.equal(manifest.executionPolicy.rerunsMaximum, 0);
assert.equal(manifest.executionPolicy.modelContexts, 0);
assert.equal(manifest.executionPolicy.separateActivationRequired, true);
assert.equal(manifest.compilationPolicy.iterateExplicitOrderArrayDirectly, true);
assert.equal(
  manifest.compilationPolicy.numericObjectKeyEnumerationProhibited,
  true
);
assert.equal(
  manifest.compilationPolicy.currentProductionInputLimitedToFrozenIdentitySnapshot,
  true
);
assert.equal(manifest.compilationPolicy.legacyScoresUnavailable, true);
assert.equal(manifest.compilationPolicy.legacyProseUnavailable, true);
assert.equal(manifest.compilationPolicy.legacyTagsUnavailable, true);
assert.equal(manifest.compilationPolicy.legacyWinnerUnavailable, true);
assert.equal(manifest.compilationPolicy.scoresRecalculated, false);
assert.equal(manifest.compilationPolicy.scorePassesMaximum, 0);
assert.equal(manifest.compilationPolicy.modelAuthoredScores, 0);
assert.equal(manifest.compilationPolicy.productionFilesWritable, false);
assert.equal(manifest.compilationPolicy.rankingFilesWritable, false);
assert.equal(manifest.stopRules.partialCompiledOutputWriteProhibited, true);
assert.equal(manifest.stopRules.separateActivationRequired, true);
assert.equal(identity.status, "frozen-minimal-production-identity-only");
assert.deepEqual(identity.allowedFields, ["id", "number", "topicCategory"]);
assert.equal(identity.rows.length, 10);
assert.deepEqual(
  identity.rows.map((row) => row.number),
  POST_CANARY_BATCH_01_PUBLICATION_COMPILATION_ORDER
);
for (const row of identity.rows) {
  assert.ok(
    Object.keys(row).every((key) =>
      ["id", "number", "topicCategory"].includes(key)
    )
  );
}

const expectedOutputSuffixes = {
  "31": "/publication-reconstruction/repair-1/merged/debate-31.json",
  "91":
    "/publication-reconstruction/resumption-1/repair-1/merged/debate-91.json",
  "13":
    "/publication-reconstruction/resumption-1/repair-1/merged/debate-13.json"
};
let replayedMoves = 0;
for (const context of manifest.contexts) {
  if (expectedOutputSuffixes[context.debateNumber]) {
    assert.ok(
      context.publicationOutput.endsWith(
        expectedOutputSuffixes[context.debateNumber]
      )
    );
  } else {
    assert.ok(
      context.publicationOutput.endsWith(
        `/publication-reconstruction/resumption-1/outputs/debate-${context.debateNumber}.json`
      )
    );
  }
  const [outputBytes, packetBytes] = await Promise.all([
    readFile(path.resolve(context.publicationOutput)),
    readFile(path.resolve(context.publicationPacket))
  ]);
  assert.equal(sha256(outputBytes), context.publicationOutputSha256);
  assert.equal(sha256(packetBytes), context.publicationPacketSha256);
  const validation = validatePostCanaryBatch01PublicationOutput(
    JSON.parse(outputBytes),
    JSON.parse(packetBytes)
  );
  assert.equal(validation.status, "passed");
  assert.equal(validation.lockedScoresUnchanged, true);
  assert.equal(validation.calculatedScoresAuthoredByModel, 0);
  replayedMoves += validation.moves;
}
assert.equal(replayedMoves, 177);

for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert.equal(
    sha256(await readFile(path.resolve(file))),
    digest,
    `source hash mismatch: ${file}`
  );
}
for (const file of manifest.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(await exists(file), false, `future output exists: ${file}`);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      planFrozen: true,
      debates: manifest.contexts.length,
      explicitOrder: manifest.explicitOrder,
      replayedMoves,
      modelContexts: 0,
      deterministicCompilationPasses: 0,
      directIncrementalCostUsd: 0,
      compiledOutputsWritten: 0,
      productionMutation: false
    },
    null,
    2
  )
);
