#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const inputPath = "docs/calibration/v2.8/development/attempt-3/challenge-input.json";
const ledgerPath = "docs/calibration/v2.8/development/attempt-3/selection-ledger.json";
const basePath = "docs/calibration/v2.8/development/challenge-input.json";
const retiredPath = "docs/calibration/v2.5/held-out-gate/inventories/dennett-caruso-free-will-responsibility-2021.json";
const retiredLockPath = "docs/calibration/v2.5/held-out-gate/locks/dennett-caruso-free-will-responsibility-2021.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const [inputText, ledgerText, baseText, retiredText, retiredLockText] = await Promise.all([
  readFile(path.resolve(root, inputPath), "utf8"), readFile(path.resolve(root, ledgerPath), "utf8"),
  readFile(path.resolve(root, basePath), "utf8"), readFile(path.resolve(root, retiredPath), "utf8"),
  readFile(path.resolve(root, retiredLockPath), "utf8"),
]);
const input = JSON.parse(inputText);
const ledger = JSON.parse(ledgerText);
assert(input.schemaVersion === "2.8.2-development-challenge-input" && input.workflowVersion === "Slugfester Reassessment Workflow v2.8.2" && input.rubricVersion === "Slugfester Reassessment Rubric v2.8.2", "input identity invalid");
assert(input.calibrationOnly === true && input.numericalScoresIncluded === false && input.legacyPassLabelsIncluded === false, "input scope invalid");
assert(input.caseCount === input.cases.length && input.caseCount >= 12, "case count invalid");
assert(input.laneCounts.dyadic === input.cases.filter((item) => item.lane === "dyadic").length && input.laneCounts.multiSpeaker === input.cases.filter((item) => item.lane === "multi-speaker").length && input.laneCounts.dyadic > 0 && input.laneCounts.multiSpeaker > 0, "lane counts invalid");
assert(ledger.inputPath === inputPath && ledger.inputSha256 === sha256(inputText), "selection ledger input hash invalid");
const caseIds = input.cases.map((item) => item.caseId);
assert(new Set(caseIds).size === caseIds.length, "duplicate case id");
for (const challengeCase of input.cases) {
  assert(["dyadic", "multi-speaker"].includes(challengeCase.lane), `${challengeCase.caseId}: lane invalid`);
  assert(sha256(challengeCase.sourceExcerpt) === challengeCase.sourceExcerptSha256, `${challengeCase.caseId}: responding excerpt hash invalid`);
  assert(challengeCase.targetPacket.indispensableComponents.length > 0, `${challengeCase.caseId}: components missing`);
  const componentIds = challengeCase.targetPacket.indispensableComponents.map((item) => item.id);
  assert(new Set(componentIds).size === componentIds.length, `${challengeCase.caseId}: duplicate component`);
  for (const component of challengeCase.targetPacket.indispensableComponents) {
    assert(["fact-premise", "rule-comparison", "inference", "burden", "modality", "conclusion"].includes(component.kind), `${challengeCase.caseId}: component kind invalid`);
    assert(Array.isArray(component.dependsOn) && component.dependsOn.every((id) => componentIds.includes(id)), `${challengeCase.caseId}: component dependency invalid`);
  }
  const origin = challengeCase.fixtureOrigin;
  if (origin.type === "v2.8-attempt-1-retired-case") assert(origin.sourcePath === basePath && origin.sourceSha256 === sha256(baseText), `${challengeCase.caseId}: attempt-1 provenance invalid`);
  else if (origin.type === "v2.5-retired-explicit-reframe") assert(origin.sourcePath === retiredPath && origin.sourceSha256 === sha256(retiredText) && origin.lockPath === retiredLockPath && origin.lockSha256 === sha256(retiredLockText), `${challengeCase.caseId}: v2.5 provenance invalid`);
  else throw new Error(`${challengeCase.caseId}: unknown fixture origin`);
}
assert(ledger.selectedAttemptOneCaseIds.length + ledger.addedRetiredMoveIds.length === input.caseCount, "selection ledger count invalid");
console.log(JSON.stringify({ status: "passed", kind: "v2.8.2-development-input", caseCount: input.caseCount, laneCounts: input.laneCounts, inputSha256: sha256(inputText), ledgerSha256: sha256(ledgerText) }, null, 2));

