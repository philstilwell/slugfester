#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  V223_FINAL_LEDGER_PROTOCOL_ID,
  V223_FINAL_LEDGER_ROOT,
  buildV223FinalLedger,
  loadV223FinalLedgerInputs,
  validateV223FinalLedger,
} from "./lib/assessment-production-score-stability-v2.2.3-final-ledger.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);
const manifestPath = `${V223_FINAL_LEDGER_ROOT}/final-ledger-manifest.json`;
const ledgerPath = `${V223_FINAL_LEDGER_ROOT}/final-ledger.json`;
const analysisPath = `${V223_FINAL_LEDGER_ROOT}/analysis.json`;
if (shouldWrite) {
  for (const file of [manifestPath, ledgerPath, analysisPath]) {
    await access(file).then(
      () => {
        throw new Error(`${file} already exists`);
      },
      () => true
    );
  }
}

const inputs = await loadV223FinalLedgerInputs();
const preview = buildV223FinalLedger(inputs.debateInputs, inputs.sourceHashes);
const validation = validateV223FinalLedger(
  preview,
  inputs.debateInputs,
  inputs.sourceHashes
);
const expected = {
  debates: 10,
  disputedMoves: 185,
  candidateSelections: 490,
  roundedMeanPopulation: 434,
  audioVerifiedMoves: 4,
  calculatedScores: 0,
};
assertV4(
  validation.debates === expected.debates &&
    validation.disputedMoves === expected.disputedMoves &&
    validation.candidateSelections === expected.candidateSelections &&
    validation.roundedMeanMerges +
      validation.dependencyMeanMergesSuppressed ===
      expected.roundedMeanPopulation &&
    validation.audioVerifiedMoves === expected.audioVerifiedMoves &&
    validation.calculatedScores === 0,
  "v2.2.3 final-ledger preview population mismatch"
);
const sourceFiles = [
  ...inputs.sourcePaths,
  "docs/assessment-production-workflow.md",
  "docs/assessment-production/manifest-v1.json",
  "docs/assessment-production-score-stability-v2.2.3-dispute-only-adjudication-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/v422116-decomposed-consensus.mjs",
  "scripts/lib/v42211726-hard-route-disagreement.mjs",
  "scripts/lib/v42211728-hard-route-adjudication.mjs",
  "scripts/lib/assessment-production-score-stability-v2.2.3-disagreement.mjs",
  "scripts/lib/assessment-production-score-stability-v2.2.3-dispute-adjudication.mjs",
  "scripts/lib/assessment-production-score-stability-v2.2.3-final-ledger.mjs",
  "scripts/preregister-assessment-production-score-stability-v2.2.3-final-ledger.mjs",
  "scripts/assemble-assessment-production-score-stability-v2.2.3-final-ledger.mjs",
  "scripts/analyze-assessment-production-score-stability-v2.2.3-final-ledger.mjs",
  "scripts/test-assessment-production-score-stability-v2.2.3-final-ledger.mjs",
  "scripts/validate-assessment-production-score-stability-v2.2.3-final-ledger.mjs",
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
const manifest = {
  schemaVersion: "1.0-score-stability-v2.2.3-final-ledger-assembly-manifest",
  protocolId: V223_FINAL_LEDGER_PROTOCOL_ID,
  status: "frozen-ten-debate-v2.2.3-deterministic-final-ledger-assembly",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  productionCanary: false,
  stagingOnly: true,
  developmentValidationOnly: true,
  AIOnly: true,
  expected,
  sourceHashes,
  replayRequirements: {
    bothIndependentPassesAgainstFullLocalTranscriptChain: true,
    deterministicDisagreements: true,
    anonymizedCandidateProvenance: true,
    disputeOnlyAdjudicationSelections: true,
    locallySavedAudioTranscriptHashes: true,
    combinedAudioAttributionResolution: true,
    dependencyPairOwnershipPrecedesRoundedMean: true,
    calculatedScores: 0,
  },
  artifacts: {
    finalLedger: ledgerPath,
    analysis: analysisPath,
  },
  authorization: {
    finalLedgerAssembly: true,
    scoreDerivation: false,
    modelExecution: false,
    paidApiCalls: false,
    policyPromotion: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
};
if (shouldWrite) {
  await mkdir(path.resolve(V223_FINAL_LEDGER_ROOT), { recursive: true });
  await writeFile(
    path.resolve(manifestPath),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? "frozen" : "preview",
      expected: manifest.expected,
      sourceFiles: Object.keys(sourceHashes).length,
      modelContexts: 0,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0,
      scoreDerivationAuthorized: false,
    },
    null,
    2
  )
);

