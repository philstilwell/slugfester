#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { V38_DEBATE_NUMBERS, V38_ROOT, assert } from "./lib/v38-source-preparation.mjs";
import { V38_SOURCE_EXECUTION_MANIFEST } from "./lib/v38-source-execution.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) throw new Error("--frozen-at must be an ISO timestamp");
if (shouldWrite) {
  try { await access(path.resolve(V38_SOURCE_EXECUTION_MANIFEST)); throw new Error(`${V38_SOURCE_EXECUTION_MANIFEST} already exists`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const read = (file) => readFile(path.resolve(file), "utf8");
const developmentPath = `${V38_ROOT}/source-development-manifest.json`;
const [developmentText, dryText] = await Promise.all([read(developmentPath), read(`${V38_ROOT}/source-execution-dry-fixture.json`)]);
const development = JSON.parse(developmentText), dry = JSON.parse(dryText);
assert(development.status === "frozen-source-tooling-model-execution-blocked" && !development.developmentState.modelExecutionAuthorized, "source development lock invalid");
for (const [file, digest] of Object.entries(development.sourceHashes)) assert(sha256(await read(file)) === digest, `development hash mismatch: ${file}`);
assert(dry.passed && dry.modelContextsExecuted === 0 && dry.syntheticDisputedFieldCount === 6 && dry.initialPassIdentityLeakage === 0 && dry.mediumConfidenceAudioTriggerVerified, "source execution dry fixture invalid");

const executionFiles = [
  "scripts/lib/v38-source-execution.mjs",
  "scripts/validate-v38-source-adjudication.mjs",
  "scripts/extract-v38-source-disagreements.mjs",
  "scripts/analyze-v38-source-preparation.mjs",
  "scripts/test-v38-source-execution-tooling.mjs",
  "scripts/run-v38-source-preparation.mjs",
  "scripts/preregister-v38-source-execution.mjs",
  "scripts/validate-v38-source-execution-lock.mjs",
  "scripts/validate-v38-source-preparation-result.mjs"
];
const sourceFiles = [...new Set([developmentPath, ...Object.keys(development.sourceHashes), `${V38_ROOT}/source-execution-dry-fixture.json`, ...executionFiles])];
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await read(file));
const artifact = {
  schemaVersion: "3.8-heldout-source-execution-manifest",
  gateId: development.gateId,
  status: "frozen-source-execution-authorized",
  frozenAt,
  calibrationOnly: true,
  AIOnly: true,
  model: development.model,
  debateNumbers: V38_DEBATE_NUMBERS,
  developmentLock: { path: developmentPath, sha256: sha256(developmentText), remainsImmutable: true, narrowExecutionAuthorization: true },
  authorization: { sourcePreparationModelExecution: true, burdenContactClassificationPasses: false, numericalParticipantScoring: false, assessmentProse: false, benchmarkMutation: false, productionMutation: false, all195Debates: false },
  authorizationScope: "Exactly three isolated source-proposal contexts, three isolated label-blind source-review contexts, and at most one dispute-only source-adjudication context per selected debate.",
  modelInputs: development.modelInputs,
  proposalContexts: development.proposalContexts,
  isolation: { temporaryCodexHomePerContext: true, proposalAndReviewContextsSeparate: true, reviewPacketsHideProposalLabelsAttributionAndRationales: true, adjudicationPacketsContainOnlyDisputedFields: true, priorAssessmentContentUnavailable: true, scoresUnavailable: true },
  executionPolicy: { proposalContexts: 3, reviewContexts: 3, adjudicationContextsMaximum: 3, attemptsPerContext: 1, modelOutputRetriesMaximum: 0, sameRequestStreamRecoveriesMaximum: 0, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  consensusPolicy: { finalPreparationFieldRequiresMatchingVotes: 2, thirdPassLimitedToTwoInitialValues: true, audioRequiredIfEitherInitialAttributionBelowHigh: true, unresolvedAudioExcludesMove: true },
  selectionPolicy: development.selectionPolicy,
  dryFixture: { path: `${V38_ROOT}/source-execution-dry-fixture.json`, sha256: sha256(dryText) },
  artifacts: {
    proposalExecution: `${V38_ROOT}/source-preparation/proposal/model-execution.json`,
    reviewLock: `${V38_ROOT}/source-preparation/review/phase-lock.json`,
    reviewExecution: `${V38_ROOT}/source-preparation/review/model-execution.json`,
    initialDisagreements: `${V38_ROOT}/source-preparation/initial-disagreements.json`,
    adjudicationOptionMap: `${V38_ROOT}/source-preparation/adjudication-option-map.json`,
    adjudicationLock: `${V38_ROOT}/source-preparation/adjudication/phase-lock.json`,
    adjudicationExecution: `${V38_ROOT}/source-preparation/adjudication/model-execution.json`,
    analysis: `${V38_ROOT}/source-preparation/source-preparation-analysis.json`,
    finalInventory: `${V38_ROOT}/source-preparation/final-source-inventory.json`
  },
  passMeaning: "A completed source preparation may authorize preregistration of classification packet construction only. Classification model execution, scores, prose, production changes, and corpus rollout remain blocked.",
  sourceHashes
};
if (shouldWrite) { await mkdir(path.dirname(path.resolve(V38_SOURCE_EXECUTION_MANIFEST)), { recursive: true }); await writeFile(path.resolve(V38_SOURCE_EXECUTION_MANIFEST), `${JSON.stringify(artifact, null, 2)}\n`); }
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", output: V38_SOURCE_EXECUTION_MANIFEST, sourceHashCount: Object.keys(sourceHashes).length, proposalContexts: 3, reviewContexts: 3, adjudicationContextsMaximum: 3, maximumMeteredCostUsd: 0 }, null, 2));
