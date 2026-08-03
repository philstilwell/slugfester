#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assert, canonicalJson, compoundFields, sameSemantic, semanticValue, sha256 } from "./lib/v31-verification.mjs";

const root = process.cwd();
const gateRoot = "docs/calibration/v3.1/retired-three-debate-test";
const shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${gateRoot}/gate-manifest.json`);
const manifest = JSON.parse(manifestText);
await mkdir(path.resolve(root, gateRoot, "semantic-disagreements"), { recursive: true });
const summaries = [];
for (const debate of manifest.sample.debates) {
  const outputs = manifest.outputs[debate.debateId];
  const [inputText, passAText, passBText] = await Promise.all([read(debate.path), read(outputs.passA), read(outputs.passB)]);
  const input = JSON.parse(inputText);
  const passA = JSON.parse(passAText);
  const passB = JSON.parse(passBText);
  const aById = new Map(passA.annotations.map((item) => [item.caseId, item]));
  const bById = new Map(passB.annotations.map((item) => [item.caseId, item]));
  const fields = [];
  for (const challengeCase of input.cases) {
    const a = aById.get(challengeCase.caseId);
    const b = bById.get(challengeCase.caseId);
    assert(a && b, `${challengeCase.caseId}: missing raw pass annotation`);
    const bFields = new Map(compoundFields(b));
    for (const [fieldPath, aValue] of compoundFields(a)) {
      const bValue = bFields.get(fieldPath);
      const semanticAgreement = sameSemantic(fieldPath, aValue, bValue);
      const exactAgreement = canonicalJson(aValue) === canonicalJson(bValue);
      fields.push({
        caseId: challengeCase.caseId, fieldPath,
        status: !semanticAgreement ? "semantic-conflict" : !exactAgreement ? "evidence-only" : "exact-agreement",
        semanticAJson: canonicalJson(semanticValue(fieldPath, aValue)), semanticBJson: canonicalJson(semanticValue(fieldPath, bValue)),
        evidenceAJson: canonicalJson(aValue.evidence), evidenceBJson: canonicalJson(bValue.evidence)
      });
    }
  }
  const counts = Object.fromEntries(["semantic-conflict", "evidence-only", "exact-agreement"].map((status) => [status, fields.filter((item) => item.status === status).length]));
  const ledger = {
    schemaVersion: "3.1-semantic-disagreement-ledger", gateId: manifest.gateId, debateId: debate.debateId, debateNumber: debate.debateNumber,
    source: { manifestSha256: sha256(manifestText), inputSha256: sha256(inputText), passASha256: sha256(passAText), passBSha256: sha256(passBText) },
    fieldCount: fields.length, counts, fields
  };
  const ledgerText = `${JSON.stringify(ledger, null, 2)}\n`;
  if (shouldWrite) await writeFile(path.resolve(root, outputs.semanticDisagreements), ledgerText);
  else process.stdout.write(ledgerText);
  summaries.push({ debateId: debate.debateId, fieldCount: fields.length, ...counts, sha256: sha256(ledgerText) });
}
if (shouldWrite) console.log(JSON.stringify({ status: "written", debates: summaries }, null, 2));
