#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourcePath = "docs/calibration/v2.8/development/attempt-3/challenge-input.json";
const directory = "docs/calibration/v2.9/development/attempt-1";
const inputPath = `${directory}/challenge-input.json`;
const ledgerPath = `${directory}/selection-ledger.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceText = await readFile(path.resolve(root, sourcePath), "utf8");
const input = JSON.parse(sourceText);

input.schemaVersion = "2.9-development-challenge-input";
input.workflowVersion = "Slugfester Reassessment Workflow v2.9";
input.rubricVersion = "Slugfester Reassessment Rubric v2.9";
input.sourceGateCommit = "retired-v2.8.2-development-material-only";
for (const challengeCase of input.cases) {
  const sourceCaseId = challengeCase.caseId;
  challengeCase.caseId = challengeCase.caseId.replace("v282-dev-", "v29-dev-");
  challengeCase.fixtureOrigin = {
    type: "v2.8.2-retired-development-case",
    sourceCaseId,
    sourcePath,
    sourceSha256: sha256(sourceText),
  };
}
const inputText = `${JSON.stringify(input, null, 2)}\n`;
const ledger = {
  schemaVersion: "2.9-development-selection-ledger",
  createdAt: new Date().toISOString(),
  purpose: "Retired v2.8.2 cases reused under the lower-granularity v2.9 contract; no fresh held-out transcript opened.",
  selectionPolicy: [
    "Preserve the same 25 retired excerpts so semantic-contract effects are distinguishable from case-selection effects.",
    "Retain both dyadic and multi-speaker lanes and report them separately.",
    "Do not carry any v2.8 key, pass label, numerical score, or adjudication into v2.9 key construction.",
    "Use the synthetic practice fixture only as a contrastive training aid; it is not part of the measured challenge."
  ],
  sourcePath,
  sourceSha256: sha256(sourceText),
  selectedSourceCaseIds: input.cases.map((item) => item.fixtureOrigin.sourceCaseId),
  inputPath,
  inputSha256: sha256(inputText),
  heldOutTranscriptsOpened: false
};
await mkdir(path.resolve(root, directory), { recursive: true });
await Promise.all([
  writeFile(path.resolve(root, inputPath), inputText),
  writeFile(path.resolve(root, ledgerPath), `${JSON.stringify(ledger, null, 2)}\n`),
]);
console.log(JSON.stringify({ status: "written", inputPath, ledgerPath, caseCount: input.caseCount, laneCounts: input.laneCounts, inputSha256: sha256(inputText) }, null, 2));

