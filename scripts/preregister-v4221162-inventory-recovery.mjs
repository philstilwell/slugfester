#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V422116_ROOT } from "./lib/v422116-decomposed-consensus.mjs";
import { V4221162_PROTOCOL_ID } from "./lib/v4221162-inventory-transport.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const preparationPath = `${V422116_ROOT}/inventory-recovery-preparation.json`;
const manifestPath = `${V422116_ROOT}/inventory-recovery-execution-manifest.json`;
const executionPath = `${V422116_ROOT}/inventory-recovery-model-execution.json`;
const analysisPath = `${V422116_ROOT}/inventory-recovery-analysis.json`;
if (shouldWrite) for (const file of [manifestPath, executionPath, analysisPath]) await access(file).then(() => { throw new Error(`${file} already exists`); }, () => true);
const preparation = JSON.parse(await readFile(preparationPath, "utf8"));
assertV4(preparation.protocolId === V4221162_PROTOCOL_ID && preparation.status === "debate-182-inventory-transport-recovery-prepared" && preparation.authorization.executionManifest, "inventory recovery preparation unavailable");
assertV4(preparation.context.copiedInputBytes < 100000 && preparation.transport.everyCandidateRetained && preparation.transport.semanticCandidateDownselectionPerformed === false, "inventory recovery transport boundary changed");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
for (const accepted of preparation.acceptedLockedInventoriesReused) for (const [key, file] of Object.entries(accepted.files)) assertV4(sha256(await readFile(file)) === accepted.hashes[key], `${accepted.debateNumber}: accepted ${key} hash changed`);
const context = preparation.context;
const sourceFiles = [
  "docs/assessment-workflow-v4.2.21.16.2.md",
  preparationPath,
  preparation.inputs.manual,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v4219-primary-recovery.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/v422116-decomposed-consensus.mjs",
  "scripts/lib/v4221162-inventory-transport.mjs",
  "scripts/validate-v4221162-inventory-recovery.mjs",
  "scripts/preregister-v4221162-inventory-recovery.mjs",
  "scripts/run-v4221162-inventory-recovery.mjs",
  "scripts/analyze-v4221162-inventory-recovery.mjs",
  context.packet,
  context.modelCandidateTransport,
  context.validatorCandidateEvidenceBundle,
  context.originalEvents,
  context.fullLedger,
  context.schema,
  ...preparation.acceptedLockedInventoriesReused.flatMap((accepted) => Object.values(accepted.files))
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));
const futureOutputs = [context.proposalOutput, context.lockedInventoryOutput, context.validationOutput, context.provenanceOutput, executionPath, analysisPath];
const manifest = {
  schemaVersion: "4.2.21.16.2-inventory-transport-recovery-execution-manifest",
  protocolId: V4221162_PROTOCOL_ID,
  status: "frozen-debate-182-inventory-transport-recovery-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  model: { label: preparation.model.label, slug: preparation.model.slug, reasoningEffort: preparation.model.reasoningEffort },
  costEstimate: { authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, expectedWallMinutes: [2, 6], absoluteTimeoutMinutes: 12 },
  modelInputs: preparation.inputs,
  preparation: preparationPath,
  context,
  acceptedLockedInventoriesReused: preparation.acceptedLockedInventoriesReused,
  isolation: { freshTemporaryCodexHome: true, oneDebateContext: true, scoringRubricsUnavailable: true, predecessorDebate182ProposalUnavailable: true, acceptedOtherDebateInventoriesUnavailableToModel: true, ratingsAndScoresUnavailable: true, legacyScoresAndWinnersUnavailable: true },
  deterministicCompilation: { everyCandidateRetained: true, semanticCandidateDownselection: false, omittedFieldsRestoredFromFullEvidenceBundle: true, chronologyRepositoryOwned: true, finalSelectedEvidenceRepositoryRendered: true, replyRequiresEarlierSelectedOpponent: true, responseTopologyAbsent: true, ratingsAbsent: true, automaticSemanticRepair: false },
  executionPolicy: { contexts: 1, attemptsPerContext: 1, retriesMaximum: 0, timeoutMs: 600000, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  acceptance: { debate182ValidInventory: true, accepted133And178HashesUnchanged: true, combinedValidInventories: 3, semanticRepairs: 0, ratings: 0, responseTopology: 0, scores: 0 },
  authorization: { modelContext: true, deterministicValidation: true, deterministicCompilation: true, combinedAnalysis: true, retry: false, semanticCorrection: false, independentJudgmentPreparation: false, independentJudgmentExecution: false, scoreDerivation: false, productionMutation: false },
  artifacts: { execution: executionPath, analysis: analysisPath, proposal: context.proposalOutput, lockedInventory: context.lockedInventoryOutput, validation: context.validationOutput, provenance: context.provenanceOutput },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes
};
if (shouldWrite) await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", debateNumber: "182", contexts: 1, attempts: 1, retries: 0, candidates: context.candidates, copiedInputKilobytes: Math.round(context.copiedInputBytes / 1000), expectedWallMinutes: manifest.costEstimate.expectedWallMinutes, authentication: manifest.costEstimate.authentication, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, scoresDerived: 0 }, null, 2));
