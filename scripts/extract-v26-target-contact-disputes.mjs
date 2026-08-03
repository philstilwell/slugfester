#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const gateRoot = path.resolve("docs/calibration/v2.5/held-out-gate");
const output = path.resolve("docs/calibration/v2.6/development/v2.5-target-contact-disputes.json");
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function equal(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
async function load(file) { const source = await readFile(file, "utf8"); return { source, hash: sha256(source), json: JSON.parse(source) }; }

const gate = JSON.parse(await readFile(path.join(gateRoot, "gate-manifest.json"), "utf8"));
const cases = [];
let componentContactDisagreementCount = 0;
let coverageDisagreementCount = 0;
let targetRelationDisagreementCount = 0;
for (const debate of gate.sample.debates) {
  const name = `${debate.debateId}.json`;
  const files = {
    inventory: `docs/calibration/v2.5/held-out-gate/inventories/${name}`,
    passA: `docs/calibration/v2.5/held-out-gate/pass-a/${name}`,
    passB: `docs/calibration/v2.5/held-out-gate/pass-b/${name}`,
    lock: `docs/calibration/v2.5/held-out-gate/locks/${name}`,
  };
  const [inventory, passA, passB, lock] = await Promise.all(Object.values(files).map((file) => load(path.resolve(file))));
  const moveById = new Map(inventory.json.moves.map((item) => [item.moveId, item]));
  const bById = new Map(passB.json.annotations.map((item) => [item.moveId, item]));
  const finalById = new Map(lock.json.annotations.map((item) => [item.moveId, item]));
  for (const left of passA.json.annotations.filter((item) => item.interactionMode === "responsive")) {
    const right = bById.get(left.moveId); const final = finalById.get(left.moveId); const move = moveById.get(left.moveId);
    const leftContacts = new Map(left.coveragePrimitives.componentContacts.map((item) => [item.componentId, item.contact]));
    const rightContacts = new Map(right.coveragePrimitives.componentContacts.map((item) => [item.componentId, item.contact]));
    const disputedComponents = (move.targetPacket?.indispensableComponents ?? []).map((item) => item.id).filter((id) => leftContacts.get(id) !== rightContacts.get(id));
    const coverageDisagreement = left.coveragePrimitives.derivedTargetCoverage !== right.coveragePrimitives.derivedTargetCoverage;
    const targetRelationDisagreement = left.coveragePrimitives.targetPreserved !== right.coveragePrimitives.targetPreserved;
    if (disputedComponents.length === 0 && !coverageDisagreement && !targetRelationDisagreement) continue;
    componentContactDisagreementCount += disputedComponents.length;
    coverageDisagreementCount += Number(coverageDisagreement);
    targetRelationDisagreementCount += Number(targetRelationDisagreement);
    cases.push({
      caseId: `v26-dev-${debate.number}-${move.moveId}`,
      debateId: debate.debateId,
      debateNumber: debate.number,
      moveId: move.moveId,
      speaker: move.speaker,
      sourceSpan: move.sourceSpan,
      sourceExcerpt: move.sourceExcerpt,
      sourceExcerptSha256: move.sourceExcerptSha256,
      targetPacketV25: move.targetPacket,
      provenance: {
        inventoryPath: files.inventory, inventorySha256: inventory.hash,
        passAPath: files.passA, passASha256: passA.hash,
        passBPath: files.passB, passBSha256: passB.hash,
        lockPath: files.lock, lockSha256: lock.hash,
      },
      disagreements: { componentIds: disputedComponents, coverage: coverageDisagreement, targetRelation: targetRelationDisagreement },
      passA: { coveragePrimitives: left.coveragePrimitives, coverageRationale: left.coverageRationale },
      passB: { coveragePrimitives: right.coveragePrimitives, coverageRationale: right.coverageRationale },
      v25Lock: { coveragePrimitives: final.coveragePrimitives, coverageRationale: final.coverageRationale },
    });
  }
}
cases.sort((a, b) => Number(a.debateNumber) - Number(b.debateNumber) || a.sourceSpan.startMs - b.sourceSpan.startMs);
const artifact = {
  schemaVersion: "2.6-v2.5-target-contact-dispute-source",
  sourceGateId: gate.gateId,
  heldOutEligible: false,
  retiredDebates: gate.sample.debates.map((item) => item.debateId),
  cases,
  audit: { caseCount: cases.length, componentContactDisagreementCount, coverageDisagreementCount, targetRelationDisagreementCount },
};
if (!equal(artifact.audit, { caseCount: 8, componentContactDisagreementCount: 10, coverageDisagreementCount: 6, targetRelationDisagreementCount: 3 })) throw new Error(`unexpected v2.5 dispute counts: ${JSON.stringify(artifact.audit)}`);
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ status: "written", output: path.relative(process.cwd(), output), ...artifact.audit }, null, 2));
