#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_05_PUBLICATION_FINALIZATION_ORDER,
  POST_CANARY_BATCH_05_PUBLICATION_FINALIZATION_ROOT,
  buildPostCanaryBatch05PublicationFinalization,
  buildPostCanaryBatch05PublicationStagingPreviewHtml,
  validatePostCanaryBatch05PublicationFinalCandidate
} from "./lib/assessment-production-post-canary-batch-05-publication-finalization.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) =>
  access(path.resolve(file)).then(
    () => true,
    () => false
  );
const ROOT = POST_CANARY_BATCH_05_PUBLICATION_FINALIZATION_ROOT;
const manifest = JSON.parse(
  await readFile(path.resolve(`${ROOT}/preparation-manifest.json`), "utf8")
);
const compatibility = JSON.parse(
  await readFile(path.resolve(manifest.inputs.compatibilityAnalysis), "utf8")
);
const identities = JSON.parse(
  await readFile(path.resolve(manifest.inputs.identitySnapshot), "utf8")
);

assert.equal(
  manifest.status,
  "frozen-post-canary-batch-05-publication-finalization-prepared-not-authorized"
);
assert.equal(manifest.productionCanary, false);
assert.equal(manifest.batchNumber, 5);
assert.equal(manifest.stagingOnly, true);
assert.deepEqual(
  manifest.explicitOrder,
  POST_CANARY_BATCH_05_PUBLICATION_FINALIZATION_ORDER
);
assert.deepEqual(
  manifest.contexts.map(({ debateNumber }) => debateNumber),
  POST_CANARY_BATCH_05_PUBLICATION_FINALIZATION_ORDER
);
assert.equal(manifest.contexts.length, 10);
assert.equal(manifest.aggregateExpectations.debates, 10);
assert.equal(manifest.aggregateExpectations.sections, 49);
assert.equal(manifest.aggregateExpectations.moves, 187);
assert.equal(manifest.aggregateExpectations.modelContexts, 0);
assert.equal(manifest.aggregateExpectations.modelAuthoredScores, 0);
assert.equal(manifest.aggregateExpectations.scorePasses, 0);
assert.equal(manifest.costEstimate.directIncrementalCostUsd, 0);
assert.equal(manifest.model.label, "5.6 Sol");
assert.equal(manifest.model.slug, "gpt-5.6-sol");
assert.equal(manifest.model.reasoningEffort, "low");
assert.equal(manifest.model.authentication, "ChatGPT subscription");
assert.equal(manifest.model.independentModelPassesWereIsolated, true);
assert.equal(manifest.model.participantJudgmentWasScoreBlind, true);
assert.equal(manifest.model.integerRoundedScoreTiesPermitted, true);
assert.equal(manifest.model.contextsPlannedThisStage, 0);
assert.equal(manifest.preservedControls.independentModelPassesWereIsolated, true);
assert.equal(manifest.preservedControls.participantJudgmentWasScoreBlind, true);
assert.equal(manifest.preservedControls.integerRoundedScoreTiesPermitted, true);
assert.equal(manifest.preservedControls.integerRoundedTiePolicyPreserved, true);
assert.equal(manifest.preservedControls.priorJudgmentsChanged, false);
assert.equal(manifest.preservedControls.scoresChanged, false);
assert.equal(manifest.authorization.publicationFinalizationPreparation, true);
assert.equal(manifest.authorization.publicationFinalizationActivation, false);
assert.equal(manifest.authorization.publicationFinalization, false);
assert.equal(manifest.authorization.modelExecution, false);
assert.equal(manifest.authorization.paidServices, false);
assert.equal(manifest.authorization.scoreRecalculation, false);
assert.equal(manifest.authorization.renderingVerification, false);
assert.equal(manifest.authorization.validatorMigration, false);
assert.equal(manifest.authorization.productionLedgerPublication, false);
assert.equal(manifest.authorization.productionMutation, false);
assert.equal(manifest.authorization.nextBatchSelection, false);
assert.equal(
  manifest.executionPolicy.deterministicRepositoryFinalizationPassesMaximum,
  1
);
assert.equal(manifest.executionPolicy.rerunsMaximum, 0);
assert.equal(manifest.executionPolicy.modelContexts, 0);
assert.equal(manifest.executionPolicy.paidServiceCalls, 0);
assert.equal(manifest.executionPolicy.separateActivationRequired, true);
assert.equal(
  manifest.finalizationPolicy.onlyAllowedDisplayTransformation,
  "remove-stagingAudit"
);
assert.equal(
  manifest.finalizationPolicy.validateAllTenCandidatesBeforeAtomicBundlePublication,
  true
);
assert.equal(manifest.finalizationPolicy.displayFieldsChanged, 0);
assert.equal(manifest.finalizationPolicy.participantScoresChanged, false);
assert.equal(manifest.finalizationPolicy.scoresRecalculated, false);
assert.equal(manifest.finalizationPolicy.scorePassesMaximum, 0);
assert.equal(manifest.finalizationPolicy.productionFilesWritable, false);
assert.equal(manifest.finalizationPolicy.rankingFilesWritable, false);
assert.equal(manifest.finalizationPolicy.productionLedgerFilesWritable, false);
assert.equal(manifest.compatibilityBoundary.productionMutationBlocked, true);
assert.deepEqual(manifest.compatibilityBoundary.blockers, [
  "batch-05-site-ledger-adapter-and-validator-route"
]);
assert.equal(
  compatibility.status,
  "batch-05-production-compatibility-boundary-recorded"
);
assert.equal(compatibility.findings.length, 1);
assert.equal(compatibility.findings[0].blocksFinalizationStaging, false);
assert.equal(compatibility.findings[0].blocksRenderingVerification, false);
assert.equal(compatibility.findings[0].blocksProductionMutation, true);
assert.equal(
  compatibility.observations.optionalOverallReferenceLinksAlreadyAcceptedByCurrentValidator,
  true
);
assert.ok(Object.values(manifest.stopRules).every(Boolean));

