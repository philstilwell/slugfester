#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V422_PROTOCOL_ID, V422_ROOT } from "./lib/v422-chronology-first.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const manifestPath = `${V422_ROOT}/execution-manifest.json`;
const executionPath = `${V422_ROOT}/model-execution.json`;
const analysisPath = `${V422_ROOT}/analysis.json`;
const exists = async (file) => access(path.resolve(root, file)).then(() => true, () => false);
if (shouldWrite) for (const future of [manifestPath, executionPath, analysisPath]) assertV4(!(await exists(future)), `${future} already exists`);

const preparation = JSON.parse(await readFile(path.resolve(root, `${V422_ROOT}/preparation-manifest.json`), "utf8"));
assertV4(preparation.status === "prepared-retired-chronology-smoke-no-model-execution" && preparation.debate.debateNumber === "07" && preparation.transport.sourceLedgerReplayExact && preparation.topologyChange.chronologicalTopLevelMovesRequired, "v4.2.2 chronology preparation invalid");
const packet = JSON.parse(await readFile(path.resolve(root, preparation.debate.packet), "utf8"));
const context = { debateNumber: "07", debateId: packet.debateId, durationSeconds: packet.durationSeconds, packet: preparation.debate.packet, sourceLedger: preparation.debate.sourceLedger, originalTranscript: preparation.debate.originalTranscript, originalEvents: preparation.debate.originalEvents, originalManifest: preparation.debate.originalManifest, rawOutput: preparation.debate.rawOutput, compiledOutput: preparation.debate.compiledOutput };
const sourceFiles = [
  "docs/assessment-workflow-v4.2.2.md",
  ...Object.values(preparation.inputs),
  `${V422_ROOT}/preparation-manifest.json`,
  context.sourceLedger,
  context.originalTranscript,
  context.originalEvents,
  context.originalManifest,
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v41-lean-production.mjs",
  "scripts/lib/v417-fresh-validation.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v419-schema-bounded-source.mjs",
  "scripts/lib/v42-compact-transport.mjs",
  "scripts/lib/v421-compact-fresh.mjs",
  "scripts/lib/v422-chronology-first.mjs",
  "scripts/build-v422-chronology-first-smoke.mjs",
  "scripts/test-v422-chronology-first.mjs",
  "scripts/validate-v422-primary-output.mjs",
  "scripts/preregister-v422-chronology-execution.mjs",
  "scripts/run-v422-chronology-execution.mjs",
  "scripts/analyze-v422-chronology.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(path.resolve(root, file)));
const manifest = {
  schemaVersion: "4.2.2-chronology-first-execution-manifest",
  protocolId: V422_PROTOCOL_ID,
  status: "frozen-one-context-retired-chronology-diagnostic-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  developmentOnly: true,
  AIOnly: true,
  model: { label: preparation.model.label, slug: preparation.model.slug, reasoningEffort: preparation.model.reasoningEffort },
  modelInputs: preparation.inputs,
  context,
  transport: preparation.transport,
  topologyChange: preparation.topologyChange,
  isolation: { freshTemporaryCodexHome: true, freshSourceDirectory: true, oneDebate: true, plainTranscriptNotCopiedToModelDirectory: true, originalEventsNotCopiedToModelDirectory: true, completeSourceLedgerCopied: true, failedV421OutputNotCopied: true, failedV421AnalysisNotCopied: true, historicalWorkflowStackNotCopied: true, legacyAssessmentsUnavailable: true, priorJudgmentsUnavailable: true },
  executionPolicy: { contexts: 1, attemptsPerContext: 1, retriesMaximum: 0, timeoutMs: 1800000, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionApiCalls: 0, transcriptionCostUsdMaximum: 0, recoverableStreamEventsNormalMaximum: 2, recoverableStreamEventsHardMaximum: 8 },
  authorization: { primaryModelExecution: true, deterministicValidation: true, deterministicTimeCompilation: true, scoreDerivation: false, legacyComparison: false, freshGateSelection: false, productionMutation: false },
  stopRules: { sourceHashMismatchBlocksExecution: true, preexistingOutputBlocksExecution: true, automaticRetryAuthorized: false, outputNormalizationAuthorized: false, automaticRetargetingAuthorized: false, timeoutExtensionAuthorized: false },
  artifacts: { execution: executionPath, analysis: analysisPath, rawOutput: context.rawOutput, compiledOutput: context.compiledOutput },
  futureOutputPathsExcludedFromSourceHashes: [context.rawOutput, context.compiledOutput, executionPath, analysisPath],
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", debateNumber: "07", attempts: 1, retries: 0, timeoutMinutes: 30, totalCopiedInputBytes: manifest.transport.totalCopiedInputBytes, chronologicalTopLevelMovesRequired: true, failedOutputCopiedToModel: false, meteredApiCostUsdMaximum: 0 }, null, 2));
