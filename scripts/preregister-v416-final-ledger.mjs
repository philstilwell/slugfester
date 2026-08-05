#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { loadV416FinalLedgerInputs, makeV416FinalLedgerSchema, V416_FINAL_LEDGER_ROOT } from "./lib/v416-final-ledger.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const manifestPath = `${V416_FINAL_LEDGER_ROOT}/final-ledger-manifest.json`;
const schemaPath = `${V416_FINAL_LEDGER_ROOT}/final-ledger.schema.json`;
const finalLedgerPath = `${V416_FINAL_LEDGER_ROOT}/final-ledger.json`;
const scorePath = `${V416_FINAL_LEDGER_ROOT}/calculated-scores.json`;
const exists = async (file) => access(path.resolve(file)).then(() => true, () => false);
if (shouldWrite) for (const future of [manifestPath, schemaPath, finalLedgerPath, scorePath]) assertV4(!(await exists(future)), `${future} already exists`);
const [{ sourcePaths }, analysis] = await Promise.all([loadV416FinalLedgerInputs(), readJson(`${V416_FINAL_LEDGER_ROOT}/analysis.json`)]);
assertV4(analysis.authorization.finalLedgerAssembly && !analysis.authorization.scoreDerivation, "analysis boundary invalid");
const toolPaths = [
  "scripts/lib/v416-final-ledger.mjs", "scripts/test-v416-final-ledger.mjs", "scripts/preregister-v416-final-ledger.mjs", "scripts/assemble-v416-final-ledger.mjs", "scripts/validate-v416-final-ledger.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set([...sourcePaths, ...toolPaths])]) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
const schema = makeV416FinalLedgerSchema();
const manifest = {
  schemaVersion: "4.1.6-final-ledger-assembly-manifest",
  protocolId: "v4.1.6-triggered-pass-b-consensus",
  status: "frozen-deterministic-final-ledger-assembly",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  calibrationOnly: true,
  inputs: { debates: 3, disputedMoves: 34, candidateSelections: 154, nondisputedUnequalRawScalars: 39, audioVerifiedMoves: 8 },
  compilerRules: {
    baseJudgment: "primary",
    responseTupleAndResponsiveness: "indivisible-adjudicated-candidate",
    charityStateAndRepresentationalCharity: "indivisible-adjudicated-candidate",
    relevanceBurdenAndBurdenContact: "indivisible-adjudicated-candidate",
    independentDisputedScoringFields: "complete-record-from-adjudicated-candidate",
    burdenAdjustments: "complete-record-from-adjudicated-candidate",
    nondisputedUnequalRawScalars: "rounded-mean-after-adjudication",
    dependencyPrecedence: "compound-or-independent-adjudicated-selection-suppresses-rounded-mean",
    allOtherFields: "primary-locked",
    modelScoresAllowed: false,
    deterministicScoresAllowedDuringAssembly: false
  },
  acceptanceRule: { exactDeterministicReplay: true, finalJudgmentsRequired: 3, candidateSelectionsRequired: 154, rawScalarPopulationRequired: 39, sourceSchemaValidationRequired: true, missingSelectionsMaximum: 0, inventedCandidatesMaximum: 0, calculatedScoresMaximum: 0 },
  artifacts: { schema: schemaPath, finalLedger: finalLedgerPath, calculatedScores: scorePath },
  authorization: { finalLedgerAssembly: true, scoreDerivation: false, publicationFinalization: false, productionMutation: false, heldOutGate: false, all195Debates: false },
  sourceHashes
};
if (shouldWrite) {
  await writeFile(path.resolve(schemaPath), `${JSON.stringify(schema, null, 2)}\n`);
  await writeFile(path.resolve(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", debates: 3, candidateSelections: 154, rawScalarPopulation: 39, finalLedgerAssemblyAuthorized: true, scoreDerivationAuthorized: false }, null, 2));
