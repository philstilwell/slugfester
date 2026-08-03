#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const manifestPath = "docs/calibration/v2.8/development/challenge-manifest.json";
const root = process.cwd();
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const manifest = JSON.parse(await readFile(path.resolve(root, manifestPath), "utf8"));
assert(manifest.schemaVersion === "2.8-development-challenge-manifest" && manifest.workflowVersion === "Slugfester Reassessment Workflow v2.8" && manifest.rubricVersion === "Slugfester Reassessment Rubric v2.8" && manifest.calibrationOnly === true && manifest.caseCount === 49, "manifest identity mismatch");
const mapping = {
  workflowSha256: "docs/assessment-workflow-v2.8.md",
  rubricSha256: "docs/reassessment-rubric-v2.8.md",
  manualSha256: "docs/calibration/v2.8/development/annotation-manual.md",
  challengeInputSha256: "docs/calibration/v2.8/development/challenge-input.json",
  challengeKeySha256: "docs/calibration/v2.8/development/challenge-key.json",
  challengeSchemaSha256: "docs/calibration/v2.8/development/challenge-annotation-schema.json",
  semanticsLibrarySha256: "scripts/lib/v28-semantics.mjs",
  builderSha256: "scripts/build-v28-development-challenge.mjs",
  inputKeyValidatorSha256: "scripts/validate-v28-development-challenge.mjs",
  blindPassValidatorSha256: "scripts/validate-v28-development-pass.mjs",
  analyzerSha256: "scripts/analyze-v28-development-challenge.mjs",
  manifestValidatorSha256: "scripts/validate-v28-challenge-manifest.mjs",
};
assert(JSON.stringify(Object.keys(manifest.sources).sort()) === JSON.stringify(Object.keys(mapping).sort()), "manifest source set mismatch");
for (const [field, file] of Object.entries(mapping)) {
  const text = await readFile(path.resolve(root, file), "utf8");
  assert(manifest.sources[field] === sha256(text), `${field} does not match ${file}`);
}
const input = JSON.parse(await readFile(path.resolve(root, "docs/calibration/v2.8/development/challenge-input.json"), "utf8"));
const key = JSON.parse(await readFile(path.resolve(root, "docs/calibration/v2.8/development/challenge-key.json"), "utf8"));
assert(input.caseCount === manifest.caseCount && key.caseCount === manifest.caseCount, "manifest case count mismatch");
const rare = manifest.rareFeatureRequirements;
assert(key.rareFeatureAudit.diagnosticPositiveCaseIds.length >= rare.minimumDiagnosticPositivesInKey && key.rareFeatureAudit.diagnosticNegativeCaseIds.length >= rare.minimumDiagnosticNegativesInKey && key.rareFeatureAudit.reframePositiveCaseIds.length >= rare.minimumReframePositivesInKey && key.rareFeatureAudit.reframeNegativeCaseIds.length >= rare.minimumReframeNegativesInKey, "rare-feature exposure mismatch");
for (const value of Object.values(manifest.thresholds)) assert(typeof value === "number" && value >= 0 && value <= 1, "threshold outside 0-1");
assert(manifest.stopRule.keyHiddenFromPasses === true && manifest.stopRule.otherPassHidden === true && manifest.stopRule.failedAttemptFrozen === true && manifest.stopRule.freshHeldOutSelectionAuthorizedOnlyOnPass === true && manifest.stopRule.numericalScoringAuthorized === false, "stop rule mismatch");
console.log(JSON.stringify({ status: "passed", caseCount: manifest.caseCount, sourceCount: Object.keys(mapping).length, manifestSha256: sha256(await readFile(path.resolve(root, manifestPath), "utf8")) }, null, 2));
