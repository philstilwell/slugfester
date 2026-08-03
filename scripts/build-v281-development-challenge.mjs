#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const basePath = "docs/calibration/v2.8/development/challenge-input.json";
const retiredPath = "docs/calibration/v2.5/held-out-gate/inventories/dennett-caruso-free-will-responsibility-2021.json";
const retiredLockPath = "docs/calibration/v2.5/held-out-gate/locks/dennett-caruso-free-will-responsibility-2021.json";
const outputDirectory = "docs/calibration/v2.8/development/attempt-2";
const outputPath = `${outputDirectory}/challenge-input.json`;
const ledgerPath = `${outputDirectory}/selection-ledger.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const selectedBaseIds = [
  "v28-dev-04-05", "v28-dev-04-06", "v28-dev-04-10", "v28-dev-04-11",
  "v28-dev-152-08", "v28-dev-62-04", "v28-dev-62-07", "v28-dev-62-09",
  "v28-dev-154-08", "v28-dev-154-09", "v28-dev-154-11", "v28-dev-154-12",
  "v28-dev-154-14", "v28-dev-154-15", "v28-dev-71-05", "v28-dev-71-10",
  "v28-dev-71-11", "v28-dev-71-16", "v28-dev-84-07", "v28-dev-84-09",
  "v28-dev-84-12", "v28-dev-84-14",
];
const reframeMoves = [
  "m05-pro-q1-responsive-free-will-worth-wanting",
  "m07-pro-q2-responsive-causation-control-diagnosis",
  "m12-con-q4-responsive-rules-versus-reactive-attitudes",
];
const componentMetadata = {
  "m05-pro-q1-responsive-free-will-worth-wanting": [
    { kind: "fact-premise", dependsOn: [] },
    { kind: "conclusion", dependsOn: ["t05-c1-beyond-control"] },
  ],
  "m07-pro-q2-responsive-causation-control-diagnosis": [
    { kind: "fact-premise", dependsOn: [] },
    { kind: "inference", dependsOn: ["t07-c1-sourcehood-required"] },
  ],
  "m12-con-q4-responsive-rules-versus-reactive-attitudes": [
    { kind: "fact-premise", dependsOn: [] },
    { kind: "conclusion", dependsOn: ["t12-c1-agreed-penalties"] },
  ],
};

const [baseText, retiredText, retiredLockText] = await Promise.all([
  readFile(path.resolve(root, basePath), "utf8"),
  readFile(path.resolve(root, retiredPath), "utf8"),
  readFile(path.resolve(root, retiredLockPath), "utf8"),
]);
const base = JSON.parse(baseText);
const retired = JSON.parse(retiredText);
const byId = new Map(base.cases.map((item) => [item.caseId, item]));
const selectedCases = selectedBaseIds.map((caseId) => {
  const source = byId.get(caseId);
  if (!source) throw new Error(`Missing attempt-1 source case ${caseId}`);
  return {
    ...structuredClone(source),
    caseId: caseId.replace("v28-dev-", "v281-dev-"),
    fixtureOrigin: {
      type: "v2.8-attempt-1-retired-case",
      sourceCaseId: caseId,
      sourcePath: basePath,
      sourceSha256: sha256(baseText),
    },
  };
});

for (const moveId of reframeMoves) {
  const move = retired.moves.find((item) => item.moveId === moveId);
  if (!move) throw new Error(`Missing retired reframe move ${moveId}`);
  const route = retired.burdenRoutes.find((item) => item.id === move.burdenPacket.primaryRouteId);
  if (!route) throw new Error(`Missing burden route for ${moveId}`);
  const shortId = moveId.slice(1, 3);
  selectedCases.push({
    caseId: `v281-dev-185-${shortId}`,
    lane: "dyadic",
    debateId: retired.debateId,
    debateNumber: retired.debateNumber,
    moveId: move.moveId,
    side: move.side,
    speaker: move.speaker,
    sourceExcerpt: move.sourceExcerpt,
    sourceExcerptSha256: move.sourceExcerptSha256,
    targetPacket: {
      ...structuredClone(move.targetPacket),
      targetSide: move.side === "pro" ? "con" : "pro",
      ownershipScope: "speaker-only",
      adoptionRecords: [],
      targetRelationToMove: "retired-explicit-reframe-fixture",
      interveningOpponentClaim: false,
      exceptionRationale: null,
      indispensableComponents: move.targetPacket.indispensableComponents.map((component, index) => ({
        ...component,
        ...componentMetadata[moveId][index],
      })),
    },
    burdenContext: {
      burdenPacket: structuredClone(move.burdenPacket),
      route: structuredClone(route),
    },
    fixtureOrigin: {
      type: "v2.5-retired-explicit-reframe",
      sourceCaseId: moveId,
      sourcePath: retiredPath,
      sourceSha256: sha256(retiredText),
      lockPath: retiredLockPath,
      lockSha256: sha256(retiredLockText),
    },
  });
}

selectedCases.sort((left, right) => left.caseId.localeCompare(right.caseId));
const input = {
  schemaVersion: "2.8.1-development-challenge-input",
  workflowVersion: "Slugfester Reassessment Workflow v2.8.1",
  rubricVersion: "Slugfester Reassessment Rubric v2.8.1",
  calibrationOnly: true,
  numericalScoresIncluded: false,
  legacyPassLabelsIncluded: false,
  sourceGateCommit: base.sourceGateCommit,
  caseCount: selectedCases.length,
  laneCounts: {
    dyadic: selectedCases.filter((item) => item.lane === "dyadic").length,
    multiSpeaker: selectedCases.filter((item) => item.lane === "multi-speaker").length,
  },
  cases: selectedCases,
};
const excluded = base.cases.filter((item) => !selectedBaseIds.includes(item.caseId)).map((item) => ({
  sourceCaseId: item.caseId,
  reason: "Excluded from canonical attempt-2 fixtures because attempt 1 or the independent audit exposed a disputed boundary, inherited-key conflict, redundant feature, or nonminimal cue. The case remains preserved in attempt 1 and may be used only as descriptive stress material.",
}));
const ledger = {
  schemaVersion: "2.8.1-development-selection-ledger",
  createdAt: new Date().toISOString(),
  purpose: "Pre-pass canonical-fixture selection from retired development evidence; never held-out promotion evidence.",
  selectionPolicy: [
    "Retain clear positive and negative fixtures spanning target mapping, scope, component contact, diagnostics, impact, reframe, and burden contact.",
    "Include both dyadic and multi-speaker interaction structures.",
    "Exclude unresolved attempt-1 boundary cases from the gated fixture set rather than adjudicating toward either prior pass.",
    "Add retired explicit-reframe cases because attempt 1 lacked three defensible positive reframe fixtures.",
  ],
  selectedAttemptOneCaseIds: selectedBaseIds,
  addedRetiredMoveIds: reframeMoves,
  excludedAttemptOneCases: excluded,
  inputPath: outputPath,
  inputSha256: null,
};
await mkdir(path.resolve(root, outputDirectory), { recursive: true });
const inputText = `${JSON.stringify(input, null, 2)}\n`;
ledger.inputSha256 = sha256(inputText);
await writeFile(path.resolve(root, outputPath), inputText);
await writeFile(path.resolve(root, ledgerPath), `${JSON.stringify(ledger, null, 2)}\n`);
console.log(JSON.stringify({ status: "written", outputPath, ledgerPath, caseCount: input.caseCount, laneCounts: input.laneCounts, inputSha256: ledger.inputSha256 }, null, 2));

