#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

import { canonicalJson } from "./lib/v4-lean-production.mjs";
import { normalizeV418Events } from "./lib/v418-source-integrity.mjs";

const ROOT = "docs/assessment-production/canary-v1-independent-judgments";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const MANIFEST = `${ROOT}/execution-manifest.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const EXPECTED_DEBATES = ["05", "13", "37", "64", "65", "81", "130", "138", "152", "188"];
const PHASE_INDEXES = [[0], [1, 2], Array.from({ length: 17 }, (_, index) => index + 3)];
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const preparation = JSON.parse(await readFile(PREPARATION, "utf8"));
assert.equal(
  preparation.status,
  "twenty-production-canary-independent-judgment-contexts-prepared-and-frozen"
);
assert.equal(preparation.contexts.length, 20);
assert.equal(preparation.totals.debates, 10);
assert.equal(preparation.totals.uniqueMoves, 186);
assert.equal(preparation.totals.movesJudgedAcrossPasses, 372);
assert(preparation.totals.maximumCopiedInputBytes <= 115000);
assert.equal(preparation.model.label, "5.6 Sol");
assert.equal(preparation.model.slug, "gpt-5.6-sol");
assert.equal(preparation.model.reasoningEffort, "low");
assert.equal(preparation.model.authentication, "ChatGPT subscription");

for (const debateNumber of EXPECTED_DEBATES) {
  const pair = preparation.contexts.filter((context) => context.debateNumber === debateNumber);
  assert.deepEqual(pair.map((context) => context.reviewerPass), ["A", "B"]);
  assert.equal(pair[0].lockedInventoryCanonicalSha256, pair[1].lockedInventoryCanonicalSha256);
  assert.equal(pair[0].sourcePacketSha256, pair[1].sourcePacketSha256);
  const [ledgerBytes, originalEventsDocument] = await Promise.all([
    readFile(pair[0].fullLedger),
    readFile(pair[0].originalEvents, "utf8").then(JSON.parse)
  ]);
  const ledgerProjection = ledgerBytes.toString("utf8").trimEnd().split("\n").map((line, index) => {
    const row = JSON.parse(line);
    assert.deepEqual(row.slice(0, 1), [index]);
    return { startMs: row[1], durationMs: row[2], text: row[3] };
  });
  const originalProjection = normalizeV418Events(originalEventsDocument).map((event) => ({
    startMs: event.startMs,
    durationMs: event.durationMs,
    text: event.text
  }));
  assert.equal(canonicalJson(ledgerProjection), canonicalJson(originalProjection));
}

if (!(await exists(MANIFEST))) {
  for (const context of preparation.contexts) {
    for (const future of [
      context.judgmentOutput,
      context.rawOutput,
      context.validationOutput,
      context.provenanceOutput
    ]) assert.equal(await exists(future), false, `prefreeze future output exists: ${future}`);
  }
  assert.equal(await exists(EXECUTION), false);
  assert.equal(await exists(ANALYSIS), false);
  console.log(JSON.stringify({
    status: "passed-prefreeze",
    debates: 10,
    contexts: 20,
    uniqueMoves: 186,
    canonicalEventProjectionReplay: true,
    modelContextsExecuted: 0,
    scoresDerived: 0
  }, null, 2));
  process.exit(0);
}

const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
assert.equal(
  manifest.status,
  "frozen-twenty-production-canary-independent-judgment-contexts-authorized"
);
assert.equal(manifest.productionCanary, true);
assert.equal(manifest.stagingOnly, true);
assert.equal(manifest.contexts.length, 20);
assert.equal(manifest.model.label, "5.6 Sol");
assert.equal(manifest.model.slug, "gpt-5.6-sol");
assert.equal(manifest.model.reasoningEffort, "low");
assert.equal(manifest.executionEnvironment.authentication, "ChatGPT subscription");
assert.equal(manifest.costEstimate.meteredApiCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.transcriptionCostUsdMaximum, 0);
assert.equal(manifest.executionPolicy.contexts, 20);
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutMsPerContext, 900000);
assert.equal(manifest.executionPolicy.absoluteGateTimeoutMs, 10800000);
assert.equal(manifest.executionPolicy.maximumParallelContexts, 2);
assert.deepEqual(manifest.executionPolicy.schedulerRamp, [1, 2]);
assert.deepEqual(
  manifest.executionPolicy.rampPhases.map((phase) => phase.contextIndexes),
  PHASE_INDEXES
);
assert.equal(manifest.executionPolicy.stopBeforeExpansionOnRampFailure, true);
assert.equal(manifest.executionPolicy.continueIndependentContextsWithinStartedSteadyPhaseAfterFailure, true);
assert.equal(manifest.executionPolicy.APIKeysRemoved, true);
assert.deepEqual(manifest.executionPolicy.removedEnvironmentVariables, [
  "OPENAI_API_KEY",
  "OPENAI_ORG_ID",
  "OPENAI_PROJECT_ID",
  "OPENAI_BASE_URL",
  "AZURE_OPENAI_API_KEY",
  "CODEX_API_KEY"
]);
assert.equal(manifest.authorization.modelContexts, true);
assert.equal(manifest.authorization.deterministicValidation, true);
assert.equal(manifest.authorization.deterministicCompilation, true);
assert.equal(manifest.authorization.deterministicAnalysis, true);
for (const key of [
  "retry",
  "semanticCorrection",
  "disagreementExtraction",
  "paidTranscription",
  "audioVerification",
  "adjudicationExecution",
  "scoreDerivation",
  "publicationFinalization",
  "productionMutation",
  "remainingProductionBatches"
]) assert.equal(manifest.authorization[key], false, `${key} must remain unauthorized before execution`);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`);
}

