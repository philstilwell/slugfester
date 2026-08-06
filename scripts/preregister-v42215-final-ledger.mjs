#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  loadV42215FinalLedgerInputs,
  makeV42215FinalLedgerSchema,
  V42215_FINAL_LEDGER_ROOT
} from "./lib/v42215-final-ledger.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");

const manifestPath = `${V42215_FINAL_LEDGER_ROOT}/final-ledger-manifest.json`;
const schemaPath = `${V42215_FINAL_LEDGER_ROOT}/final-ledger.schema.json`;
const finalLedgerPath = `${V42215_FINAL_LEDGER_ROOT}/final-ledger.json`;
const analysisPath = `${V42215_FINAL_LEDGER_ROOT}/analysis.json`;
const scorePath = `${V42215_FINAL_LEDGER_ROOT}/calculated-scores.json`;
const exists = async (file) => access(path.resolve(file)).then(() => true, () => false);
if (shouldWrite) {
  for (const future of [manifestPath, schemaPath, finalLedgerPath, analysisPath, scorePath]) {
    assertV4(!(await exists(future)), `${future} already exists`);
  }
}

const { sourcePaths } = await loadV42215FinalLedgerInputs();
const toolPaths = [
  "docs/assessment-workflow-v4.2.21.md",
  "scripts/lib/v42215-final-ledger.mjs",
  "scripts/test-v42215-final-ledger.mjs",
  "scripts/preregister-v42215-final-ledger.mjs",
  "scripts/assemble-v42215-final-ledger.mjs",
  "scripts/validate-v42215-final-ledger.mjs",
  "scripts/analyze-v42215-final-ledger.mjs"
];
const hash = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set([...sourcePaths, ...toolPaths])].sort()) {
  sourceHashes[file] = hash(await readFile(path.resolve(file)));
}

const manifest = {
  schemaVersion: "4.2.21.5-final-ledger-assembly-manifest",
  protocolId: "v4.2.21-source-span-consensus",
  status: "frozen-deterministic-final-ledger-assembly",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  inputs: {
    debates: 3,
    disputedMoves: 34,
    candidateSelections: 160,
    nondisputedUnequalRawScalars: 64,
    audioVerifiedMoves: 5
  },
  compilerRules: {
    baseJudgment: "passA-locked-inventory-and-default-rationales",
    anonymizedCandidateMapping: "repository-provenance-resolved-independently-per-pair",
    attributionConfidenceAndBasis: "complete-record-from-adjudicated-candidate",
    responseStructureAndWithinClassResponsiveness: "indivisible-adjudicated-candidate",
    charityStateAndRepresentationalCharity: "indivisible-adjudicated-candidate",
    relevanceBurdenAndBurdenContact: "indivisible-adjudicated-candidate",
    precisionAndCalibration: "complete-closed-findings-from-adjudicated-candidate",
    assessmentConfidence: "adjudicated-candidate",
    burdenAdjustments: "complete-record-from-adjudicated-candidate",
    nondisputedUnequalRawScalars: "rounded-mean-only-after-adjudication",
    unchangedEqualSemanticFields: "passA-rationale-retained-deterministically",
    modelScoresAllowed: false,
    deterministicScoresAllowedDuringAssembly: false
  },
  replayRequirements: {
    bothAcceptedPassesValidateAgainstFullSourceChain: true,
    disagreementsReextractedExactly: true,
    anonymizedPacketsAndProvenanceRebuiltExactly: true,
    adjudicationRevalidatedExactly: true,
    finalRawJudgmentsValidateAgainstFullSourceChain: true
  },
  acceptanceRule: {
    finalJudgmentsRequired: 3,
    disputedMovesRequired: 34,
    candidateSelectionsRequired: 160,
    rawScalarPopulationRequired: 64,
    audioVerifiedMovesRequired: 5,
    missingSelectionsMaximum: 0,
    inventedCandidatesMaximum: 0,
    calculatedScoresMaximum: 0
  },
  artifacts: {
    schema: schemaPath,
    finalLedger: finalLedgerPath,
    analysis: analysisPath,
    calculatedScores: scorePath
  },
  authorization: {
    finalLedgerAssembly: true,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    heldOutGate: false,
    all195Debates: false
  },
  sourceHashes
};

if (shouldWrite) {
  await mkdir(path.resolve(V42215_FINAL_LEDGER_ROOT), { recursive: true });
  await writeFile(path.resolve(schemaPath), `${JSON.stringify(makeV42215FinalLedgerSchema(), null, 2)}\n`);
  await writeFile(path.resolve(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? "frozen" : "preview",
      debates: 3,
      candidateSelections: 160,
      rawScalarPopulation: 64,
      audioVerifiedMoves: 5,
      finalLedgerAssemblyAuthorized: true,
      scoreDerivationAuthorized: false
    },
    null,
    2
  )
);
