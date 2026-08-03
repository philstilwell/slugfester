#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("docs/calibration/v2.3/three-debate-gate");
const output = path.resolve("docs/calibration/v2.4/development/v2.3-disagreements.json");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const gateSource = await readFile(path.join(root, "gate-manifest.json"), "utf8");
const gate = JSON.parse(gateSource);
const examples = [];
const sourceFiles = [];

for (const debate of gate.sample.debates) {
  const file = `${debate.debateId}.json`;
  const paths = {
    inventory: path.join(root, "inventories", file),
    classifierA: path.join(root, "classifier-a", file),
    classifierB: path.join(root, "classifier-b", file),
    lock: path.join(root, "response-locks", file),
  };
  const sources = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, filePath]) => [key, await readFile(filePath, "utf8")])));
  const inventory = JSON.parse(sources.inventory);
  const a = JSON.parse(sources.classifierA);
  const b = JSON.parse(sources.classifierB);
  const lock = JSON.parse(sources.lock);
  const moves = new Map(inventory.sections.flatMap((section) => section.moves.map((move) => [move.id, move])));
  const byA = new Map(a.classifications.map((item) => [item.moveId, item]));
  const byB = new Map(b.classifications.map((item) => [item.moveId, item]));
  const byLock = new Map(lock.classifications.map((item) => [item.moveId, item]));

  sourceFiles.push(...Object.entries(paths).map(([kind, filePath]) => ({
    kind,
    path: path.relative(process.cwd(), filePath),
    sha256: sha256(sources[kind]),
  })));

  for (const [moveId, left] of byA) {
    const right = byB.get(moveId);
    if (left.responseClass === right.responseClass) continue;
    const move = moves.get(moveId);
    const final = byLock.get(moveId);
    examples.push({
      exampleId: `V23-DISAGREEMENT-${String(examples.length + 1).padStart(2, "0")}`,
      debateId: debate.debateId,
      debateNumber: inventory.debateNumber,
      moveId,
      side: move.side,
      speaker: move.speaker,
      timestamp: move.timestamp,
      sourceSpan: move.sourceSpan,
      sourceExcerpt: move.excerpt,
      burdenIds: move.burdenIds,
      priorTargetMoveIds: {
        passA: left.targetMoveIds,
        passB: right.targetMoveIds,
        locked: final.targetMoveIds,
      },
      priorClassification: {
        passA: left.responseClass,
        passB: right.responseClass,
        locked: final.responseClass,
      },
      priorRationales: {
        passA: left.rationale,
        passB: right.rationale,
        locked: final.rationale,
      },
    });
  }
}

if (examples.length !== 32) throw new Error(`Expected 32 exact-class disagreements, found ${examples.length}`);

const artifact = {
  schemaVersion: "2.4-v2.3-development-source",
  purpose: "Development-only conversion source for the orthogonal v2.4 annotation manual and examples.",
  heldOutEligible: false,
  generatedAt: new Date().toISOString(),
  sourceGateManifest: {
    path: path.relative(process.cwd(), path.join(root, "gate-manifest.json")),
    sha256: sha256(gateSource),
  },
  sourceFiles,
  disagreementCount: examples.length,
  examples,
};

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ status: "written", output: path.relative(process.cwd(), output), disagreementCount: examples.length }, null, 2));
