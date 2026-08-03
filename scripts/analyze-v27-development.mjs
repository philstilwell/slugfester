#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { deriveBurdenRelation, deriveCoverage, deriveDiagnostic, deriveReframe, deriveTargetDisposition } from "./lib/v27-derived-annotations.mjs";

const write = process.argv.includes("--write");
const examplesPath = path.resolve("docs/calibration/v2.7/development/orthogonal-target-diagnostic-examples.json");
const outputPath = path.resolve("docs/calibration/v2.7/development/debate-held-out-replay.json");
const examplesText = await readFile(examplesPath, "utf8");
const examples = JSON.parse(examplesText);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const retired = examples.retiredDebates;
const replays = retired.map((heldOutDebateId) => {
  const cases = examples.cases.filter((item) => item.debateId === heldOutDebateId);
  const modes = [...new Set(cases.map((item) => item.interactionMode))].sort();
  const phenomena = {
    objectChange: cases.filter((item) => item.finalCoverage.targetObjectRelation === "changed").length,
    scopeChange: cases.filter((item) => !["same", "not-applicable"].includes(item.finalCoverage.targetScopeRelation)).length,
    relevantNonanswer: cases.filter((item) => item.finalCoverage.derivedTargetCoverage === "relevant-nonanswer").length,
    nonanswer: cases.filter((item) => item.finalCoverage.derivedTargetCoverage === "nonanswer").length,
    full: cases.filter((item) => item.finalCoverage.derivedTargetCoverage === "full").length,
    partial: cases.filter((item) => item.finalCoverage.derivedTargetCoverage === "partial").length,
    diagnosticPositive: cases.filter((item) => item.finalDiagnostic.derivedDiagnostic).length,
    diagnosticNegative: cases.filter((item) => !item.finalDiagnostic.derivedDiagnostic).length,
  };
  let dispositionErrors = 0; let coverageErrors = 0; let diagnosticErrors = 0;
  for (const item of cases) {
    if (deriveTargetDisposition(item, item.finalCoverage) !== item.finalCoverage.derivedTargetDisposition) dispositionErrors += 1;
    if (deriveCoverage(item, item.finalCoverage) !== item.finalCoverage.derivedTargetCoverage) coverageErrors += 1;
    if (deriveDiagnostic(item, item.finalDiagnostic) !== item.finalDiagnostic.derivedDiagnostic) diagnosticErrors += 1;
  }
  return {
    heldOutDebateId,
    calibrationDebateIds: retired.filter((id) => id !== heldOutDebateId),
    caseCount: cases.length,
    representedInteractionModes: modes,
    phenomena,
    deterministicReplay: { dispositionErrors, coverageErrors, diagnosticErrors, passed: dispositionErrors + coverageErrors + diagnosticErrors === 0 },
  };
});

const inventoryPaths = [...new Set(examples.cases.map((item) => item.provenance.inventoryPath))];
let stableMoveCount = 0; let burdenDerivationRegressions = 0; let reframeDerivationRegressions = 0;
const stableDebates = [];
for (const inventoryRelative of inventoryPaths) {
  const inventory = JSON.parse(await readFile(path.resolve(inventoryRelative), "utf8"));
  const caseForInventory = examples.cases.find((item) => item.provenance.inventoryPath === inventoryRelative);
  const lock = JSON.parse(await readFile(path.resolve(caseForInventory.provenance.lockPath), "utf8"));
  const moves = new Map(inventory.moves.map((move) => [move.moveId, move]));
  let debateBurdenRegressions = 0; let debateReframeRegressions = 0;
  for (const annotation of lock.annotations) {
    const move = moves.get(annotation.moveId);
    if (deriveBurdenRelation(inventory, move, annotation.burdenPrimitives) !== annotation.burdenPrimitives.derivedBurdenRelation) debateBurdenRegressions += 1;
    if (deriveReframe(annotation.reframePrimitives) !== annotation.reframePrimitives.derivedReframe) debateReframeRegressions += 1;
    stableMoveCount += 1;
  }
  burdenDerivationRegressions += debateBurdenRegressions;
  reframeDerivationRegressions += debateReframeRegressions;
  stableDebates.push({ debateId: inventory.debateId, moveCount: lock.annotations.length, burdenDerivationRegressions: debateBurdenRegressions, reframeDerivationRegressions: debateReframeRegressions });
}

const artifact = {
  schemaVersion: "2.7-development-replay",
  workflowVersion: "Slugfester Reassessment Workflow v2.7",
  heldOutEligible: false,
  interpretation: "Deterministic leave-one-debate-out rule replay over retired development cases; this is a regression and behavior-coverage test, not independent-rater evidence.",
  source: { examplesPath: path.relative(process.cwd(), examplesPath), examplesSha256: sha256(examplesText) },
  replays,
  stableModuleRegression: { moveCount: stableMoveCount, burdenDerivationRegressions, reframeDerivationRegressions, debates: stableDebates, passed: burdenDerivationRegressions + reframeDerivationRegressions === 0 },
  decision: { passed: replays.every((item) => item.deterministicReplay.passed) && burdenDerivationRegressions === 0 && reframeDerivationRegressions === 0, heldOutGateStillRequired: true },
};

if (write) await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
else {
  const existing = JSON.parse(await readFile(outputPath, "utf8"));
  if (JSON.stringify(existing) !== JSON.stringify(artifact)) throw new Error("v2.7 development replay is stale; run with --write");
}
console.log(JSON.stringify({ status: artifact.decision.passed ? "passed" : "failed", write, replayCount: replays.length, stableMoveCount, burdenDerivationRegressions, reframeDerivationRegressions }, null, 2));
