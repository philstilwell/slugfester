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
const manifestPath = `${V388_SECTION_ROOT}/initial-execution-manifest.json`;
if (shouldWrite) { try { await access(path.resolve(root, manifestPath)); throw new Error(`${manifestPath} already exists`); } catch (error) { if (error.code !== "ENOENT") throw error; } }
const readBytes = (file) => readFile(path.resolve(root, file));
const readJson = async (file) => JSON.parse((await readBytes(file)).toString("utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const coverageAnalysis = await readJson("docs/calibration/v3.8.8/coverage-consensus/coverage-consensus-analysis.json");
const dry = await readJson(`${V388_SECTION_ROOT}/dry-fixture.json`);
assert(coverageAnalysis.coverageConsensusPassed && coverageAnalysis.decision.sectionAndWeightLockPreregistrationAuthorized && !coverageAnalysis.decision.sectionAndWeightModelExecutionAuthorized, "coverage stage did not authorize section preregistration");
assert(dry.status === "passed" && dry.modelContextsExecuted === 0 && dry.reports.length === 3 && dry.scoreFields === 0, "section dry fixture invalid");
const contexts = [];
for (const debateNumber of V388_SECTION_DEBATES) {
  const packetPath = `${V388_SECTION_ROOT}/packets/debate-${debateNumber}.json`;
  const schemaPath = `${V388_SECTION_ROOT}/schemas/debate-${debateNumber}.schema.json`;
  const packet = await readJson(packetPath);
  assert(packet.moves.length >= 8 && packet.acceptedBridgeIds.length === 10 && !containsScoreField(packet), `${debateNumber}: section packet invalid`);
  for (const passId of ["a", "b"]) contexts.push({ debateNumber, passId, packet: packetPath, schema: schemaPath, output: `${V388_SECTION_ROOT}/initial-outputs/debate-${debateNumber}-pass-${passId}.json`, moveCount: packet.moves.length, bridgeCount: packet.acceptedBridgeIds.length });
}
const sourceFiles = [
  "docs/assessment-workflow-v3.8.4.md", "docs/reassessment-rubric-v3.8.4.md", `${V388_SECTION_ROOT}/planning-manual.md`, `${V388_SECTION_ROOT}/dry-fixture.json`,
  "docs/calibration/v3.8.8/coverage-consensus/final-coverage-inventory.json", "docs/calibration/v3.8.8/coverage-consensus/coverage-consensus-analysis.json", "docs/calibration/v3.8.8/coverage-consensus/workflow-assessment.md",
  "scripts/lib/v36-decision-cards.mjs", "scripts/lib/v37-retired-semantic.mjs", "scripts/lib/v388-section-weight.mjs", "scripts/build-v388-section-weight-packets.mjs", "scripts/test-v388-section-weight-tooling.mjs", "scripts/validate-v388-section-weight-plan.mjs", "scripts/preregister-v388-section-weight-execution.mjs", "scripts/validate-v388-section-weight-execution-lock.mjs", "scripts/run-v388-section-weight-plans.mjs",
  ...V388_SECTION_DEBATES.flatMap((number) => [`${V388_SECTION_ROOT}/packets/debate-${number}.json`, `${V388_SECTION_ROOT}/schemas/debate-${number}.schema.json`])
];
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await readBytes(file));
const executionOutput = `${V388_SECTION_ROOT}/initial-model-execution.json`;
const artifact = {
  schemaVersion: "3.8.8-section-weight-initial-execution-manifest",
  protocolId: "v3.8.8-score-blind-section-weight-consensus",
  stage: "two-independent-section-weight-plans",
  status: "frozen-six-context-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  dyadicOnly: true,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" },
  modelInputs: { workflow: "docs/assessment-workflow-v3.8.4.md", rubric: "docs/reassessment-rubric-v3.8.4.md", manual: `${V388_SECTION_ROOT}/planning-manual.md` },
  contexts,
  authorization: { initialSectionPlanContexts: 6, initialSectionPlanModelExecution: true, deterministicPlanComparisonAfterPass: true, planAdjudicationModelExecution: false, burdenContactModelExecution: false, scoringModelExecution: false, numericalParticipantScoring: false, assessmentProse: false, productionMutation: false, tenDebateGate: false, all195Debates: false },
  isolation: { freshTemporaryCodexHomePerContext: true, freshSourceDirectoryPerContext: true, otherPlanUnavailable: true, otherDebatesUnavailable: true, legacyAssessmentUnavailable: true, burdenContactTuplesUnavailable: true, scoresUnavailable: true, winnerUnavailable: true },
  executionPolicy: { contexts: 6, attemptsPerContext: 1, retriesMaximum: 0, sequentialExecution: true, perInvocationTimeoutMs: 3600000, recoverableStreamEventsNormalMaximum: 2, recoverableStreamEventsHardMaximum: 8, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  acceptanceRule: { validContextsRequired: 6, closedSchemaAndDeterministicValidationRequired: true, completeMoveAssignmentRequired: true, bridgeCoverageRequired: true, modelScoreFieldsMaximum: 0 },
  stopRules: { sourceHashMismatchBlocksExecution: true, preexistingOutputBlocksExecution: true, invalidPlanBlocksComparison: true, furtherAutomaticRetryAuthorized: false, planAdjudicationRequiresSeparatePhaseLock: true, scoringRemainsBlocked: true },
  artifacts: { execution: executionOutput, outputs: contexts.map((context) => context.output) },
  futureOutputPathsExcludedFromSourceHashes: [...contexts.map((context) => context.output), executionOutput],
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", manifest: manifestPath, contexts: 6, debates: V388_SECTION_DEBATES, maximumMeteredCostUsd: 0, scoringAuthorized: false }, null, 2));
