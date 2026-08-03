#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
const directory = "docs/calibration/v2.9/development/attempt-2";
const inputPath = `${directory}/challenge-input.json`;
const ledgerPath = `${directory}/selection-ledger.json`;
const sourceInputPath = "docs/calibration/v2.9/development/attempt-1/challenge-input.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const [inputText, ledgerText, sourceText] = await Promise.all([readFile(path.resolve(root, inputPath), "utf8"), readFile(path.resolve(root, ledgerPath), "utf8"), readFile(path.resolve(root, sourceInputPath), "utf8")]);
const input = JSON.parse(inputText); const ledger = JSON.parse(ledgerText);
assert(input.schemaVersion === "2.9.1-development-challenge-input" && input.workflowVersion === "Slugfester Reassessment Workflow v2.9.1" && input.rubricVersion === "Slugfester Reassessment Rubric v2.9.1", "input identity invalid");
assert(input.calibrationOnly === true && input.numericalScoresIncluded === false && input.legacyPassLabelsIncluded === false, "input scope invalid");
assert(input.caseCount === 27 && input.cases.length === 27 && input.laneCounts.dyadic === 12 && input.laneCounts.multiSpeaker === 15, "case or lane count invalid");
assert(ledger.inputPath === inputPath && ledger.inputSha256 === sha256(inputText) && ledger.sourceInputPath === sourceInputPath && ledger.sourceInputSha256 === sha256(sourceText) && ledger.heldOutTranscriptsOpened === false, "ledger identity invalid");
assert(new Set(input.cases.map((item) => item.caseId)).size === input.caseCount, "duplicate case id");
for (const challengeCase of input.cases) {
  assert(["dyadic", "multi-speaker"].includes(challengeCase.lane), `${challengeCase.caseId}: lane invalid`);
  assert(sha256(challengeCase.sourceExcerpt) === challengeCase.sourceExcerptSha256, `${challengeCase.caseId}: excerpt hash invalid`);
  assert(challengeCase.targetPacket.indispensableComponents.length > 0, `${challengeCase.caseId}: components missing`);
  const ids = challengeCase.targetPacket.indispensableComponents.map((item) => item.id);
  assert(ids.length === new Set(ids).size, `${challengeCase.caseId}: duplicate component`);
  assert(challengeCase.burdenContext?.burdenPacket && challengeCase.burdenContext?.route, `${challengeCase.caseId}: burden context missing`);
  const origin = challengeCase.fixtureOrigin;
  if (origin.type === "v2.8.2-retired-development-case") assert(origin.sourceSha256, `${challengeCase.caseId}: carried provenance invalid`);
  else if (origin.type === "v2.5-retired-explicit-reframe") {
    const sourceFile = await readFile(path.resolve(root, origin.sourcePath), "utf8");
    assert(origin.sourceSha256 === sha256(sourceFile) && origin.sourceMoveId === challengeCase.moveId, `${challengeCase.caseId}: added provenance invalid`);
  } else throw new Error(`${challengeCase.caseId}: unknown provenance`);
}
console.log(JSON.stringify({ status: "passed", kind: "v2.9.1-development-input", caseCount: input.caseCount, laneCounts: input.laneCounts, inputSha256: sha256(inputText), ledgerSha256: sha256(ledgerText) }, null, 2));

