#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { deriveDiagnostic, deriveReframe, equal } from "./lib/v281-semantics.mjs";

const root = process.cwd();
const directory = "docs/calibration/v2.8/development/attempt-2";
const manifestPath = `${directory}/challenge-manifest.json`;
const inputPath = `${directory}/challenge-input.json`;
const keyPath = `${directory}/challenge-key.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const [manifestText, inputText, keyText] = await Promise.all([
  readFile(path.resolve(root, manifestPath), "utf8"), readFile(path.resolve(root, inputPath), "utf8"), readFile(path.resolve(root, keyPath), "utf8"),
]);
const manifest = JSON.parse(manifestText);
const input = JSON.parse(inputText);
const key = JSON.parse(keyText);
assert(manifest.schemaVersion === "2.8.1-development-challenge-manifest" && manifest.status === "frozen-before-blind-passes" && manifest.calibrationOnly === true && manifest.heldOutTranscriptsOpened === false && manifest.numericalScoringAuthorized === false, "manifest identity or stop state invalid");
assert(manifest.workflowVersion === input.workflowVersion && manifest.rubricVersion === input.rubricVersion && manifest.caseCount === input.caseCount && equal(manifest.laneCounts, input.laneCounts), "manifest input identity invalid");
const expectedThresholds = { targetObjectExact:0.90,targetScopeExact:0.85,targetBurdenExact:0.90,componentContactMicroExact:0.90,responsiveCoverageExact:0.85,responsiveCoverageKappa:0.75,defectTypeExact:0.85,diagnosticObjectExact:0.85,impactModeExact:0.90,diagnosticExact:0.90,reframeExact:0.90,burdenExact:0.80,burdenKappa:0.70,exactDerivedTupleExact:0.70,diagnosticPositiveRecall:0.80,reframePositiveRecall:1.00 };
assert(equal(manifest.thresholds, expectedThresholds), "manifest thresholds changed");
const keyFeatureCounts = {
  diagnosticPositive: key.annotations.filter(deriveDiagnostic).length,
  diagnosticNegative: key.annotations.filter((item) => !deriveDiagnostic(item)).length,
  reframePositive: key.annotations.filter(deriveReframe).length,
  reframeNegative: key.annotations.filter((item) => !deriveReframe(item)).length,
};
assert(equal(manifest.keyFeatureCounts, keyFeatureCounts) && keyFeatureCounts.diagnosticPositive >= 3 && keyFeatureCounts.diagnosticNegative >= 3 && keyFeatureCounts.reframePositive >= 3 && keyFeatureCounts.reframeNegative >= 3, "rare-feature counts invalid");
assert(manifest.passIsolation.allowedInputs.length === 5 && !manifest.passIsolation.allowedInputs.includes(keyPath), "pass allowlist invalid");
for (const [sourcePath, expectedHash] of Object.entries(manifest.sourceHashes)) {
  const sourceText = await readFile(path.resolve(root, sourcePath), "utf8");
  assert(sha256(sourceText) === expectedHash, `frozen source changed: ${sourcePath}`);
}
assert(manifest.sourceHashes[inputPath] === sha256(inputText) && manifest.sourceHashes[keyPath] === sha256(keyText), "input/key manifest hash invalid");
console.log(JSON.stringify({ status: "passed", kind: "v2.8.1-challenge-manifest", caseCount: manifest.caseCount, keyFeatureCounts, sourceCount: Object.keys(manifest.sourceHashes).length, manifestSha256: sha256(manifestText) }, null, 2));

