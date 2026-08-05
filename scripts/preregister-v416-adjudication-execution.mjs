#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { V416_ADJUDICATION_ROOT } from "./lib/v416-adjudication.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const manifestPath = `${V416_ADJUDICATION_ROOT}/execution-manifest.json`;
const executionPath = `${V416_ADJUDICATION_ROOT}/model-execution.json`;
const analysisPath = `${V416_ADJUDICATION_ROOT}/analysis.json`;
const finalLedgerPath = `${V416_ADJUDICATION_ROOT}/final-ledger.json`;
const scorePath = `${V416_ADJUDICATION_ROOT}/calculated-scores.json`;
const exists = async (file) => access(path.resolve(root, file)).then(() => true, () => false);
if (shouldWrite) for (const future of [manifestPath, executionPath, analysisPath, finalLedgerPath, scorePath]) assertV4(!(await exists(future)), `${future} already exists`);
const [preparation, preflight] = await Promise.all([readJson(`${V416_ADJUDICATION_ROOT}/preparation-audit.json`), readJson(`${V416_ADJUDICATION_ROOT}/schema-preflight/model-execution.json`)]);
assertV4(preparation.status === "passed-dispute-only-adjudication-preparation" && preparation.contexts === 3 && preparation.disputedMoves === 34 && !preparation.authorization.adjudicationModelExecution, "adjudication preparation invalid");
assertV4(preflight.status === "endpoint-preflight-passed" && preflight.validSyntheticContexts === 1 && preflight.retries === 0 && preflight.authorization.freezeThreeContextAdjudicationExecutionManifest, "adjudication endpoint preflight invalid");
const contexts = preparation.packetAudits.map((item) => ({
  debateNumber: item.debateNumber,
  debateId: item.debateId,
  disputedMoves: item.uniqueMoves,
  responsePairChoices: item.responsePairChoices,
  charityPairChoices: item.charityPairChoices,
  scoringFieldChoices: item.independentScoringFieldChoices,
  burdenAdjustmentChoices: item.burdenAdjustmentChoices,
  audioVerifiedDisputedMoves: item.audioVerifiedDisputedMoves,
  packet: item.packetPath,
  schema: preparation.sharedSchema,
  output: `${V416_ADJUDICATION_ROOT}/outputs/debate-${item.debateNumber}.json`
}));
assertV4(contexts.map((item) => item.debateNumber).join(",") === "55,103,161", "adjudication context order invalid");
const inputs = { rubricBase: "docs/reassessment-rubric-v4.0.md", rubricBounded: "docs/reassessment-rubric-v4.1.md", manual: `${V416_ADJUDICATION_ROOT}/manual.md`, schema: preparation.sharedSchema };
const sourceFiles = [
  ...Object.values(inputs), `${V416_ADJUDICATION_ROOT}/preparation-audit.json`, `${V416_ADJUDICATION_ROOT}/schema-preflight/model-execution.json`,
  "docs/calibration/v4.1.6/lean-retired-gate/pass-b/disagreements.json", "docs/calibration/v4.1.6/lean-retired-gate/pass-b/audio-verification.json",
  "scripts/lib/v385-transport.mjs", "scripts/lib/v416-adjudication.mjs", "scripts/validate-v416-adjudication-output.mjs", "scripts/preregister-v416-adjudication-execution.mjs", "scripts/run-v416-adjudication-execution.mjs",
  ...contexts.map((context) => context.packet)
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(path.resolve(root, file)));
const manifest = {
  schemaVersion: "4.1.6-dispute-only-adjudication-execution-manifest",
  protocolId: "v4.1.6-triggered-pass-b-consensus",
  stage: "three-isolated-candidate-bound-adjudications",
  status: "frozen-three-context-adjudication-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" },
  inputs,
  population: { contexts: contexts.length, disputedMoves: preparation.disputedMoves, responsePairChoices: preparation.responsePairChoices, charityPairChoices: preparation.charityPairChoices, independentScoringFieldChoices: preparation.independentScoringFieldChoices, burdenAdjustmentChoices: preparation.burdenAdjustmentChoices, audioVerifiedDisputedMoves: preparation.audioVerifiedDisputedMoves },
  contexts,
  isolation: { freshTemporaryCodexHomePerContext: true, freshSourceDirectoryPerContext: true, oneDebatePerContext: true, candidateOrderingAnonymous: true, passIdentitiesUnavailable: true, initialRationalesUnavailable: true, fullInitialOutputsUnavailable: true, nondisputedFieldsUnavailable: true, otherDebatesUnavailable: true, legacyAssessmentsUnavailable: true, calculatedScoresUnavailable: true, winnerLabelsUnavailable: true, publicationProseUnavailable: true },
  executionPolicy: { contexts: 3, attemptsPerContext: 1, retriesMaximum: 0, sequentialExecution: true, failFastAfterFirstInvalidContext: true, perInvocationTimeoutMs: 1800000, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionApiCalls: 0, transcriptionCostUsdMaximum: 0, recoverableStreamEventsNormalMaximum: 2, recoverableStreamEventsHardMaximum: 8 },
  acceptanceRule: { validContextsRequired: 3, disputedMovesDecidedExactlyOnce: preparation.disputedMoves, responsePairsIndivisible: true, charityPairsIndivisible: true, relevanceBurdenContactsIndivisible: true, candidateValuesOnly: true, missingChoicesMaximum: 0, thirdValuesMaximum: 0, nondisputedFieldMutationsMaximum: 0, modelCalculatedScoresMaximum: 0, publicationProseFieldsMaximum: 0 },
  authorization: { adjudicationModelExecution: true, furtherAutomaticRetry: false, adjudicationAnalysisAfterAllValid: true, finalLedgerAssembly: false, scoreDerivation: false, publicationFinalization: false, productionMutation: false, heldOutGate: false, all195Debates: false },
  stopRules: { sourceHashMismatchBlocksExecution: true, preexistingOutputBlocksExecution: true, invalidContextStopsRemainingContexts: true, automaticRetryAuthorized: false, scoresRemainBlockedUntilFinalLedgerValidation: true },
  artifacts: { execution: executionPath, analysis: analysisPath, finalLedger: finalLedgerPath, calculatedScores: scorePath, outputs: contexts.map((context) => context.output) },
  futureOutputPathsExcludedFromSourceHashes: [executionPath, analysisPath, finalLedgerPath, scorePath, ...contexts.map((context) => context.output)],
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", manifest: manifestPath, contexts: 3, disputedMoves: preparation.disputedMoves, candidateChoices: preparation.responsePairChoices + preparation.charityPairChoices + preparation.independentScoringFieldChoices + preparation.burdenAdjustmentChoices, attemptsPerContext: 1, retriesMaximum: 0, timeoutMinutes: 30, meteredApiCostUsdMaximum: 0, scoreDerivationAuthorized: false }, null, 2));
