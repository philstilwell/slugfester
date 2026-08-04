#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V381_DEBATE_NUMBERS, V381_EXECUTION_MANIFEST, V381_MANUAL, V381_ROOT, V38_GATE_MANIFEST, V38_SOURCE_AUDIT, assert } from "./lib/v381-source-preparation.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) throw new Error("--frozen-at must be an ISO timestamp");
if (shouldWrite) {
  try { await access(path.resolve(V381_EXECUTION_MANIFEST)); throw new Error(`${V381_EXECUTION_MANIFEST} already exists`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const read = (file) => readFile(path.resolve(file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const [gate, audit, dry, failure] = await Promise.all([readJson(V38_GATE_MANIFEST), readJson(V38_SOURCE_AUDIT), readJson(`${V381_ROOT}/end-to-end-dry-fixture.json`), readJson("docs/calibration/v3.8/held-out-burden-contact-integration-gate/source-preparation/frozen-attempt-failure.json")]);
assert(dry.passed && dry.modelContextsExecuted === 0 && dry.ambiguousBridgeCoordinates === 0 && dry.phaseLocksExcludeFutureOutputs && dry.timeoutTerminationVerified, "v3.8.1 dry fixture invalid");
assert(failure.status === "failed-at-proposal-boundary" && failure.artifactPolicy.rerunAllProposalContextsUnderNewLock, "v3.8 failure basis invalid");
assert(audit.status === "passed-local-chain-hashes-heldout-content-opened-for-source-preparation", "source audit invalid");

const proposalContexts = {};
for (const debateNumber of V381_DEBATE_NUMBERS) {
  const packet = `${V381_ROOT}/proposal/packets/debate-${debateNumber}.json`;
  const schema = `${V381_ROOT}/proposal/schemas/debate-${debateNumber}.schema.json`;
  proposalContexts[debateNumber] = { debateNumber, packet, schema, rawOutput: `${V381_ROOT}/proposal/raw-outputs/debate-${debateNumber}.json`, enrichedOutput: `${V381_ROOT}/proposal/enriched-outputs/debate-${debateNumber}.json`, transcript: audit.debateSources[debateNumber].transcriptPath, events: audit.debateSources[debateNumber].eventsPath };
}
const sourceFiles = [
  "docs/assessment-workflow-v3.8.md",
  "docs/reassessment-rubric-v3.8.md",
  V381_MANUAL,
  V38_GATE_MANIFEST,
  V38_SOURCE_AUDIT,
  "docs/calibration/v3.8/held-out-burden-contact-integration-gate/source-preparation/frozen-attempt-failure.json",
  `${V381_ROOT}/end-to-end-dry-fixture.json`,
  ...Object.values(proposalContexts).flatMap((context) => [context.packet, context.schema]),
  "scripts/lib/v381-source-preparation.mjs",
  "scripts/lib/v381-source-execution.mjs",
  "scripts/build-v381-source-preparation-packets.mjs",
  "scripts/validate-v381-source-proposal.mjs",
  "scripts/build-v381-source-review-packets.mjs",
  "scripts/validate-v381-source-review.mjs",
  "scripts/validate-v381-source-adjudication.mjs",
  "scripts/extract-v381-source-disagreements.mjs",
  "scripts/analyze-v381-source-preparation.mjs",
  "scripts/test-v381-source-preparation-end-to-end.mjs",
  "scripts/run-v381-source-preparation.mjs",
  "scripts/preregister-v381-source-execution.mjs",
  "scripts/validate-v381-source-execution-lock.mjs",
  "scripts/validate-v381-source-preparation-result.mjs"
];
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await read(file));
const artifact = {
  schemaVersion: "3.8.1-heldout-source-preparation-correction-execution-manifest",
  protocolId: "v3.8.1-heldout-source-preparation-correction",
  parentGateId: gate.gateId,
  status: "frozen-correction-execution-authorized",
  frozenAt,
  calibrationOnly: true,
  AIOnly: true,
  correctionBasis: { failedAttempt: "v3.8", failedAttemptStatus: failure.status, invalidOutputsReused: false, rerunAllProposalContexts: true },
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" },
  modelInputs: { workflow: "docs/assessment-workflow-v3.8.md", rubric: "docs/reassessment-rubric-v3.8.md", manual: V381_MANUAL },
  debateNumbers: V381_DEBATE_NUMBERS,
  proposalContexts,
  authorization: { sourcePreparationModelExecution: true, burdenContactClassificationPasses: false, numericalParticipantScoring: false, assessmentProse: false, benchmarkMutation: false, productionMutation: false, all195Debates: false },
  authorizationScope: "Exactly three fresh source-proposal contexts, three isolated label-blind source-review contexts, and at most one dispute-only source-adjudication context per selected debate.",
  isolation: { temporaryCodexHomePerContext: true, proposalAndReviewContextsSeparate: true, reviewPacketsHideProposalLabelsAttributionAndRationales: true, adjudicationPacketsContainOnlyDisputedFields: true, legacyInvalidOutputsUnavailable: true, priorAssessmentContentUnavailable: true, scoresUnavailable: true },
  executionPolicy: { proposalContexts: 3, reviewContexts: 3, adjudicationContextsMaximum: 3, attemptsPerContext: 1, modelOutputRetriesMaximum: 0, sameRequestStreamRecoveriesMaximumPerContext: 2, sameRequestStreamRecoveryMeaning: "Transport reconnection inside the same Codex request/session; never a new inference attempt.", perInvocationTimeoutMs: 3600000, timedOutContextsMaximum: 0, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  deterministicNormalization: { proposalCandidateIdsModelAuthored: false, candidateIdRule: "debateId plus ordered array position", semanticFieldsChanged: false, rawAndEnrichedHashesRequired: true },
  consensusPolicy: { finalPreparationFieldRequiresMatchingVotes: 2, thirdPassLimitedToTwoInitialValues: true, audioRequiredIfEitherInitialAttributionBelowHigh: true, unresolvedAudioExcludesMove: true },
  selectionPolicy: { candidatesPerDebate: 8, finalMovesPerDebate: 4, finalMovesPerSide: 2, requiredCategories: ["none", "support", "attack"], preferTierDiversityThenTemporalSpreadThenLexicalId: true, directBridgeIdsOnly: true },
  dryFixture: { path: `${V381_ROOT}/end-to-end-dry-fixture.json`, sha256: sha256(await read(`${V381_ROOT}/end-to-end-dry-fixture.json`)) },
  artifacts: { proposalExecution: `${V381_ROOT}/proposal/model-execution.json`, reviewLock: `${V381_ROOT}/review/phase-lock.json`, reviewExecution: `${V381_ROOT}/review/model-execution.json`, initialDisagreements: `${V381_ROOT}/initial-disagreements.json`, adjudicationOptionMap: `${V381_ROOT}/adjudication-option-map.json`, adjudicationLock: `${V381_ROOT}/adjudication/phase-lock.json`, adjudicationExecution: `${V381_ROOT}/adjudication/model-execution.json`, analysis: `${V381_ROOT}/source-preparation-analysis.json`, finalInventory: `${V381_ROOT}/final-source-inventory.json` },
  passMeaning: "A completed correction may authorize preregistration of classification-packet construction only. Classification model execution, scores, prose, production changes, and corpus rollout remain blocked.",
  sourceHashes
};
if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(V381_EXECUTION_MANIFEST)), { recursive: true });
  await writeFile(path.resolve(V381_EXECUTION_MANIFEST), `${JSON.stringify(artifact, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", output: V381_EXECUTION_MANIFEST, sourceHashCount: Object.keys(sourceHashes).length, proposalContexts: 3, reviewContexts: 3, adjudicationContextsMaximum: 3, timeoutMinutes: 60, sameRequestStreamRecoveriesMaximumPerContext: 2, maximumMeteredCostUsd: 0 }, null, 2));