let replayedMoves = 0;
for (const context of manifest.contexts) {
  const identity = identities.rows.find(
    (item) => item.number === context.debateNumber
  );
  assert.ok(identity);
  const [compiledBytes, outputBytes, packetBytes] = await Promise.all([
    readFile(path.resolve(context.compiledInput)),
    readFile(path.resolve(context.publicationOutput)),
    readFile(path.resolve(context.publicationPacket))
  ]);
  assert.equal(sha256(compiledBytes), context.compiledInputSha256);
  assert.equal(sha256(outputBytes), context.publicationOutputSha256);
  assert.equal(sha256(packetBytes), context.publicationPacketSha256);
  const built = buildPostCanaryBatch05PublicationFinalization({
    compiled: JSON.parse(compiledBytes),
    compiledPath: context.compiledInput,
    compiledSha256: context.compiledInputSha256,
    output: JSON.parse(outputBytes),
    packet: JSON.parse(packetBytes),
    identity
  });
  const validation = validatePostCanaryBatch05PublicationFinalCandidate({
    candidate: built.candidate,
    provenance: built.provenance,
    compiled: JSON.parse(compiledBytes),
    output: JSON.parse(outputBytes),
    packet: JSON.parse(packetBytes),
    identity
  });
  const candidateBytes = Buffer.from(
    `${JSON.stringify(built.candidate, null, 2)}\n`
  );
  const provenanceBytes = Buffer.from(
    `${JSON.stringify(built.provenance, null, 2)}\n`
  );
  assert.equal(sha256(candidateBytes), context.expectedFinalCandidateSha256);
  assert.equal(sha256(provenanceBytes), context.expectedProvenanceSha256);
  assert.equal(validation.status, "passed");
  assert.equal(validation.participantScoresChanged, false);
  assert.equal(validation.displayFieldsChanged, 0);
  replayedMoves += validation.moves;
}
assert.equal(replayedMoves, 187);

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

const preview = buildPostCanaryBatch05PublicationStagingPreviewHtml();
assert.match(preview, /noindex,nofollow/);
assert.match(preview, /validated post-canary Batch 5 candidate only/);
assert.match(preview, /renderPublicationStagingDebate/);

console.log(
  JSON.stringify(
    {
      status: "passed",
      planFrozen: true,
      debates: manifest.contexts.length,
      explicitOrder: manifest.explicitOrder,
      sections: manifest.aggregateExpectations.sections,
      replayedMoves,
      productionMutationBlockers: manifest.compatibilityBoundary.blockers,
      modelContexts: 0,
      deterministicFinalizationPasses: 0,
      directIncrementalCostUsd: 0,
      finalCandidatesWritten: false,
      previewWritten: false,
      productionMutation: false
    },
    null,
    2
  )
);
