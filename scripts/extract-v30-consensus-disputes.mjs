#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V30_MODEL, V30_RUBRIC, V30_WORKFLOW, assert, canonicalJson, compoundFields, sha256 } from "./lib/v30-consensus.mjs";

const root = process.cwd();
const gateRoot = "docs/calibration/v3.0/retired-three-debate-test";
const manifestPath = `${gateRoot}/gate-manifest.json`;
const args = process.argv.slice(2);
const shouldWrite = args.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(manifestPath);
const manifest = JSON.parse(manifestText);
const summaries = [];
await mkdir(path.resolve(root, gateRoot, "dispute-packets"), { recursive: true });
for (const debate of manifest.sample.debates) {
  const inputPath = debate.path;
  const outputs = manifest.outputs[debate.debateId];
  const [inputText, passAText, passBText] = await Promise.all([read(inputPath), read(outputs.passA), read(outputs.passB)]);
  const input = JSON.parse(inputText);
  const passA = JSON.parse(passAText);
  const passB = JSON.parse(passBText);
  const aById = new Map(passA.annotations.map((item) => [item.caseId, item]));
  const bById = new Map(passB.annotations.map((item) => [item.caseId, item]));
  let disputeIndex = 0;
  const cases = [];
  for (const challengeCase of input.cases) {
    const a = aById.get(challengeCase.caseId);
    const b = bById.get(challengeCase.caseId);
    assert(a && b, `${challengeCase.caseId}: missing pass annotation`);
    const bFields = new Map(compoundFields(b));
    const disputes = [];
    for (const [fieldPath, aValue] of compoundFields(a)) {
      const bValue = bFields.get(fieldPath);
      assert(bValue !== undefined, `${challengeCase.caseId}: Pass B missing ${fieldPath}`);
      const candidateAJson = canonicalJson(aValue);
      const candidateBJson = canonicalJson(bValue);
      if (candidateAJson !== candidateBJson) {
        disputeIndex += 1;
        disputes.push({ disputeId: `${debate.debateNumber}-D${String(disputeIndex).padStart(3, "0")}`, fieldPath, candidateAJson, candidateBJson });
      }
    }
    if (disputes.length) cases.push({ caseId: challengeCase.caseId, moveId: challengeCase.moveId, lockedCase: structuredClone(challengeCase), disputes });
  }
  const disputeCount = cases.reduce((sum, item) => sum + item.disputes.length, 0);
  assert(disputeCount > 0, `${debate.debateId}: no disputes; dispute-only adjudication is unnecessary and the preregistered three-pass execution cannot be exercised`);
  const packet = {
    schemaVersion: "3.0-consensus-dispute-packet",
    workflowVersion: V30_WORKFLOW,
    rubricVersion: V30_RUBRIC,
    model: V30_MODEL,
    gateId: manifest.gateId,
    debateId: debate.debateId,
    debateNumber: debate.debateNumber,
    lane: debate.lane,
    calibrationOnly: true,
    builtFromManifestFrozenAt: manifest.frozenAt,
    source: { inputPath, inputSha256: sha256(inputText), passAPath: outputs.passA, passASha256: sha256(passAText), passBPath: outputs.passB, passBSha256: sha256(passBText) },
    caseCount: cases.length,
    disputeCount,
    cases,
    exclusions: { nondisputedFieldsIncluded: false, goldIncluded: false, legacyMaterialIncluded: false, numericalScoresIncluded: false }
  };
  const outputText = `${JSON.stringify(packet, null, 2)}\n`;
  if (shouldWrite) await writeFile(path.resolve(root, outputs.disputePacket), outputText);
  else process.stdout.write(outputText);
  summaries.push({ debateId: debate.debateId, disputedCaseCount: cases.length, disputeCount, disputePacketSha256: sha256(outputText) });
}
if (shouldWrite) console.log(JSON.stringify({ status: "written", debates: summaries }, null, 2));

