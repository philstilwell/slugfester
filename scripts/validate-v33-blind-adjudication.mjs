#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  applyCompoundField, assert, compoundFields, sha256, validateAnnotation, validateBlindAdjudication
} from "./lib/v33-blind-bundles.mjs";

const [adjudicationPath, packetPath, modelKey, passAPath, inputPath] = process.argv.slice(2);
assert(adjudicationPath && packetPath && ["terra", "sol"].includes(modelKey) && passAPath && inputPath, "usage: validate-v33-blind-adjudication <adjudication> <packet> <terra|sol> <v32-pass-a> <input>");
const root = process.cwd();
const read = (file) => readFile(path.resolve(root, file), "utf8");
const [adjudicationText, packetText, passAText, inputText] = await Promise.all([read(adjudicationPath), read(packetPath), read(passAPath), read(inputPath)]);
const adjudication = JSON.parse(adjudicationText), packet = JSON.parse(packetText), passA = JSON.parse(passAText), input = JSON.parse(inputText);
const decisions = validateBlindAdjudication(adjudication, packet, modelKey);
const decisionByKey = new Map(decisions.map((item) => [`${item.caseId}::${item.fieldPath}`, item]));
const aById = new Map(passA.annotations.map((item) => [item.caseId, item]));
let reconstructedFieldCount = 0;
for (const challengeCase of input.cases) {
  const annotation = structuredClone(aById.get(challengeCase.caseId));
  for (const [fieldPath] of compoundFields(annotation)) {
    const decision = decisionByKey.get(`${challengeCase.caseId}::${fieldPath}`);
    if (decision) applyCompoundField(annotation, fieldPath, decision.compound);
  }
  annotation.rationale = "The v3.3 invariant check reconstructs this complete annotation from blind bundled decisions plus mechanically retained unrouted agreements.";
  validateAnnotation(annotation, challengeCase, `${packet.debateId}.${modelKey}.${challengeCase.caseId}`);
  reconstructedFieldCount += compoundFields(annotation).length;
}
assert(decisions.length === packet.decisionCount, "validated decision count mismatch");
console.log(JSON.stringify({ status: "passed", modelKey, debateId: packet.debateId, bundleCount: packet.bundleCount, decisionCount: decisions.length, reconstructedFieldCount, adjudicationSha256: sha256(adjudicationText), packetSha256: sha256(packetText), modelSchemaOrInvariantRetries: 0 }, null, 2));
