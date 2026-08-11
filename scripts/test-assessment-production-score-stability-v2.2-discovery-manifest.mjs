#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

import {
  V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
  V212_DISCOVERY_PROTOCOL_ID,
  buildV212TokenCountedChunkLedger,
} from "./lib/assessment-production-score-stability-v2.1.2-discovery.mjs";
import {
  validateV42219ChunkLedger,
  validateV42219PartitionPlan,
} from "./lib/v42219-generalized-partition.mjs";

const MANIFEST =
  "docs/assessment-production/score-stability-v2.2-validation-cohort/discovery/execution-preparation-manifest.json";
const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
const preparation = JSON.parse(await readFile(manifest.preparation, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

assert.equal(
  manifest.status,
  "frozen-thirty-eight-v2.2-validation-discovery-contexts-prepared-not-authorized"
);
assert.equal(manifest.discoveryProtocolId, V212_DISCOVERY_PROTOCOL_ID);
assert.equal(manifest.developmentValidationOnly, true);
assert.equal(manifest.productionCanary, false);
assert.equal(manifest.stagingOnly, true);
assert.equal(manifest.proposedPolicy.version, "v2.2-proposal");
assert.equal(
  manifest.proposedPolicy.agreedWinningSideMayCollapseToIntegerRoundedTie,
  true
);
assert.equal(
  manifest.proposedPolicy.agreedInitialTieImposesNoDirectionConstraint,
  true
);
assert.equal(manifest.proposedPolicy.numericalThresholdsChanged, false);
assert.equal(manifest.proposedPolicy.promoted, false);
assert.equal(
  manifest.inventorySuccessorContract.planAndSideIsolationPreserved,
  true
);
assert.equal(
  manifest.inventorySuccessorContract.fallbackConditionRepositoryOwned,
  true
);
assert.equal(manifest.inventorySuccessorContract.scoreFieldsAvailable, false);
assert.deepEqual(manifest.discoverySuccessorContract.sourceSelectionShape, [
  "startEvent",
  "endEvent",
]);
assert.equal(
  manifest.discoverySuccessorContract.minimumLexicalTokens,
  V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS
);
assert.equal(
  manifest.discoverySuccessorContract.repositoryDerivedLexicalTokenCount,
  true
);
assert.equal(
  manifest.discoverySuccessorContract.requestedLexicalTokensRemoved,
  true
);
assert.deepEqual(manifest.model, {
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription",
  scoreBlind: true,
});
assert.equal(manifest.contexts.length, 38);
assert.deepEqual(
  manifest.contexts.map((context) => context.contextIndex),
  Array.from({ length: 38 }, (_, index) => index)
);
assert.equal(manifest.executionPolicy.contexts, 38);
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutMsPerContext, 300000);
assert.equal(manifest.executionPolicy.absoluteGateTimeoutMs, 7200000);
assert.equal(manifest.executionPolicy.copiedInputBytesMaximum, 70000);
assert.equal(preparation.totals.maximumCopiedInputBytes <= 70000, true);
assert.equal(manifest.executionPolicy.maximumParallelContexts, 4);
assert.deepEqual(manifest.executionPolicy.schedulerRamp, [1, 2, 4]);
assert.equal(manifest.executionPolicy.separateActivationRequired, true);
assert.equal(manifest.executionPolicy.APIKeysRemoved, true);
assert.equal(manifest.costEstimate.contexts, 38);
assert.equal(manifest.costEstimate.directIncrementalCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.meteredApiCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.transcriptionCostUsdMaximum, 0);
assert.deepEqual(manifest.costEstimate.expectedParallelWallMinutes, [18, 32]);
assert.equal(manifest.isolation.oneChunkPerContext, true);
assert.equal(
  manifest.isolation.modelReceivesTokenCountedLedgerNotValidationLedger,
  true
);
assert.equal(manifest.isolation.otherChunksUnavailable, true);
assert.equal(manifest.isolation.otherOutputsUnavailable, true);
assert.equal(manifest.isolation.ratingsScoresWinnersUnavailable, true);
assert.equal(manifest.compilationPolicy.allContextsMustValidate, true);
assert.equal(manifest.compilationPolicy.modelAuthoredEndEventsRequired, true);
assert.equal(
  manifest.compilationPolicy.modelAuthoredEndEventsBoundedByLockedContext,
  true
);
assert.equal(
  manifest.compilationPolicy.repositoryDerivesAllSourceWindowLexicalTokenCounts,
  true
);
assert.equal(
  manifest.compilationPolicy.minimumLexicalTokens,
  V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS
);
assert.equal(
  manifest.compilationPolicy.minimumLexicalTokensDeterministicallyEnforced,
  true
);
assert.equal(
  manifest.compilationPolicy
    .minimumLexicalTokensStructurallyEnforcedByTransportSchema,
  false
);
assert.equal(manifest.compilationPolicy.requestedLexicalTokensAccepted, false);
assert.equal(manifest.compilationPolicy.silentSemanticDeduplication, false);
assert.equal(manifest.compilationPolicy.automaticSemanticCorrection, false);
assert.equal(manifest.compilationPolicy.scoresDerived, false);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source drift`);
}
for (const file of manifest.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(Object.hasOwn(manifest.sourceHashes, file), false);
  assert.equal(await exists(file), false, `${file}: future output already exists`);
}
assert.equal(manifest.authorization.executionActivationPreparation, true);
for (const [key, value] of Object.entries(manifest.authorization)) {
  if (key !== "executionActivationPreparation") {
    assert.equal(value, false, `${key}: must be false`);
  }
}
assert.equal(Object.values(manifest.stopRules).every(Boolean), true);

const preparedByContext = new Map();
for (const debate of preparation.contexts) {
  const [planBytes, fullLedgerBytes] = await Promise.all([
    readFile(debate.plan),
    readFile(debate.fullLedger),
  ]);
  const plan = JSON.parse(planBytes);
  validateV42219PartitionPlan(plan, fullLedgerBytes);
  for (const chunk of debate.chunks) {
    preparedByContext.set(`${debate.debateNumber}/${chunk.chunkId}`, {
      chunk,
      fullLedgerBytes,
    });
  }
}
assert.equal(preparedByContext.size, 38);
for (const context of manifest.contexts) {
  assert.equal(
    context.copiedInputBytes <= manifest.executionPolicy.copiedInputBytesMaximum,
    true,
    `${context.debateNumber}/${context.chunkId}: copied-input ceiling exceeded`
  );
  const prepared = preparedByContext.get(
    `${context.debateNumber}/${context.chunkId}`
  );
  assert(prepared, `${context.debateNumber}/${context.chunkId}: not prepared`);
  const [chunkBytes, tokenBytes, schemaBytes] = await Promise.all([
    readFile(context.validationChunkLedgerPath),
    readFile(context.modelTokenCountedLedgerPath),
    readFile(context.schemaPath),
  ]);
  assert.equal(
    validateV42219ChunkLedger(
      chunkBytes,
      prepared.fullLedgerBytes,
      prepared.chunk
    ).status,
    "passed"
  );
  assert.equal(sha256(chunkBytes), context.validationChunkLedgerSha256);
  assert.equal(sha256(tokenBytes), context.modelTokenCountedLedgerSha256);
  assert(buildV212TokenCountedChunkLedger(chunkBytes).equals(tokenBytes));
  assert.equal(sha256(schemaBytes), context.schemaSha256);
  const schema = JSON.parse(schemaBytes);
  const sourceWindow =
    schema.properties.candidates.items.properties.sourceWindow;
  assert.equal(
    sourceWindow.properties.startEvent.minimum,
    context.coreStartEvent
  );
  assert.equal(
    sourceWindow.properties.startEvent.maximum,
    context.coreEndEvent
  );
  assert.equal(
    sourceWindow.properties.endEvent.minimum,
    context.coreStartEvent
  );
  assert.equal(
    sourceWindow.properties.endEvent.maximum,
    context.contextEndEvent
  );
  assert.equal(
    Object.hasOwn(sourceWindow.properties, "requestedLexicalTokens"),
    false
  );
}
assert.equal(
  manifest.nextAuthorizedAction,
  "prepare-separate-v2.2-discovery-execution-activation-only"
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      contexts: 38,
      exactContextOrder: true,
      exactTokenLedgerReplay: true,
      maximumParallelContexts: 4,
      retriesMaximum: 0,
      timeoutExtensionsMaximum: 0,
      expectedParallelWallMinutes:
        manifest.costEstimate.expectedParallelWallMinutes,
      authentication: manifest.model.authentication,
      directIncrementalCostUsdMaximum: 0,
      modelContextsAuthorized: false,
      scoresDerived: 0,
      nextAuthorizedAction: manifest.nextAuthorizedAction,
    },
    null,
    2
  )
);
