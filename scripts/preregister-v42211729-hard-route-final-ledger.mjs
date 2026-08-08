#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V42211729_PROTOCOL_ID, V42211729_ROOT, buildV42211729FinalLedger, loadV42211729FinalLedgerInputs, validateV42211729FinalLedger } from "./lib/v42211729-hard-route-final-ledger.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const manifestPath = `${V42211729_ROOT}/final-ledger-manifest.json`;
const ledgerPath = `${V42211729_ROOT}/final-ledger.json`;
const analysisPath = `${V42211729_ROOT}/analysis.json`;
if (shouldWrite) for (const file of [manifestPath, ledgerPath, analysisPath]) await access(file).then(() => { throw new Error(`${file} already exists`); }, () => true);
const inputs = await loadV42211729FinalLedgerInputs();
const preview = buildV42211729FinalLedger(inputs.debateInputs, inputs.sourceHashes);
const validation = validateV42211729FinalLedger(preview, inputs.debateInputs, inputs.sourceHashes);
const expected = { debates: 5, disputedMoves: 94, candidateSelections: 271, roundedMeanPopulation: 287, audioVerifiedMoves: 3, calculatedScores: 0 };
assertV4(validation.debates === expected.debates && validation.disputedMoves === expected.disputedMoves && validation.candidateSelections === expected.candidateSelections && validation.roundedMeanMerges + validation.dependencyMeanMergesSuppressed === expected.roundedMeanPopulation && validation.audioVerifiedMoves === expected.audioVerifiedMoves && validation.calculatedScores === 0, "hard-route final-ledger preview population mismatch");
const sourceFiles = [
  ...inputs.sourcePaths,
  "docs/assessment-workflow-v4.2.21.17.29.md",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/v41-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v42181-fresh-direct-three.mjs",
  "scripts/lib/v4219-primary-recovery.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/v4221-pass-b-consensus.mjs",
  "scripts/lib/v4221173-decomposed-disagreement.mjs",
  "scripts/lib/v4221175-decomposed-adjudication.mjs",
  "scripts/lib/v42211726-hard-route-disagreement.mjs",
  "scripts/lib/v42211728-hard-route-adjudication.mjs",
  "scripts/lib/v42211729-hard-route-final-ledger.mjs",
  "scripts/preregister-v42211729-hard-route-final-ledger.mjs",
  "scripts/assemble-v42211729-hard-route-final-ledger.mjs",
  "scripts/analyze-v42211729-hard-route-final-ledger.mjs",
  "scripts/test-v42211729-hard-route-final-ledger.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
const manifest = {
  schemaVersion: "4.2.21.17.29-hard-route-final-ledger-assembly-manifest",
  protocolId: V42211729_PROTOCOL_ID,
  status: "frozen-five-debate-hard-route-deterministic-final-ledger-assembly",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  expected,
  sourceHashes,
  replayRequirements: { bothIndependentPassesAgainstFullLocalTranscriptChain: true, deterministicDisagreements: true, anonymizedCandidateProvenance: true, disputeOnlyAdjudicationSelections: true, locallySavedAudioTranscriptHashes: true, dependencyPairOwnershipPrecedesRoundedMean: true, calculatedScores: 0 },
  artifacts: { finalLedger: ledgerPath, analysis: analysisPath },
  authorization: { finalLedgerAssembly: true, scoreDerivation: false, modelExecution: false, paidApiCalls: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) { await mkdir(path.resolve(V42211729_ROOT), { recursive: true }); await writeFile(path.resolve(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`); }
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", expected: manifest.expected, sourceFiles: Object.keys(sourceHashes).length, modelContexts: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0, scoreDerivationAuthorized: false }, null, 2));
