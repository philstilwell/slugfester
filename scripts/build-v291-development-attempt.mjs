#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceDirectory = "docs/calibration/v2.9/development/attempt-1";
const directory = "docs/calibration/v2.9/development/attempt-2";
const sourceInputPath = `${sourceDirectory}/challenge-input.json`;
const inputPath = `${directory}/challenge-input.json`;
const schemaPath = `${directory}/challenge-annotation-schema.json`;
const practicePath = `${directory}/practice-fixture.json`;
const ledgerPath = `${directory}/selection-ledger.json`;
const moralInventoryPath = "docs/calibration/v2.5/held-out-gate/inventories/enoch-sampson-loeb-lutz-moral-realism-2024.json";
const freeWillInventoryPath = "docs/calibration/v2.5/held-out-gate/inventories/dennett-caruso-free-will-responsibility-2021.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const read = async (filePath) => readFile(path.resolve(root, filePath), "utf8");

await mkdir(path.resolve(root, directory), { recursive: true });
const [sourceInputText, sourceSchemaText, sourcePracticeText, moralText, freeWillText] = await Promise.all([
  read(sourceInputPath), read(`${sourceDirectory}/challenge-annotation-schema.json`), read(`${sourceDirectory}/practice-fixture.json`),
  read(moralInventoryPath), read(freeWillInventoryPath),
]);

const schema = JSON.parse(sourceSchemaText);
schema.$id = "slugfester-v2.9.1-development-challenge-pass";
schema.properties.schemaVersion.const = "2.9.1-development-challenge-pass";
schema.properties.workflowVersion.const = "Slugfester Reassessment Workflow v2.9.1";
schema.properties.rubricVersion.const = "Slugfester Reassessment Rubric v2.9.1";
schema.properties.isolation.properties.method.enum = [
  "fresh-isolated-v2.9.1-key-candidate",
  "fresh-isolated-v2.9.1-key-adjudication",
  "fresh-isolated-v2.9.1-development-challenge"
];
for (const field of ["exclusiveObjectSubstitution", "objectChangeType", "substitutionEvidence"]) {
  schema.$defs.annotation.required = schema.$defs.annotation.required.filter((item) => item !== field);
  delete schema.$defs.annotation.properties[field];
}
delete schema.properties.audit.properties.nonDefaultCounts.properties.exclusiveSubstitutions;
schema.properties.audit.properties.nonDefaultCounts.required = schema.properties.audit.properties.nonDefaultCounts.required.filter((item) => item !== "exclusiveSubstitutions");
const schemaText = `${JSON.stringify(schema, null, 2)}\n`;

const practice = JSON.parse(sourcePracticeText);
practice.schemaVersion = "2.9.1-practice-fixture";
for (const example of practice.examples) delete example.expected.exclusiveObjectSubstitution;
const formerSubstitution = practice.examples.find((item) => item.id === "practice-exclusive-substitution");
formerSubstitution.id = "practice-unaddressed-redirection";
formerSubstitution.expected.targetDisposition = "unaddressed";
delete formerSubstitution.expected.objectChangeType;
const practiceText = `${JSON.stringify(practice, null, 2)}\n`;

const input = JSON.parse(sourceInputText);
input.schemaVersion = "2.9.1-development-challenge-input";
input.workflowVersion = "Slugfester Reassessment Workflow v2.9.1";
input.rubricVersion = "Slugfester Reassessment Rubric v2.9.1";
input.sourceGateCommit = "retired-v2.8.2-plus-v2.5-explicit-reframe-material-only";
for (const challengeCase of input.cases) challengeCase.caseId = challengeCase.caseId.replace("v29-dev-", "v291-dev-");

const retiredCase = (inventoryText, inventoryPath, moveId, caseId, lane, debateNumber) => {
  const inventory = JSON.parse(inventoryText);
  const move = inventory.moves.find((item) => item.moveId === moveId);
  if (!move) throw new Error(`missing retired move ${moveId}`);
  const route = inventory.burdenRoutes.find((item) => item.id === move.burdenPacket.primaryRouteId);
  if (!route) throw new Error(`missing route for ${moveId}`);
  return {
    caseId,
    lane,
    debateId: inventory.debateId,
    debateNumber,
    moveId: move.moveId,
    side: move.side,
    speaker: move.speaker,
    sourceExcerpt: move.sourceExcerpt,
    sourceExcerptSha256: move.sourceExcerptSha256,
    targetPacket: move.targetPacket,
    burdenContext: { burdenPacket: move.burdenPacket, route },
    fixtureOrigin: {
      type: "v2.5-retired-explicit-reframe",
      sourcePath: inventoryPath,
      sourceSha256: sha256(inventoryText),
      sourceMoveId: moveId,
    },
  };
};
input.cases.push(
  retiredCase(moralText, moralInventoryPath, "184-move-09", "v291-dev-184-09", "multi-speaker", "184"),
  retiredCase(freeWillText, freeWillInventoryPath, "m08-con-q2-responsive-control-insufficient", "v291-dev-185-08", "dyadic", "185"),
);
input.caseCount = input.cases.length;
input.laneCounts = {
  dyadic: input.cases.filter((item) => item.lane === "dyadic").length,
  multiSpeaker: input.cases.filter((item) => item.lane === "multi-speaker").length,
};
const inputText = `${JSON.stringify(input, null, 2)}\n`;
const ledger = {
  schemaVersion: "2.9.1-development-selection-ledger",
  createdAt: new Date().toISOString(),
  purpose: "Attempt-2 repair of the failed v2.9 key preflight using retired material only.",
  selectionPolicy: [
    "Carry the same 25 retired v2.9 cases forward without any label or key.",
    "Add two previously used real excerpts whose language expressly rejects one framing and states a replacement question.",
    "Remove exclusive substitution from the gated contract because target noncontact already derives nonanswer.",
    "Retain both dyadic and multi-speaker lanes and open no fresh held-out transcript."
  ],
  sourceInputPath,
  sourceInputSha256: sha256(sourceInputText),
  addedRetiredMoves: [
    { sourcePath: moralInventoryPath, sourceSha256: sha256(moralText), moveId: "184-move-09", caseId: "v291-dev-184-09" },
    { sourcePath: freeWillInventoryPath, sourceSha256: sha256(freeWillText), moveId: "m08-con-q2-responsive-control-insufficient", caseId: "v291-dev-185-08" }
  ],
  inputPath,
  inputSha256: sha256(inputText),
  heldOutTranscriptsOpened: false
};
await Promise.all([
  writeFile(path.resolve(root, schemaPath), schemaText),
  writeFile(path.resolve(root, practicePath), practiceText),
  writeFile(path.resolve(root, inputPath), inputText),
  writeFile(path.resolve(root, ledgerPath), `${JSON.stringify(ledger, null, 2)}\n`),
]);
console.log(JSON.stringify({ status: "written", attempt: 2, caseCount: input.caseCount, laneCounts: input.laneCounts, inputSha256: sha256(inputText), schemaSha256: sha256(schemaText), practiceSha256: sha256(practiceText) }, null, 2));
