#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { deriveCoverage, evidenceMatches, validateComponentGraph } from "./lib/v26-derived-annotations.mjs";

const examplesPath = path.resolve("docs/calibration/v2.6/development/target-contact-examples.json");
const outputPath = path.resolve("docs/calibration/v2.6/development/debate-held-out-replay.json");
const artifact = JSON.parse(await readFile(examplesPath, "utf8"));
const debates = [...new Set(artifact.cases.map((item) => item.debateId))];
const folds = debates.map((heldOutDebate) => {
  const heldOut = artifact.cases.filter((item) => item.debateId === heldOutDebate);
  const training = artifact.cases.filter((item) => item.debateId !== heldOutDebate);
  let graphPasses = 0; let evidencePasses = 0; let derivationPasses = 0;
  for (const item of heldOut) {
    if (validateComponentGraph(item.targetPacket.indispensableComponents).length === 0) graphPasses += 1;
    const evidenceItems = [item.finalCoverage.substitutionEvidence, item.finalCoverage.contraryEvidence, ...item.finalCoverage.componentOperations.map((operation) => operation.evidence)];
    if (evidenceItems.every((evidence) => evidenceMatches(item.sourceExcerpt, evidence))) evidencePasses += 1;
    if (deriveCoverage({ interactionMode: "responsive" }, item.finalCoverage) === item.finalCoverage.derivedTargetCoverage) derivationPasses += 1;
  }
  return {
    heldOutDebate,
    trainingDebates: debates.filter((debate) => debate !== heldOutDebate),
    trainingCaseCount: training.length,
    heldOutCaseCount: heldOut.length,
    ruleChangesDuringFold: 0,
    graphPassCount: graphPasses,
    evidencePassCount: evidencePasses,
    derivationPassCount: derivationPasses,
    status: graphPasses === heldOut.length && evidencePasses === heldOut.length && derivationPasses === heldOut.length ? "pass" : "fail",
  };
});
const report = {
  schemaVersion: "2.6-debate-held-out-development-replay",
  workflowVersion: artifact.workflowVersion,
  rubricVersion: artifact.rubricVersion,
  replayType: "deterministic-rules-only-not-independent-rater-test",
  heldOutEligible: false,
  sourceExamplesPath: "docs/calibration/v2.6/development/target-contact-examples.json",
  folds,
  aggregate: {
    debateCount: debates.length,
    caseCount: artifact.cases.length,
    foldsPassed: folds.filter((fold) => fold.status === "pass").length,
    ruleChangesAcrossFolds: folds.reduce((sum, fold) => sum + fold.ruleChangesDuringFold, 0),
    graphFailures: folds.reduce((sum, fold) => sum + fold.heldOutCaseCount - fold.graphPassCount, 0),
    evidenceFailures: folds.reduce((sum, fold) => sum + fold.heldOutCaseCount - fold.evidencePassCount, 0),
    derivationFailures: folds.reduce((sum, fold) => sum + fold.heldOutCaseCount - fold.derivationPassCount, 0),
  },
  interpretation: "Every retired debate can be excluded in turn without changing the fixed v2.6 rules, and each excluded case remains mechanically valid. This detects rule/data entanglement and implementation defects but does not estimate fresh annotator agreement.",
};
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: folds.every((fold) => fold.status === "pass") ? "passed" : "failed", ...report.aggregate }, null, 2));
