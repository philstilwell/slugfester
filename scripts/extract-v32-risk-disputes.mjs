#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V32_PASS_MODELS, V32_RUBRIC, V32_WORKFLOW, disputedFields, sha256
} from "./lib/v32-risk-adjudication.mjs";

const root = process.cwd();
const gateRoot = "docs/calibration/v3.2/retired-three-debate-test";
const shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${gateRoot}/gate-manifest.json`);
const manifest = JSON.parse(manifestText);
const summaries = [];
for (const debate of manifest.sample.debates) {
  const outputs = manifest.outputs[debate.debateId];
  const [inputText, passAText, passBText] = await Promise.all([read(debate.path), read(outputs.passA), read(outputs.passB)]);
  const input = JSON.parse(inputText), passA = JSON.parse(passAText), passB = JSON.parse(passBText);
  const aById = new Map(passA.annotations.map((item) => [item.caseId, item]));
  const bById = new Map(passB.annotations.map((item) => [item.caseId, item]));
  let serial = 0;
  const cases = [];
  const counts = { "semantic-conflict": 0, "high-risk-agreement": 0, "dependency-companion": 0 };
  for (const challengeCase of input.cases) {
    const fields = disputedFields(challengeCase, aById.get(challengeCase.caseId), bById.get(challengeCase.caseId)).map((field) => {
      counts[field.triggerKind] += 1;
      serial += 1;
      return { disputeId: `${debate.debateId}-risk-${String(serial).padStart(3, "0")}`, caseId: challengeCase.caseId, ...field };
    });
    if (fields.length) cases.push({ caseId: challengeCase.caseId, moveId: challengeCase.moveId, lockedCase: challengeCase, fields });
  }
  const packet = {
    schemaVersion: "3.2-risk-dispute-packet", workflowVersion: V32_WORKFLOW, rubricVersion: V32_RUBRIC,
    gateId: manifest.gateId, debateId: debate.debateId, debateNumber: debate.debateNumber, lane: debate.lane, calibrationOnly: true,
    models: { passA: V32_PASS_MODELS.A, passB: V32_PASS_MODELS.B }, createdAt: new Date().toISOString(),
    source: { inputPath: "input.json", inputSha256: sha256(inputText), passASha256: sha256(passAText), passBSha256: sha256(passBText), manifestSha256: sha256(manifestText) },
    caseCount: cases.length, fieldCount: serial, counts, cases,
    exclusions: { goldIncluded: false, completePassRationalesIncluded: false, unflaggedFieldsIncluded: false, legacyMaterialIncluded: false, numericalScoresIncluded: false }
  };
  const text = `${JSON.stringify(packet, null, 2)}\n`;
  if (shouldWrite) await writeFile(path.resolve(root, outputs.disputePacket), text);
  summaries.push({ debateId: debate.debateId, fieldCount: serial, counts, sha256: sha256(text) });
}
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", manifestSha256: sha256(manifestText), debates: summaries }, null, 2));
