#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const workspaceRoot = path.resolve(".");
const gateRoot = path.join(workspaceRoot, "docs", "calibration", "v2.3", "three-debate-gate");

function sha256(source) {
  return createHash("sha256").update(source).digest("hex");
}

function relative(filePath) {
  return path.relative(workspaceRoot, filePath).split(path.sep).join("/");
}

const gateSource = await readFile(path.join(gateRoot, "gate-manifest.json"), "utf8");
const gate = JSON.parse(gateSource);
await mkdir(path.join(gateRoot, "inventories"), { recursive: true });

const results = [];
for (const debate of gate.sample.debates) {
  const sourceInventoryPath = path.join(workspaceRoot, debate.sourceInventory);
  const sourceAudioPath = path.join(workspaceRoot, debate.sourceAudioVerification);
  const [sourceInventorySource, sourceAudioSource] = await Promise.all([
    readFile(sourceInventoryPath, "utf8"),
    readFile(sourceAudioPath, "utf8")
  ]);
  const sourceInventory = JSON.parse(sourceInventorySource);
  const inventory = structuredClone(sourceInventory);
  inventory.schemaVersion = "2.3-argument-inventory";
  inventory.workflowVersion = gate.workflowVersion;
  inventory.rubricVersion = gate.rubricVersion;
  inventory.gateId = gate.gateId;
  inventory.controlledRerun = {
    sourceInventory: debate.sourceInventory,
    sourceInventorySha256: sha256(sourceInventorySource),
    sourceAudioVerification: debate.sourceAudioVerification,
    sourceAudioVerificationSha256: sha256(sourceAudioSource),
    unchanged: [
      "motion",
      "side labels",
      "burdens",
      "sections",
      "section weights",
      "move IDs",
      "move sides",
      "move importance",
      "source spans",
      "speaker-attribution resolutions"
    ],
    paidTranscriptionCalls: 0,
    reuseReason: "All v2.2 transcript and audio-verification artifacts are local and hash-verifiable."
  };
  inventory.source.audioVerification = debate.sourceAudioVerification;
  inventory.source.audioVerificationSha256 = sha256(sourceAudioSource);

  const outputPath = path.join(gateRoot, "inventories", `${debate.debateId}.json`);
  const output = `${JSON.stringify(inventory, null, 2)}\n`;
  await writeFile(outputPath, output);
  results.push({
    debateId: debate.debateId,
    inventoryPath: relative(outputPath),
    inventorySha256: sha256(output),
    moves: inventory.sections.reduce((total, section) => total + section.moves.length, 0)
  });
}

console.log(JSON.stringify({ status: "written", paidTranscriptionCalls: 0, debates: results }, null, 2));
