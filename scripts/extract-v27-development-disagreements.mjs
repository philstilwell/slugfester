#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("docs/calibration/v2.6/held-out-gate");
const output = path.resolve("docs/calibration/v2.7/development/v2.6-disagreement-source.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const load = async (file) => { const source = await readFile(file, "utf8"); return { source, hash: sha256(source), json: JSON.parse(source) }; };

const gate = JSON.parse(await readFile(path.join(root, "gate-manifest.json"), "utf8"));
const counts = { targetRelation: 0, coverage: 0, defectType: 0, targetImpact: 0, diagnostic: 0, componentContact: 0, componentOperation: 0 };
const cases = [];
for (const debate of gate.sample.debates) {
  const name = `${debate.debateId}.json`;
  const files = { inventory: `docs/calibration/v2.6/held-out-gate/inventories/${name}`, passA: `docs/calibration/v2.6/held-out-gate/pass-a/${name}`, passB: `docs/calibration/v2.6/held-out-gate/pass-b/${name}`, lock: `docs/calibration/v2.6/held-out-gate/locks/${name}` };
  const [inventory, passA, passB, lock] = await Promise.all(Object.values(files).map((file) => load(path.resolve(file))));
  const moveById = new Map(inventory.json.moves.map((item) => [item.moveId, item])); const bById = new Map(passB.json.annotations.map((item) => [item.moveId, item])); const finalById = new Map(lock.json.annotations.map((item) => [item.moveId, item]));
  for (const left of passA.json.annotations) {
    const right = bById.get(left.moveId); const final = finalById.get(left.moveId); const move = moveById.get(left.moveId); const fields = [];
    if (left.coveragePrimitives.targetRelation !== right.coveragePrimitives.targetRelation) { fields.push("target-relation"); counts.targetRelation += 1; }
    if (left.coveragePrimitives.derivedTargetCoverage !== right.coveragePrimitives.derivedTargetCoverage) { fields.push("coverage"); counts.coverage += 1; }
    if (left.diagnosticPrimitives.defectType !== right.diagnosticPrimitives.defectType) { fields.push("defect-type"); counts.defectType += 1; }
    if (left.diagnosticPrimitives.targetImpactExplicit !== right.diagnosticPrimitives.targetImpactExplicit) { fields.push("target-impact"); counts.targetImpact += 1; }
    if (left.diagnosticPrimitives.derivedDiagnostic !== right.diagnosticPrimitives.derivedDiagnostic) { fields.push("diagnostic"); counts.diagnostic += 1; }
    const componentDisagreements = [];
    if (move.interactionMode === "responsive" && left.coveragePrimitives.targetRelation === "preserved" && right.coveragePrimitives.targetRelation === "preserved") {
      const leftOps = new Map(left.coveragePrimitives.componentOperations.map((item) => [item.componentId, item.operation])); const rightOps = new Map(right.coveragePrimitives.componentOperations.map((item) => [item.componentId, item.operation]));
      for (const component of move.targetPacket.indispensableComponents) {
        const leftOperation = leftOps.get(component.id); const rightOperation = rightOps.get(component.id); const contactDisagreement = (leftOperation !== null) !== (rightOperation !== null); const operationDisagreement = leftOperation !== rightOperation;
        if (contactDisagreement) counts.componentContact += 1; if (operationDisagreement) counts.componentOperation += 1;
        if (contactDisagreement || operationDisagreement) componentDisagreements.push({ componentId: component.id, contactDisagreement, operationDisagreement });
      }
    }
    if (fields.length === 0 && componentDisagreements.length === 0) continue;
    cases.push({
      caseId: `v27-dev-${debate.number}-${move.moveId}`,
      debateId: debate.debateId,
      debateNumber: debate.number,
      move,
      provenance: { inventoryPath: files.inventory, inventorySha256: inventory.hash, passAPath: files.passA, passASha256: passA.hash, passBPath: files.passB, passBSha256: passB.hash, lockPath: files.lock, lockSha256: lock.hash },
      disagreements: { fields, componentDisagreements },
      passA: { coveragePrimitives: left.coveragePrimitives, diagnosticPrimitives: left.diagnosticPrimitives, coverageRationale: left.coverageRationale, mechanismRationale: left.mechanismRationale },
      passB: { coveragePrimitives: right.coveragePrimitives, diagnosticPrimitives: right.diagnosticPrimitives, coverageRationale: right.coverageRationale, mechanismRationale: right.mechanismRationale },
      v26Lock: { coveragePrimitives: final.coveragePrimitives, diagnosticPrimitives: final.diagnosticPrimitives, coverageRationale: final.coverageRationale, mechanismRationale: final.mechanismRationale },
    });
  }
}
cases.sort((left, right) => Number(left.debateNumber) - Number(right.debateNumber) || left.move.sourceSpan.startMs - right.move.sourceSpan.startMs);
const artifact = { schemaVersion: "2.7-v2.6-disagreement-source", sourceGateId: gate.gateId, heldOutEligible: false, retiredDebates: gate.sample.debates.map((item) => item.debateId), cases, audit: { caseCount: cases.length, ...counts } };
const expected = { caseCount: 15, targetRelation: 3, coverage: 5, defectType: 9, targetImpact: 7, diagnostic: 7, componentContact: 4, componentOperation: 8 };
if (!equal(artifact.audit, expected)) throw new Error(`unexpected disagreement counts: ${JSON.stringify(artifact.audit)}`);
await mkdir(path.dirname(output), { recursive: true }); await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ status: "written", output: path.relative(process.cwd(), output), ...artifact.audit }, null, 2));
