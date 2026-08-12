#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_FINAL_LEDGER_PROTOCOL_ID,
  CHECKPOINT_V22_FINAL_LEDGER_ROOT,
  buildCheckpointV22FinalLedger,
  loadCheckpointV22FinalLedgerInputs,
  validateCheckpointV22FinalLedger
} from "./lib/assessment-production-checkpoint-v2.2-final-ledger.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);
const manifestPath = `${CHECKPOINT_V22_FINAL_LEDGER_ROOT}/final-ledger-manifest.json`;
const ledgerPath = `${CHECKPOINT_V22_FINAL_LEDGER_ROOT}/final-ledger.json`;
const analysisPath = `${CHECKPOINT_V22_FINAL_LEDGER_ROOT}/analysis.json`;
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

const inputs = await loadCheckpointV22FinalLedgerInputs();
const preview = buildCheckpointV22FinalLedger(
  inputs.debateInputs,
  inputs.sourceHashes
);
const validation = validateCheckpointV22FinalLedger(
  preview,
  inputs.debateInputs,
  inputs.sourceHashes
);
const expected = {
  debates: 10,
  disputedMoves: 178,
  candidateSelections: 507,
  roundedMeanPopulation: 403,
  audioVerifiedMoves: 2,
  calculatedScores: 0
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
  "production-checkpoint v2.2 final-ledger preview population mismatch"
);
const sourceFiles = [
  ...inputs.sourcePaths,
  "docs/assessment-production-workflow.md",
  "docs/assessment-production/production-checkpoint-v2.2-1/master-manifest.json",
  "docs/reassessment-rubric-v2.1.md",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/v42211726-hard-route-disagreement.mjs",
  "scripts/lib/v42211728-hard-route-adjudication.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-disagreement.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-dispute-adjudication.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-final-ledger.mjs",
  "scripts/preregister-assessment-production-checkpoint-v2.2-final-ledger.mjs",
  "scripts/assemble-assessment-production-checkpoint-v2.2-final-ledger.mjs",
  "scripts/analyze-assessment-production-checkpoint-v2.2-final-ledger.mjs",
  "scripts/test-assessment-production-checkpoint-v2.2-final-ledger.mjs",
  "scripts/validate-assessment-production-checkpoint-v2.2-final-ledger.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
const manifest = {
  schemaVersion:
    "1.0-production-checkpoint-v2.2-final-ledger-assembly-manifest",
  protocolId: CHECKPOINT_V22_FINAL_LEDGER_PROTOCOL_ID,
  status:
    "frozen-ten-debate-production-checkpoint-v2.2-deterministic-final-ledger-assembly",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: true,
  stagingOnly: true,
  developmentValidationOnly: false,
  AIOnly: true,
  expected,
  sourceHashes,
  replayRequirements: {
    bothIndependentPassesAgainstFullLocalTranscriptChain: true,
    deterministicDisagreements: true,
    anonymizedCandidateProvenance: true,
    disputeOnlyAdjudicationSelections: true,
    locallySavedAudioTranscriptHashes: true,
    dependencyPairOwnershipPrecedesRoundedMean: true,
    calculatedScores: 0
  },
  artifacts: {
    finalLedger: ledgerPath,
    analysis: analysisPath
  },
  authorization: {
    finalLedgerAssembly: true,
    scoreDerivation: false,
    modelExecution: false,
    paidApiCalls: false,
    policyPromotion: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction:
    "assemble-and-validate-ten-production-checkpoint-v2.2-final-ledgers-deterministically"
};
if (shouldWrite) {
  await mkdir(path.resolve(CHECKPOINT_V22_FINAL_LEDGER_ROOT), {
    recursive: true
  });
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
      scoreDerivationAuthorized: false
    },
    null,
    2
  )
);
