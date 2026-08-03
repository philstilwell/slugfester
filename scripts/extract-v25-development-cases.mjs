#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("docs/calibration/v2.4/held-out-gate");
const output = path.resolve("docs/calibration/v2.5/development/v2.4-disputed-cases.json");
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }

const gateSource = await readFile(path.join(root, "gate-manifest.json"), "utf8");
const gate = JSON.parse(gateSource);
const cases = [];
const sourceFiles = [];
let disputedFieldCount = 0;

for (const debate of gate.sample.debates) {
  const name = `${debate.debateId}.json`;
  const paths = {
    inventory: path.join(root, "inventories", name),
    passA: path.join(root, "pass-a", name),
    passB: path.join(root, "pass-b", name),
    lock: path.join(root, "locks", name),
  };
  const sources = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, file]) => [key, await readFile(file, "utf8")])));
  const inventory = JSON.parse(sources.inventory); const a = JSON.parse(sources.passA); const b = JSON.parse(sources.passB); const lock = JSON.parse(sources.lock);
  const moves = new Map(inventory.moves.map((item) => [item.moveId, item]));
  const byB = new Map(b.annotations.map((item) => [item.moveId, item])); const byLock = new Map(lock.annotations.map((item) => [item.moveId, item]));
  sourceFiles.push(...Object.entries(paths).map(([kind, file]) => ({ kind, path: path.relative(process.cwd(), file), sha256: sha256(sources[kind]) })));
  for (const left of a.annotations) {
    const right = byB.get(left.moveId); const final = byLock.get(left.moveId); const fields = [];
    if (left.targetCoverage !== right.targetCoverage) fields.push("targetCoverage");
    if (left.mechanismFlags.diagnostic !== right.mechanismFlags.diagnostic) fields.push("diagnostic");
    if (left.mechanismFlags.reframe !== right.mechanismFlags.reframe) fields.push("reframe");
    if (left.burdenRelation !== right.burdenRelation) fields.push("burdenRelation");
    if (fields.length === 0) continue;
    disputedFieldCount += fields.length;
    const move = moves.get(left.moveId);
    cases.push({
      caseId: `V24-DISPUTE-${String(cases.length + 1).padStart(2, "0")}`,
      debateId: debate.debateId,
      debateNumber: inventory.debateNumber,
      moveId: move.moveId,
      side: move.side,
      speaker: move.speaker,
      timestamp: move.timestamp,
      sourceSpan: move.sourceSpan,
      sourceExcerpt: move.sourceExcerpt,
      interactionMode: move.interactionMode,
      targetPacket: move.targetPacket,
      burdenIds: move.burdenIds,
      burdenDefinitions: inventory.burdens.filter((burden) => move.burdenIds.includes(burden.id)),
      disputedFields: fields,
      passA: { targetCoverage: left.targetCoverage, diagnostic: left.mechanismFlags.diagnostic, reframe: left.mechanismFlags.reframe, burdenRelation: left.burdenRelation, rationales: { coverage: left.coverageRationale, mechanism: left.mechanismRationale, burden: left.burdenRationale } },
      passB: { targetCoverage: right.targetCoverage, diagnostic: right.mechanismFlags.diagnostic, reframe: right.mechanismFlags.reframe, burdenRelation: right.burdenRelation, rationales: { coverage: right.coverageRationale, mechanism: right.mechanismRationale, burden: right.burdenRationale } },
      locked: { targetCoverage: final.targetCoverage, diagnostic: final.diagnostic, reframe: final.reframe, burdenRelation: final.burdenRelation, rationales: { coverage: final.coverageRationale, mechanism: final.mechanismRationale, burden: final.burdenRationale } }
    });
  }
}
if (disputedFieldCount !== 24) throw new Error(`Expected 24 disputed fields, found ${disputedFieldCount}`);
if (cases.length !== 15) throw new Error(`Expected 15 disputed moves, found ${cases.length}`);
const artifact = { schemaVersion: "2.5-v2.4-disputed-development-source", heldOutEligible: false, generatedAt: new Date().toISOString(), sourceGateManifest: { path: path.relative(process.cwd(), path.join(root, "gate-manifest.json")), sha256: sha256(gateSource) }, sourceFiles, caseCount: cases.length, disputedFieldCount, cases };
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ status: "written", caseCount: cases.length, disputedFieldCount, output: path.relative(process.cwd(), output) }, null, 2));
