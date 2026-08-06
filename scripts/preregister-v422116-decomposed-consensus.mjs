#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V422116_PROTOCOL_ID, V422116_ROOT } from "./lib/v422116-decomposed-consensus.mjs";

const shouldWrite = process.argv.includes("--write");
const files = {
  library: "scripts/lib/v422116-decomposed-consensus.mjs",
  fixture: "scripts/test-v422116-decomposed-consensus.mjs",
  workflow: "docs/assessment-workflow-v4.2.21.16.md",
  inventorySchema: `${V422116_ROOT}/inventory-template.schema.json`,
  judgmentSchema: `${V422116_ROOT}/judgment-a-fixture.schema.json`,
  fixtureResult: `${V422116_ROOT}/fixture-result.json`
};
const entries = await Promise.all(Object.entries(files).map(async ([name, path]) => {
  const bytes = await readFile(path);
  return [name, { path, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") }];
}));
const fixture = JSON.parse(await readFile(files.fixtureResult, "utf8"));
assertV4(fixture.status === "passed" && fixture.protocolId === V422116_PROTOCOL_ID, "decomposed consensus fixture has not passed");
assertV4(fixture.independentJudgments.passes === 2 && fixture.independentJudgments.earlierOpposingTargetEnumsOnly && fixture.independentJudgments.unchangedV4220ValidatorPassed, "independent judgment contract fixture failed");
assertV4(fixture.semanticRepairPerformed === false && fixture.scoresDerived === 0 && fixture.modelContextsExecuted === 0, "fixture crossed its authorization boundary");

const manifest = {
  schemaVersion: "4.2.21.16-decomposed-consensus-design-manifest",
  protocolId: V422116_PROTOCOL_ID,
  status: "decomposed-consensus-contract-frozen",
  calibrationOnly: true,
  AIOnly: true,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low", authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 },
  predecessor: {
    protocolId: "v4.2.21.15-candidate-evidence-transport",
    failureAnalysis: "docs/calibration/v4.2.21.15/candidate-evidence-transport/failure-analysis.json",
    retirementStatus: "monolithic-partition-primary-retired-decomposed-consensus-design-authorized"
  },
  contracts: {
    stage1: "one score-blind inventory curator over the complete candidate-evidence bundle",
    stage2: "two isolated independent performance judgments over one byte-identical locked inventory",
    stage3: "deterministic disagreement extraction",
    stage4: "audio verification for every medium-confidence move",
    stage5: "third isolated disputed-fields-only adjudication",
    stage6: "one deterministic score pass after final-ledger validation"
  },
  eliminatedFailureClasses: {
    futureOrSameSideTarget: "impossible in generated per-move target enums",
    burdenRatingOutsideTier: "impossible after within-tier repository mapping",
    mutuallyExclusiveSpecialResponseFlags: "one enum with structurally contacted special-response anchor",
    omittedOrDuplicatedMoveJudgment: "one required object property per locked move",
    ineligibleBurdenResidual: "repository applies zero unless every strict residual condition passes"
  },
  fixture,
  artifacts: Object.fromEntries(entries),
  nextGate: {
    name: "retired partition three score-blind inventory lock",
    debates: ["133", "178", "182"],
    modelContexts: 3,
    attemptsPerDebate: 1,
    retries: 0,
    timeoutMinutesPerContext: 10,
    acceptance: ["3/3 schema-valid inventories", "3/3 deterministic locked-inventory compilations", "zero semantic repairs", "zero ratings", "zero scores"],
    independentJudgmentsAuthorizedOnlyAfterInventoryGatePasses: true
  },
  totals: { modelContextsExecuted: 0, audioCalls: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: {
    deterministicFixtures: true,
    scoreBlindInventoryPreparation: true,
    scoreBlindInventoryExecutionManifest: false,
    scoreBlindInventoryModelExecution: false,
    independentJudgmentExecution: false,
    disagreementExtraction: false,
    audioVerification: false,
    adjudication: false,
    scoreDerivation: false,
    productionMutation: false,
    all195Debates: false
  }
};
if (shouldWrite) await writeFile(`${V422116_ROOT}/design-manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, nextGate: manifest.nextGate, totals: manifest.totals, authorization: manifest.authorization }, null, 2));
