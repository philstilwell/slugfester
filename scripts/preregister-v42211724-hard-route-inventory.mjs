#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = "docs/calibration/v4.2.21.17.24/hard-route-score-blind-inventory";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const MANIFEST = `${ROOT}/execution-manifest.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const RETIRED_SUCCESS = "docs/calibration/v4.2.21.16/decomposed-consensus-contract/inventory-recovery-model-execution.json";
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
if (shouldWrite) for (const file of [MANIFEST, EXECUTION, ANALYSIS]) await access(file).then(() => { throw new Error(`${file} already exists`); }, () => true);

const preparation = JSON.parse(await readFile(PREPARATION));
const retiredSuccess = JSON.parse(await readFile(RETIRED_SUCCESS));
assertV4(preparation.status === "five-hard-route-score-blind-inventory-contexts-prepared" && preparation.authorization.executionManifest && preparation.contexts.length === 5, "inventory preparation unavailable");
assertV4(preparation.transport.everyCandidateRetained && !preparation.transport.semanticCandidateDownselectionPerformed && preparation.totals.maximumCopiedInputBytes <= 115000, "inventory transport boundary drifted");
assertV4(retiredSuccess.status === "debate-182-inventory-transport-recovery-passed" && retiredSuccess.validContexts === 1 && retiredSuccess.retries === 0, "retired projected-transport success unavailable");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceFiles = [
  "docs/assessment-workflow-v4.2.21.17.24.md",
  PREPARATION,
  preparation.inputs.recovery,
  preparation.inputs.sourcePreparation,
  preparation.inputs.manual,
  RETIRED_SUCCESS,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v4219-primary-recovery.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/v422115-candidate-evidence-transport.mjs",
  "scripts/lib/v422116-decomposed-consensus.mjs",
  "scripts/lib/v4221162-inventory-transport.mjs",
  "scripts/prepare-v42211724-hard-route-inventory.mjs",
  "scripts/validate-v42211724-hard-route-inventory.mjs",
  "scripts/preregister-v42211724-hard-route-inventory.mjs",
  "scripts/run-v42211724-hard-route-inventory.mjs",
  "scripts/analyze-v42211724-hard-route-inventory.mjs",
  "scripts/test-v42211724-hard-route-inventory-preparation.mjs",
  "scripts/test-v42211724-hard-route-inventory-gate.mjs",
  ...preparation.contexts.flatMap((context) => [context.packet, context.validatorCandidateEvidenceBundle, context.modelCandidateTransport, context.originalEvents, context.fullLedger, context.schema]),
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));
const futureOutputs = [
  ...preparation.contexts.flatMap((context) => [context.proposalOutput, context.lockedInventoryOutput, context.validationOutput, context.provenanceOutput]),
  EXECUTION,
  ANALYSIS,
];
const manifest = {
  schemaVersion: "4.2.21.17.24-hard-route-score-blind-inventory-execution-manifest",
  protocolId: preparation.protocolId,
  status: "frozen-five-hard-route-score-blind-inventory-contexts-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  model: { label: preparation.model.label, slug: preparation.model.slug, reasoningEffort: preparation.model.reasoningEffort },
  costEstimate: {
    authentication: "ChatGPT subscription",
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    expectedParallelWallMinutes: [4, 12],
    expectedSerialModelWorkMinutes: [6, 15],
    absoluteGateTimeoutMinutes: 45,
  },
  modelInputs: { manual: preparation.inputs.manual },
  preparation: PREPARATION,
  contexts: preparation.contexts,
  retiredTransportEvidence: {
    execution: RETIRED_SUCCESS,
    status: retiredSuccess.status,
    copiedInputBytes: retiredSuccess.results[0].copiedInputBytes,
    elapsedMs: retiredSuccess.results[0].elapsedMs,
  },
  isolation: {
    freshTemporaryCodexHomePerContext: true,
    oneDebatePerContext: true,
    completeCandidateTransportAvailable: true,
    fullValidatorEvidenceUnavailableToModel: true,
    otherDebatesUnavailable: true,
    performanceJudgmentsUnavailable: true,
    ratingsScoresWinnersAndPublicationProseUnavailable: true,
  },
  executionPolicy: {
    contexts: 5,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    maximumParallelContexts: 2,
    schedulerRamp: [1, 2],
    eachRampPhaseMustPassBeforeExpansion: true,
    abortBeforeNextRampPhaseOnFailure: true,
    continueIndependentContextsWithinStartedPhaseAfterFailure: true,
    timeoutMsPerContext: 600000,
    copiedInputBytesMaximum: 115000,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
  },
  deterministicCompilation: preparation.deterministicCompilation,
  acceptance: {
    validInventoriesRequired: 5,
    deterministicLockedInventoryCompilationsRequired: 5,
    everyCandidateAvailableDuringSelection: true,
    semanticRepairs: 0,
    ratings: 0,
    responseTopology: 0,
    scores: 0,
  },
  authorization: {
    modelContexts: true,
    deterministicValidation: true,
    deterministicCompilation: true,
    analysis: true,
    retry: false,
    semanticCorrection: false,
    independentJudgmentPacketPreparation: false,
    independentJudgmentModelExecution: false,
    scoreDerivation: false,
    productionMutation: false,
    all195Debates: false,
  },
  artifacts: {
    execution: EXECUTION,
    analysis: ANALYSIS,
    proposals: preparation.contexts.map((context) => context.proposalOutput),
    lockedInventories: preparation.contexts.map((context) => context.lockedInventoryOutput),
    validations: preparation.contexts.map((context) => context.validationOutput),
    provenance: preparation.contexts.map((context) => context.provenanceOutput),
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes,
};
if (shouldWrite) await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  status: shouldWrite ? "frozen" : "preview",
  debates: manifest.contexts.map((context) => context.debateNumber),
  contexts: manifest.contexts.length,
  schedulerRamp: manifest.executionPolicy.schedulerRamp,
  maximumParallelContexts: manifest.executionPolicy.maximumParallelContexts,
  expectedParallelWallMinutes: manifest.costEstimate.expectedParallelWallMinutes,
  expectedSerialModelWorkMinutes: manifest.costEstimate.expectedSerialModelWorkMinutes,
  authentication: manifest.costEstimate.authentication,
  meteredApiCostUsdMaximum: 0,
  transcriptionCostUsdMaximum: 0,
  scoresDerived: 0,
}, null, 2));
