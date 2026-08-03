#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { deriveDiagnostic, deriveReframe } from "./lib/v281-semantics.mjs";

const root = process.cwd();
const directory = "docs/calibration/v2.8/development/attempt-2";
const manifestPath = `${directory}/challenge-manifest.json`;
const sources = [
  "docs/assessment-workflow-v2.8.1.md",
  "docs/reassessment-rubric-v2.8.1.md",
  `${directory}/annotation-manual.md`,
  `${directory}/challenge-annotation-schema.json`,
  `${directory}/challenge-input.json`,
  `${directory}/selection-ledger.json`,
  `${directory}/challenge-key.json`,
  `${directory}/key-review-ledger.md`,
  "scripts/lib/v281-semantics.mjs",
  "scripts/build-v281-development-challenge.mjs",
  "scripts/validate-v281-development-input.mjs",
  "scripts/validate-v281-development-pass.mjs",
  "scripts/analyze-v281-development-challenge.mjs",
  "scripts/build-v281-challenge-manifest.mjs",
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const texts = new Map(await Promise.all(sources.map(async (sourcePath) => [sourcePath, await readFile(path.resolve(root, sourcePath), "utf8")])));
const input = JSON.parse(texts.get(`${directory}/challenge-input.json`));
const key = JSON.parse(texts.get(`${directory}/challenge-key.json`));
const manifest = {
  schemaVersion: "2.8.1-development-challenge-manifest",
  status: "frozen-before-blind-passes",
  frozenAt: new Date().toISOString(),
  calibrationOnly: true,
  heldOutTranscriptsOpened: false,
  numericalScoringAuthorized: false,
  workflowVersion: input.workflowVersion,
  rubricVersion: input.rubricVersion,
  attempt: 2,
  caseCount: input.caseCount,
  laneCounts: input.laneCounts,
  keyFeatureCounts: {
    diagnosticPositive: key.annotations.filter(deriveDiagnostic).length,
    diagnosticNegative: key.annotations.filter((item) => !deriveDiagnostic(item)).length,
    reframePositive: key.annotations.filter(deriveReframe).length,
    reframeNegative: key.annotations.filter((item) => !deriveReframe(item)).length,
  },
  thresholds: {
    targetObjectExact: 0.90,
    targetScopeExact: 0.85,
    targetBurdenExact: 0.90,
    componentContactMicroExact: 0.90,
    responsiveCoverageExact: 0.85,
    responsiveCoverageKappa: 0.75,
    defectTypeExact: 0.85,
    diagnosticObjectExact: 0.85,
    impactModeExact: 0.90,
    diagnosticExact: 0.90,
    reframeExact: 0.90,
    burdenExact: 0.80,
    burdenKappa: 0.70,
    exactDerivedTupleExact: 0.70,
    diagnosticPositiveRecall: 0.80,
    reframePositiveRecall: 1.00
  },
  passIsolation: {
    model: "5.6 Sol",
    method: "fresh-isolated-v2.8.1-development-challenge",
    allowedInputs: [
      "docs/assessment-workflow-v2.8.1.md",
      "docs/reassessment-rubric-v2.8.1.md",
      `${directory}/annotation-manual.md`,
      `${directory}/challenge-annotation-schema.json`,
      `${directory}/challenge-input.json`
    ],
    prohibitedInputs: [
      `${directory}/challenge-key.json`, `${directory}/key-review-ledger.md`,
      `${directory}/challenge-pass-a.json`, `${directory}/challenge-pass-b.json`,
      "docs/calibration/v2.8/development/challenge-key.json",
      "docs/calibration/v2.8/development/challenge-pass-a.json",
      "docs/calibration/v2.8/development/challenge-pass-b.json"
    ]
  },
  outputs: {
    passA: `${directory}/challenge-pass-a.json`,
    passB: `${directory}/challenge-pass-b.json`,
    analysis: `${directory}/challenge-analysis.json`
  },
  sourceHashes: Object.fromEntries([...texts.entries()].map(([sourcePath, text]) => [sourcePath, sha256(text)])),
};
await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: "written", manifestPath, caseCount: manifest.caseCount, keyFeatureCounts: manifest.keyFeatureCounts, sourceCount: sources.length }, null, 2));