if (!(await exists(EXECUTION))) {
  for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
    assert.equal(await exists(future), false, `prefrozen future output exists: ${future}`);
  }
  console.log(JSON.stringify({
    status: "passed-frozen",
    debates: 10,
    contexts: 20,
    ramp: [1, 2, 17],
    maximumParallelContexts: 2,
    retries: 0,
    expectedParallelWallMinutes: manifest.costEstimate.expectedParallelWallMinutes,
    authentication: manifest.costEstimate.authentication,
    modelContextsExecuted: 0,
    scoresDerived: 0
  }, null, 2));
  process.exit(0);
}

const execution = JSON.parse(await readFile(EXECUTION, "utf8"));
assert.equal(execution.contextsPlanned, 20);
assert(execution.contextsAttempted >= 1 && execution.contextsAttempted <= 20);
assert.equal(execution.contextsUnattempted, 20 - execution.contextsAttempted);
assert.equal(execution.attempts, execution.contextsAttempted);
assert.equal(execution.retries, 0);
assert.equal(execution.scoresDerived, 0);
assert.equal(execution.results.length, execution.contextsAttempted);
assert.equal(new Set(execution.results.map((result) => result.contextIndex)).size, execution.results.length);
assert(execution.results.every((result) => result.attemptCount === 1 && result.retryCount === 0));
assert(execution.maximumParallelContextsObserved <= 2);
assert.deepEqual(execution.schedulerRamp, [1, 2]);
assert.deepEqual(execution.rampPhases.map((phase) => phase.contextIndexes), PHASE_INDEXES);
const [phaseOne, phaseTwo, phaseThree] = execution.rampPhases;
if (!phaseOne.passed) {
  assert.deepEqual(phaseTwo.attemptedContextIndexes, []);
  assert.deepEqual(phaseThree.attemptedContextIndexes, []);
} else if (!phaseTwo.passed) {
  assert.deepEqual(phaseThree.attemptedContextIndexes, []);
} else {
  assert.deepEqual(phaseThree.attemptedContextIndexes, PHASE_INDEXES[2]);
}
for (const result of execution.results) {
  const context = manifest.contexts[result.contextIndex];
  if (result.judgmentWritten) {
    assert.equal(result.judgmentSha256, sha256(await readFile(context.judgmentOutput)));
  }
  if (result.accepted) {
    assert.equal(result.rawOutputSha256, sha256(await readFile(context.rawOutput)));
    assert.equal(result.validationSha256, sha256(await readFile(context.validationOutput)));
    assert.equal(result.provenanceSha256, sha256(await readFile(context.provenanceOutput)));
  }
}

if (execution.status === "twenty-production-canary-independent-judgment-contexts-passed") {
  assert.equal(execution.contextsAttempted, 20);
  assert.equal(execution.contextsUnattempted, 0);
  assert.equal(execution.validContexts, 20);
  assert.equal(execution.invalidContexts, 0);
  assert.deepEqual(execution.unattemptedContextIndexes, []);
  assert(execution.rampPhases.every((phase) => phase.passed));
  for (const debateNumber of EXPECTED_DEBATES) {
    const pair = execution.results.filter((result) => result.debateNumber === debateNumber);
    assert.equal(pair.length, 2);
    assert(pair.every((result) => result.accepted && result.judgmentSha256 && result.rawOutputSha256));
    assert.notEqual(pair[0].judgmentSha256, pair[1].judgmentSha256);
  }
} else {
  assert.equal(execution.status, "production-canary-independent-judgment-gate-complete-with-failure");
  assert(execution.invalidContexts > 0 || execution.unattemptedContextIndexes.length > 0);
}

if (!(await exists(ANALYSIS))) {
  console.log(JSON.stringify({
    status: "passed-executed",
    executionStatus: execution.status,
    contextsAttempted: execution.contextsAttempted,
    validContexts: execution.validContexts,
    retries: 0,
    scoresDerived: 0
  }, null, 2));
  process.exit(0);
}

const analysis = JSON.parse(await readFile(ANALYSIS, "utf8"));
assert.equal(analysis.contexts.length, execution.contextsAttempted);
assert.equal(analysis.pairs.length, 10);
assert.equal(analysis.acceptance.scores, 0);
assert.equal(analysis.authorization.independentJudgmentModelExecution, false);
assert.equal(analysis.authorization.audioVerificationPreparation, false);
assert.equal(analysis.authorization.adjudicationPreparation, false);
assert.equal(analysis.authorization.scoreDerivation, false);
assert.equal(analysis.authorization.publicationFinalization, false);
assert.equal(analysis.authorization.productionMutation, false);
assert.equal(analysis.authorization.remainingProductionBatches, false);
if (analysis.acceptance.passed) {
  assert.equal(
    analysis.status,
    "twenty-production-canary-independent-judgments-passed-disagreement-extraction-authorized"
  );
  assert.equal(analysis.authorization.disagreementExtraction, true);
  assert.equal(analysis.acceptance.unchangedV4220ValidatorPasses, 20);
  assert.equal(analysis.acceptance.canonicalEventProjectionReplays, 20);
  assert.equal(analysis.acceptance.semanticRepairs, 0);
  assert(analysis.pairs.every((pair) => pair.bothAccepted && pair.sameLockedInventory && pair.separateOutputHashes));
} else {
  assert.equal(analysis.status, "production-canary-independent-judgment-gate-failed-analysis-only");
  assert.equal(analysis.authorization.disagreementExtraction, false);
}
console.log(JSON.stringify({
  status: "passed-analyzed",
  analysisStatus: analysis.status,
  contextsAttempted: execution.contextsAttempted,
  validContexts: execution.validContexts,
  audioVerificationQueueLength: analysis.audioPolicy.queue.length,
  retries: 0,
  scoresDerived: 0,
  productionMutation: false
}, null, 2));
