#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V422116_PROTOCOL_ID, V422116_ROOT } from "./lib/v422116-decomposed-consensus.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const preparationPath = `${V422116_ROOT}/inventory-preparation-manifest.json`;
const manifestPath = `${V422116_ROOT}/inventory-execution-manifest.json`;
const executionPath = `${V422116_ROOT}/inventory-model-execution.json`;
const analysisPath = `${V422116_ROOT}/inventory-gate-analysis.json`;
if (shouldWrite) for (const file of [manifestPath, executionPath, analysisPath]) await access(file).then(() => { throw new Error(`${file} already exists`); }, () => true);
const preparation = JSON.parse(await readFile(preparationPath, "utf8"));
assertV4(preparation.status === "retired-partition-three-inventory-contexts-prepared" && preparation.authorization.executionManifest && preparation.contexts.length === 3, "inventory preparation unavailable");
assertV4(preparation.totals.maximumCopiedInputBytes <= 115000 && preparation.transport.scoringRubricsDelivered === false, "inventory transport boundary changed");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceFiles = [
  "docs/assessment-workflow-v4.2.21.16.md",
  `${V422116_ROOT}/design-manifest.json`,
  preparationPath,
  preparation.inputs.manual,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v4219-primary-recovery.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/v422116-decomposed-consensus.mjs",
  "scripts/validate-v422116-inventory.mjs",
  "scripts/preregister-v4221161-inventory-three.mjs",
  "scripts/run-v4221161-inventory-three.mjs",
  "scripts/analyze-v4221161-inventory-three.mjs",
  ...preparation.contexts.flatMap((context) => [context.packet, context.candidateEvidenceBundle, context.originalEvents, context.fullLedger, context.schema])
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));
const futureOutputs = [...preparation.contexts.flatMap((context) => [context.proposalOutput, context.lockedInventoryOutput, context.validationOutput, context.provenanceOutput]), executionPath, analysisPath];
const manifest = {
  schemaVersion: "4.2.21.16.1-score-blind-inventory-execution-manifest",
  protocolId: V422116_PROTOCOL_ID,
  status: "frozen-retired-partition-three-inventory-gate-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  model: { label: preparation.model.label, slug: preparation.model.slug, reasoningEffort: preparation.model.reasoningEffort },
  costEstimate: { authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, expectedSequentialWallMinutes: [8, 18], absoluteTimeoutMinutes: 30 },
  modelInputs: preparation.inputs,
  preparation: preparationPath,
  contexts: preparation.contexts,
  isolation: {
    freshTemporaryCodexHomePerContext: true,
    oneDebatePerContext: true,
    scoringRubricsUnavailable: true,
    predecessorPrimaryProposalsUnavailable: true,
    ratingsAndScoresUnavailable: true,
    otherInventoryOutputsUnavailable: true,
    legacyScoresAndWinnersUnavailable: true
  },
  deterministicCompilation: {
    candidateSideSpeakerSpanAttributionRepositoryOwned: true,
    chronologyRepositoryOwned: true,
    finalSelectedEvidenceRepositoryRendered: true,
    replyRequiresEarlierSelectedOpponent: true,
    responseTopologyAbsent: true,
    ratingsAbsent: true,
    automaticSemanticRepair: false
  },
  executionPolicy: { contexts: 3, attemptsPerContext: 1, retriesMaximum: 0, sequentialExecution: true, continueIndependentContextsAfterFailure: true, timeoutMs: 600000, copiedInputBytesMaximum: 115000, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  acceptance: preparation.nextGateAcceptance,
  authorization: { modelContexts: true, deterministicValidation: true, deterministicCompilation: true, analysis: true, retry: false, semanticCorrection: false, independentJudgmentPreparation: false, independentJudgmentExecution: false, scoreDerivation: false, productionMutation: false },
  artifacts: { execution: executionPath, analysis: analysisPath, proposals: preparation.contexts.map((context) => context.proposalOutput), lockedInventories: preparation.contexts.map((context) => context.lockedInventoryOutput), validations: preparation.contexts.map((context) => context.validationOutput), provenance: preparation.contexts.map((context) => context.provenanceOutput) },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes
};
if (shouldWrite) await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", debates: preparation.contexts.map((context) => context.debateNumber), contexts: 3, attempts: 3, retries: 0, expectedSequentialWallMinutes: manifest.costEstimate.expectedSequentialWallMinutes, maximumCopiedInputKilobytes: Math.round(preparation.totals.maximumCopiedInputBytes / 1000), authentication: manifest.costEstimate.authentication, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, scoresDerived: 0 }, null, 2));
