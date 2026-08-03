#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const directory = "docs/calibration/v2.9/development/attempt-1";
const inputPath = `${directory}/challenge-input.json`;
const ledgerPath = `${directory}/selection-ledger.json`;
const sourcePath = "docs/calibration/v2.8/development/attempt-3/challenge-input.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const [inputText, ledgerText, sourceText] = await Promise.all([
  readFile(path.resolve(root, inputPath), "utf8"),
  readFile(path.resolve(root, ledgerPath), "utf8"),
  readFile(path.resolve(root, sourcePath), "utf8"),
]);
const input = JSON.parse(inputText);
const ledger = JSON.parse(ledgerText);
assert(input.schemaVersion === "2.9-development-challenge-input" && input.workflowVersion === "Slugfester Reassessment Workflow v2.9" && input.rubricVersion === "Slugfester Reassessment Rubric v2.9", "input identity invalid");
assert(input.calibrationOnly === true && input.numericalScoresIncluded === false && input.legacyPassLabelsIncluded === false, "input scope invalid");
assert(input.caseCount === input.cases.length && input.caseCount === 25, "case count invalid");
assert(input.laneCounts.dyadic === input.cases.filter((item) => item.lane === "dyadic").length && input.laneCounts.multiSpeaker === input.cases.filter((item) => item.lane === "multi-speaker").length, "lane counts invalid");
assert(ledger.inputPath === inputPath && ledger.inputSha256 === sha256(inputText) && ledger.sourcePath === sourcePath && ledger.sourceSha256 === sha256(sourceText) && ledger.heldOutTranscriptsOpened === false, "selection ledger invalid");
assert(new Set(input.cases.map((item) => item.caseId)).size === input.caseCount, "duplicate case id");
for (const challengeCase of input.cases) {
  assert(["dyadic", "multi-speaker"].includes(challengeCase.lane), `${challengeCase.caseId}: lane invalid`);
  assert(sha256(challengeCase.sourceExcerpt) === challengeCase.sourceExcerptSha256, `${challengeCase.caseId}: excerpt hash invalid`);
  assert(challengeCase.targetPacket.indispensableComponents.length > 0, `${challengeCase.caseId}: components missing`);
  const componentIds = challengeCase.targetPacket.indispensableComponents.map((item) => item.id);
  assert(componentIds.length === new Set(componentIds).size, `${challengeCase.caseId}: duplicate component`);
  assert(challengeCase.fixtureOrigin.type === "v2.8.2-retired-development-case" && challengeCase.fixtureOrigin.sourcePath === sourcePath && challengeCase.fixtureOrigin.sourceSha256 === sha256(sourceText), `${challengeCase.caseId}: provenance invalid`);
}
console.log(JSON.stringify({ status: "passed", kind: "v2.9-development-input", caseCount: input.caseCount, laneCounts: input.laneCounts, inputSha256: sha256(inputText), ledgerSha256: sha256(ledgerText) }, null, 2));

