#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256 } from "./lib/v36-decision-cards.mjs";
import { assert, V37_FAMILIES, V37_GATE_ROOT } from "./lib/v37-retired-semantic.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestPath = `${V37_GATE_ROOT}/gate-manifest.json`;
const manifestText = await read(manifestPath);
const manifest = JSON.parse(manifestText);
const analysisText = await read(manifest.analysisPath);
const analysis = JSON.parse(analysisText);
const executionText = await read(manifest.executionResultPath);
const execution = JSON.parse(executionText);

assert(!analysis.passed, "gold audit extraction is only valid after a failed semantic test");
assert(analysis.goldOpenedAfterAllOutputsClosed, "gold was not opened after model closure");

const cases = new Map();
for (const family of V37_FAMILIES) {
  const packet = JSON.parse(await read(manifest.families[family].packet));
  for (const item of packet.cases) cases.set(`${family}::${item.caseId}`, { family, ...item });
}

const mismatchMaps = {};
for (const modelKey of manifest.modelKeys) {
  mismatchMaps[modelKey] = new Map(
    analysis.results.modelResults[modelKey].mismatches.map((item) => [
      `${item.family}::${item.caseId}::${item.fieldPath}`,
      item
    ])
  );
}

const consensusAgainstRetiredGold = [];
for (const [key, terraMismatch] of mismatchMaps.terra) {
  const solMismatch = mismatchMaps.sol.get(key);
  if (!solMismatch || canonicalJson(terraMismatch.actual) !== canonicalJson(solMismatch.actual)) continue;
  const [family, caseId] = key.split("::");
  consensusAgainstRetiredGold.push({
    key,
    family,
    caseId,
    fieldPath: terraMismatch.fieldPath,
    retiredExpected: terraMismatch.expected,
    terra: terraMismatch.actual,
    sol: solMismatch.actual,
    sourceCase: cases.get(`${family}::${caseId}`)
  });
}

const crossModelDisagreements = analysis.results.crossModel.disagreements.map((item) => {
  const [family, caseId, ...fieldParts] = item.key.split("::");
  const retiredMismatch = mismatchMaps.terra.get(item.key) ?? mismatchMaps.sol.get(item.key);
  assert(retiredMismatch, `${item.key}: disagreement lacks a retired comparison`);
  return {
    key: item.key,
    family,
    caseId,
    fieldPath: fieldParts.join("::"),
    retiredExpected: retiredMismatch.expected,
    terra: item.terra,
    sol: item.sol,
    sourceCase: cases.get(`${family}::${caseId}`)
  };
});

const sortByKey = (left, right) => left.key.localeCompare(right.key);
consensusAgainstRetiredGold.sort(sortByKey);
crossModelDisagreements.sort(sortByKey);
const disputedKeys = new Set([
  ...consensusAgainstRetiredGold.map((item) => item.key),
  ...crossModelDisagreements.map((item) => item.key)
]);
assert(disputedKeys.size === consensusAgainstRetiredGold.length + crossModelDisagreements.length, "audit categories overlap");

const structuralFailures = execution.results
  .filter((item) => item.status !== "completed-valid")
  .map((item) => ({
    family: item.family,
    modelKey: item.modelKey,
    model: item.model,
    status: item.status,
    deterministicValidationPassed: item.deterministicValidationPassed,
    attemptCount: item.attemptCount,
    retryCount: item.retryCount,
    outputSha256: item.outputSha256
  }));

const audit = {
  schemaVersion: "3.7-retired-gold-audit-disagreements",
  createdAt: execution.completedAt,
  status: "deterministic-extraction-complete",
  scope: {
    calibrationOnly: true,
    retiredGoldIsProvisional: true,
    modelIdentitiesMustBeBlindedAndCandidatesCounterbalancedBeforeAnyAuditInference: true,
    noGoldChangesAuthorizedByThisArtifact: true,
    modelBatchAuthorized: false,
    heldOutAccessAuthorized: false,
    numericalScoringAuthorized: false,
    assessmentProseAuthorized: false,
    productionMutationAuthorized: false
  },
  sources: {
    manifestPath,
    manifestSha256: sha256(manifestText),
    analysisPath: manifest.analysisPath,
    analysisSha256: sha256(analysisText),
    executionPath: manifest.executionResultPath,
    executionSha256: sha256(executionText)
  },
  counts: {
    consensusAgainstRetiredGold: consensusAgainstRetiredGold.length,
    crossModelDisagreements: crossModelDisagreements.length,
    totalDisputedFields: disputedKeys.size,
    structuralFailures: structuralFailures.length
  },
  consensusAgainstRetiredGold,
  crossModelDisagreements,
  structuralFailures
};

assert(audit.counts.consensusAgainstRetiredGold === 8, "unexpected consensus-against-gold count");
assert(audit.counts.crossModelDisagreements === 6, "unexpected cross-model disagreement count");
assert(audit.counts.totalDisputedFields === 14, "unexpected total disputed-field count");
assert(audit.counts.structuralFailures === 1, "unexpected structural-failure count");

const outputPath = `${V37_GATE_ROOT}/gold-audit-disagreements.json`;
const outputText = `${JSON.stringify(audit, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(root, outputPath), outputText);
console.log(outputText);
