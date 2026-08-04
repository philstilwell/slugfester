#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { containsScoreField } from "./lib/v37-retired-semantic.mjs";
import { V388_SECTION_DEBATES, V388_SECTION_ROOT, assert } from "./lib/v388-section-weight.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) throw new Error("--frozen-at must be an ISO timestamp");
const manifestPath = `${V388_SECTION_ROOT}/adjudication/execution-manifest.json`;
if (shouldWrite) { try { await access(path.resolve(root, manifestPath)); throw new Error(`${manifestPath} already exists`); } catch (error) { if (error.code !== "ENOENT") throw error; } }
const readBytes = (file) => readFile(path.resolve(root, file));
const readJson = async (file) => JSON.parse((await readBytes(file)).toString("utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [initialManifest, execution, disagreements, dry] = await Promise.all([
  readJson(`${V388_SECTION_ROOT}/initial-execution-manifest.json`), readJson(`${V388_SECTION_ROOT}/initial-model-execution.json`), readJson(`${V388_SECTION_ROOT}/initial-disagreements.json`), readJson(`${V388_SECTION_ROOT}/adjudication-dry-fixture.json`)
]);
assert(execution.validOutputContexts === 6 && execution.results.every((item) => item.gateAcceptancePassed), "initial section execution incomplete");
assert(disagreements.counts.semanticDisagreements === disagreements.counts.adjudicationContexts && disagreements.counts.adjudicationContexts > 0, "section disagreement extraction invalid");
assert(dry.status === "passed" && dry.modelContextsExecuted === 0 && dry.componentMixing === 0 && dry.scoreFields === 0, "section adjudication dry fixture invalid");
const contexts = disagreements.adjudicationContexts;
const sourceFiles = [
  "docs/assessment-workflow-v3.8.4.md", "docs/reassessment-rubric-v3.8.4.md", `${V388_SECTION_ROOT}/adjudication-manual.md`, `${V388_SECTION_ROOT}/initial-execution-manifest.json`, `${V388_SECTION_ROOT}/initial-model-execution.json`, `${V388_SECTION_ROOT}/initial-disagreements.json`, `${V388_SECTION_ROOT}/adjudication-option-map.json`, `${V388_SECTION_ROOT}/adjudication-dry-fixture.json`,
  "scripts/lib/v36-decision-cards.mjs", "scripts/lib/v37-retired-semantic.mjs", "scripts/lib/v385-transport.mjs", "scripts/lib/v388-section-weight.mjs", "scripts/extract-v388-section-weight-disagreements.mjs", "scripts/test-v388-section-weight-adjudication-tooling.mjs", "scripts/validate-v388-section-weight-adjudication.mjs", "scripts/preregister-v388-section-weight-adjudication.mjs", "scripts/validate-v388-section-weight-adjudication-lock.mjs", "scripts/run-v388-section-weight-adjudications.mjs",
  ...V388_SECTION_DEBATES.flatMap((number) => [`${V388_SECTION_ROOT}/packets/debate-${number}.json`, `${V388_SECTION_ROOT}/schemas/debate-${number}.schema.json`, `${V388_SECTION_ROOT}/initial-outputs/debate-${number}-pass-a.json`, `${V388_SECTION_ROOT}/initial-outputs/debate-${number}-pass-b.json`]),
  ...contexts.flatMap((context) => [context.packet, context.schema])
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readBytes(file));
const executionOutput = `${V388_SECTION_ROOT}/adjudication/model-execution.json`;
const artifact = {
  schemaVersion: "3.8.8-section-weight-adjudication-execution-manifest",
  protocolId: "v3.8.8-score-blind-section-weight-consensus-adjudication",
  stage: "whole-plan-section-weight-adjudication",
  status: "frozen-adjudication-contexts-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  model: initialManifest.model,
  modelInputs: { workflow: "docs/assessment-workflow-v3.8.4.md", rubric: "docs/reassessment-rubric-v3.8.4.md", manual: `${V388_SECTION_ROOT}/adjudication-manual.md` },
  contexts,
  authorization: { adjudicationContexts: contexts.length, planAdjudicationModelExecution: true, deterministicFinalPlanMergeAfterPass: true, burdenContactModelExecution: false, scoringModelExecution: false, numericalParticipantScoring: false, assessmentProse: false, productionMutation: false, tenDebateGate: false, all195Debates: false },
  isolation: { freshTemporaryCodexHomePerContext: true, freshSourceDirectoryPerContext: true, twoAnonymousWholePlansOnly: true, componentMixingForbidden: true, passIdentityUnavailable: true, privateOptionMapUnavailable: true, otherDebatesUnavailable: true, burdenContactTuplesUnavailable: true, scoresUnavailable: true, winnerUnavailable: true },
  executionPolicy: { contexts: contexts.length, attemptsPerContext: 1, retriesMaximum: 0, sequentialExecution: true, perInvocationTimeoutMs: 3600000, recoverableStreamEventsNormalMaximum: 2, recoverableStreamEventsHardMaximum: 8, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  acceptanceRule: { validContextsRequired: contexts.length, suppliedWholePlanOnlyRequired: true, componentMixingMaximum: 0, closedSchemaAndDeterministicValidationRequired: true, modelScoreFieldsMaximum: 0 },
  stopRules: { sourceHashMismatchBlocksExecution: true, preexistingOutputBlocksExecution: true, invalidAdjudicationBlocksFinalPlanMerge: true, furtherAutomaticRetryAuthorized: false, scoringRemainsBlocked: true },
  artifacts: { execution: executionOutput, outputs: contexts.map((context) => context.output) },
  futureOutputPathsExcludedFromSourceHashes: [...contexts.map((context) => context.output), executionOutput],
  sourceHashes
};
for (const context of contexts) { const packet = await readJson(context.packet); assert(packet.disputedPlans.length === 1 && packet.disputedPlans[0].candidates.length === 2 && !containsScoreField(packet) && !/\"origin\"|pass-a|pass-b/.test(JSON.stringify(packet)), `${context.debateNumber}: adjudication packet invalid or identity leak`); }
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", manifest: manifestPath, contexts: contexts.length, maximumMeteredCostUsd: 0, scoringAuthorized: false }, null, 2));
