#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V35_RUBRIC, V35_WORKFLOW, assert, sha256 } from "./lib/v35-semantic-compiler.mjs";

const root = process.cwd();
const priorRoot = "docs/calibration/v3.4/retired-three-debate-test";
const gateRoot = "docs/calibration/v3.5/v34-six-review-replay";
const outputPath = `${gateRoot}/gate-manifest.json`;
const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : new Date().toISOString();
assert(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be an ISO timestamp");
const read = (file) => readFile(path.resolve(root, file), "utf8");

if (shouldWrite) {
  try {
    await access(path.resolve(root, outputPath));
    throw new Error(`${outputPath} already exists; preregistration is immutable`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

const priorManifestPath = `${priorRoot}/gate-manifest.json`;
const priorManifestText = await read(priorManifestPath);
const prior = JSON.parse(priorManifestText);
const decisionSources = [
  "docs/assessment-workflow-v3.5.md",
  "docs/reassessment-rubric-v3.5.md",
  `${gateRoot}/compiler-preregistration.md`,
  "scripts/lib/v35-semantic-compiler.mjs",
  "scripts/replay-v35-compiler.mjs",
  "scripts/analyze-v35-compiler-replay.mjs",
  "scripts/validate-v35-compiler-replay.mjs",
  "scripts/test-v35-semantic-compiler.mjs"
];
const sourceHashes = Object.fromEntries(await Promise.all(decisionSources.map(async (file) => [file, sha256(await read(file))])));
const sample = [];
const outputs = {};
for (const debate of prior.sample.debates) {
  const priorOutputs = prior.outputs[debate.debateId];
  const fixturePaths = {
    input: debate.v32.input.path,
    passA: debate.v32.passA.path,
    passB: debate.v32.passB.path,
    sourceAudit: debate.v32.sourceAudit.path,
    terraReview: priorOutputs.reviews.terra,
    solReview: priorOutputs.reviews.sol
  };
  const fixtures = Object.fromEntries(await Promise.all(Object.entries(fixturePaths).map(async ([key, file]) => [key, { path: file, sha256: sha256(await read(file)) }])));
  const gold = { path: debate.v32.gold.path, sha256: sha256(await read(debate.v32.gold.path)), evaluatorOnly: true };
  sample.push({ debateId: debate.debateId, debateNumber: debate.debateNumber, role: debate.role, fixtures, gold });
  outputs[debate.debateId] = {
    compiledReviews: {
      terra: `${gateRoot}/compiled-reviews/terra/${debate.debateId}.json`,
      sol: `${gateRoot}/compiled-reviews/sol/${debate.debateId}.json`
    },
    replayLock: `${gateRoot}/replay-locks/${debate.debateId}.json`
  };
}

const manifest = {
  schemaVersion: "3.5-compiler-replay-manifest",
  gateId: "v3.5-v34-six-review-replay",
  status: "frozen-before-replay",
  frozenAt,
  workflowVersion: V35_WORKFLOW,
  rubricVersion: V35_RUBRIC,
  calibrationOnly: true,
  retrospectiveDevelopmentFixture: true,
  modelContextsExecuted: 0,
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0,
  heldOutMaterialOpened: false,
  numericalScoringAuthorized: false,
  productionMutationAuthorized: false,
  priorV34: { manifestPath: priorManifestPath, manifestSha256: sha256(priorManifestText), officialOutcome: "failed-before-final-lock" },
  compilerAllowedInputs: ["input", "passA", "passB", "terraReview", "solReview"],
  evaluatorOnlyInputs: ["gold"],
  architecture: {
    uniqueEvidenceTextRequired: true,
    offsetsDerivedDeterministically: true,
    targetDependenciesProjected: true,
    componentPrecludesContrary: true,
    diagnosticBundleAtomic: true,
    terraLeadingConflictArbiter: true,
    dualConfirmationRequiredForThirdValue: true,
    sharedBurdenValuesLocked: true,
    caseSpecificRulesProhibited: true,
    discretionaryRepairsMaximum: 0,
    fallbackCasesMaximum: 0
  },
  compilerGateThresholds: {
    compiledArtifactCount: 6,
    compiledReviewCaseCount: 26,
    replayLockCaseCount: 13,
    validCompiledReviewRate: 1,
    validReplayLockRate: 1,
    mediumLowAudioVerificationRate: 1,
    discretionaryRepairsMaximum: 0,
    fallbackCasesMaximum: 0,
    modelContextsMaximum: 0,
    scoringFieldsMaximum: 0
  },
  semanticReadinessThresholds: prior.thresholds,
  sourceHashes,
  sample: { debateCount: sample.length, debates: sample },
  outputs,
  replaySummaryPath: `${gateRoot}/replay-summary.json`,
  semanticAnalysisPath: `${gateRoot}/semantic-analysis.json`
};

const text = `${JSON.stringify(manifest, null, 2)}\n`;
if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(root, outputPath)), { recursive: true });
  await writeFile(path.resolve(root, outputPath), text);
}
console.log(text);
