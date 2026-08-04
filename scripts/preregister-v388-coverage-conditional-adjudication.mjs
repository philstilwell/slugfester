#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { containsScoreField } from "./lib/v37-retired-semantic.mjs";
import { V388_CONSENSUS_ROOT, assert } from "./lib/v388-coverage-consensus.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) throw new Error("--frozen-at must be an ISO timestamp");
const stageRoot = `${V388_CONSENSUS_ROOT}/conditional-adjudication`;
const manifestPath = `${stageRoot}/execution-manifest.json`;
if (shouldWrite) {
  try { await access(path.resolve(root, manifestPath)); throw new Error(`${manifestPath} already exists`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const readBytes = (file) => readFile(path.resolve(root, file));
const readJson = async (file) => JSON.parse((await readBytes(file)).toString("utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const packetPath = `${stageRoot}/packet.json`;
const schemaPath = `${stageRoot}/schema.json`;
const mapPath = `${stageRoot}/private-option-map.json`;
const auditPath = `${stageRoot}/conditional-field-audit.json`;
const manualPath = `${V388_CONSENSUS_ROOT}/conditional-adjudication-manual.md`;
const outputPath = `${stageRoot}/output.json`;
const executionPath = `${stageRoot}/model-execution.json`;
const [packet, audit, primaryExecution] = await Promise.all([
  readJson(packetPath),
  readJson(auditPath),
  readJson(`${V388_CONSENSUS_ROOT}/adjudication/model-execution.json`)
]);
assert(packet.disputedFields.length === 1 && packet.disputedFields[0].fieldName === "proposition", "conditional packet field invalid");
assert(audit.counts.supplementalDisputes === 1 && audit.counts.supplementalModelContextsRequired === 1 && audit.counts.scoreFields === 0, "conditional audit invalid");
assert(primaryExecution.validOutputContexts === 3 && primaryExecution.results.every((item) => item.gateAcceptancePassed), "primary adjudication stage incomplete");
assert(!containsScoreField(packet) && !/proposalValue|reviewValue|proposalSnapshot|\"origin\"/.test(JSON.stringify(packet)), "conditional packet leaks identity or score fields");

const sourceFiles = [
  "docs/assessment-workflow-v3.8.4.md",
  "docs/reassessment-rubric-v3.8.4.md",
  manualPath,
  packetPath,
  schemaPath,
  mapPath,
  auditPath,
  `${V388_CONSENSUS_ROOT}/initial-disagreements.json`,
  `${V388_CONSENSUS_ROOT}/adjudication-option-map.json`,
  `${V388_CONSENSUS_ROOT}/adjudication/model-execution.json`,
  `${V388_CONSENSUS_ROOT}/adjudication/outputs/debate-55.json`,
  "scripts/lib/v36-decision-cards.mjs",
  "scripts/lib/v37-retired-semantic.mjs",
  "scripts/lib/v381-source-preparation.mjs",
  "scripts/lib/v385-transport.mjs",
  "scripts/lib/v388-coverage-consensus.mjs",
  "scripts/prepare-v388-coverage-conditional-adjudication.mjs",
  "scripts/validate-v388-coverage-conditional-adjudication.mjs",
  "scripts/preregister-v388-coverage-conditional-adjudication.mjs",
  "scripts/validate-v388-coverage-conditional-adjudication-lock.mjs",
  "scripts/run-v388-coverage-conditional-adjudication.mjs"
];
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await readBytes(file));
const artifact = {
  schemaVersion: "3.8.8-coverage-conditional-adjudication-execution-manifest",
  protocolId: "v3.8.8-coverage-conditional-field-adjudication",
  stage: "conditional-proposition-only-adjudication",
  status: "frozen-one-context-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" },
  modelInputs: {
    workflow: "docs/assessment-workflow-v3.8.4.md",
    rubric: "docs/reassessment-rubric-v3.8.4.md",
    manual: manualPath,
    packet: packetPath,
    schema: schemaPath
  },
  authorization: {
    modelContexts: 1,
    conditionalAdjudicationModelExecution: true,
    deterministicConsensusMergeAfterPass: true,
    sectionAndWeightLocking: false,
    burdenContactModelExecution: false,
    scoringModelExecution: false,
    assessmentProse: false,
    productionMutation: false,
    tenDebateGate: false,
    all195Debates: false
  },
  isolation: {
    temporaryCodexHome: true,
    freshSourceDirectory: true,
    oneDisputedFieldOnly: true,
    anonymousOptionOrder: true,
    privateOptionMapAvailableToModel: false,
    earlierValidityDecisionAvailableToModel: false,
    initialPassOutputsAvailableToModel: false,
    undisputedFieldsAvailableToModel: false,
    scoresAvailable: false,
    winnerAvailable: false
  },
  executionPolicy: {
    contexts: 1,
    attempts: 1,
    retriesMaximum: 0,
    perInvocationTimeoutMs: 3600000,
    recoverableStreamEventsNormalMaximum: 2,
    recoverableStreamEventsHardMaximum: 8,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0
  },
  acceptanceRule: {
    validContextsRequired: 1,
    suppliedOptionOnlyRequired: true,
    exactFieldCountRequired: 1,
    closedSchemaAndDeterministicValidationRequired: true,
    modelScoreFieldsMaximum: 0
  },
  stopRules: {
    sourceHashMismatchBlocksExecution: true,
    preexistingOutputBlocksExecution: true,
    invalidOutputBlocksConsensusMerge: true,
    furtherAutomaticRetryAuthorized: false,
    scoringRemainsBlocked: true
  },
  artifacts: { audit: auditPath, privateOptionMap: mapPath, output: outputPath, execution: executionPath },
  futureOutputPathsExcludedFromSourceHashes: [outputPath, executionPath],
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", manifest: manifestPath, modelContexts: 1, disputedFields: 1, maximumMeteredCostUsd: 0, scoringAuthorized: false }, null, 2));
