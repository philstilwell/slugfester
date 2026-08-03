#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const workspaceRoot = path.resolve(".");
const gateRoot = path.join(workspaceRoot, "docs", "calibration", "v2.2", "complete-gate");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(source) {
  return createHash("sha256").update(source).digest("hex");
}

async function readSource(filePath) {
  return readFile(filePath);
}

function moves(inventory) {
  return inventory.sections.flatMap((section) =>
    section.moves.map((move) => ({ sectionId: section.id, move }))
  );
}

const gate = JSON.parse(await readFile(path.join(gateRoot, "gate-manifest.json"), "utf8"));
let moveCount = 0;
let mediumOrLowCount = 0;
let correctionCount = 0;

for (const debate of gate.sample.debates) {
  const sourceInventoryPath = path.join(workspaceRoot, debate.sourceInventory);
  const inventoryPath = path.join(gateRoot, "inventories", `${debate.debateId}.json`);
  const auditPath = path.join(gateRoot, "audio-verification", `${debate.debateId}.json`);
  const [sourceInventorySource, inventorySource, auditSource] = await Promise.all([
    readFile(sourceInventoryPath, "utf8"),
    readFile(inventoryPath, "utf8"),
    readFile(auditPath, "utf8")
  ]);
  const sourceInventory = JSON.parse(sourceInventorySource);
  const inventory = JSON.parse(inventorySource);
  const audit = JSON.parse(auditSource);

  assert(inventory.schemaVersion === "2.2-argument-inventory", `${debate.debateId}: inventory schema`);
  assert(inventory.workflowVersion === gate.workflowVersion, `${debate.debateId}: workflow mismatch`);
  assert(inventory.rubricVersion === gate.rubricVersion, `${debate.debateId}: rubric mismatch`);
  assert(inventory.debateId === debate.debateId, `${debate.debateId}: inventory ID mismatch`);
  assert(inventory.debateNumber === debate.number, `${debate.debateId}: inventory number mismatch`);
  assert(inventory.controlledRerun.sourceInventory === debate.sourceInventory, `${debate.debateId}: source inventory path mismatch`);
  assert(inventory.controlledRerun.sourceInventorySha256 === sha256(sourceInventorySource), `${debate.debateId}: source inventory hash mismatch`);
  assert(inventory.source.audioVerificationSha256 === sha256(auditSource), `${debate.debateId}: audio audit hash mismatch`);
  assert(audit.debateId === debate.debateId && audit.videoId === debate.videoId, `${debate.debateId}: audio audit identity mismatch`);
  assert(audit.totals.unresolved === 0 && audit.totals.verificationRate === 1, `${debate.debateId}: unresolved audio verification`);

  assert(JSON.stringify(inventory.burdens) === JSON.stringify(sourceInventory.burdens), `${debate.debateId}: burdens changed`);
  assert(inventory.sections.length === sourceInventory.sections.length, `${debate.debateId}: section count changed`);
  for (let index = 0; index < inventory.sections.length; index += 1) {
    const before = sourceInventory.sections[index];
    const after = inventory.sections[index];
    for (const key of ["id", "title", "weight", "weightRationale"]) {
      assert(JSON.stringify(after[key]) === JSON.stringify(before[key]), `${debate.debateId}: section ${before.id} ${key} changed`);
    }
  }

  const sourceMoves = moves(sourceInventory);
  const currentMoves = moves(inventory);
  assert(currentMoves.length === sourceMoves.length, `${debate.debateId}: move count changed`);
  const auditByMoveId = new Map(audit.moves.map((move) => [move.moveId, move]));
  for (let index = 0; index < currentMoves.length; index += 1) {
    const before = sourceMoves[index];
    const after = currentMoves[index];
    assert(after.sectionId === before.sectionId, `${debate.debateId}: ${before.move.id} section changed`);
    for (const key of ["id", "side", "importance"]) {
      assert(after.move[key] === before.move[key], `${debate.debateId}: ${before.move.id} ${key} changed`);
    }
    assert(after.move.sourceSpan.startMs === before.move.sourceSpan.startMs, `${debate.debateId}: ${before.move.id} start changed`);
    if (before.move.id !== "M23") {
      assert(after.move.sourceSpan.endMs === before.move.sourceSpan.endMs, `${debate.debateId}: ${before.move.id} end changed`);
      assert((after.move.excerpt ?? after.move.captionExcerpt) === (before.move.excerpt ?? before.move.captionExcerpt), `${debate.debateId}: ${before.move.id} excerpt changed`);
    } else {
      assert(after.move.sourceSpan.endMs === 6726910, `${debate.debateId}: M23 repaired end mismatch`);
      correctionCount += 1;
    }
    if (before.move.id === "D05-M022") {
      assert(after.move.speaker === "Unidentified audience members", `${debate.debateId}: D05-M022 speaker not repaired`);
      correctionCount += 1;
    } else {
      assert(after.move.speaker === before.move.speaker, `${debate.debateId}: ${before.move.id} speaker changed`);
    }
    if (["medium", "low"].includes(before.move.speakerAttributionConfidence)) {
      mediumOrLowCount += 1;
      assert(after.move.audioChecked === true, `${debate.debateId}: ${before.move.id} audioChecked is false`);
      assert(after.move.audioVerification?.status === "verified", `${debate.debateId}: ${before.move.id} not verified`);
      const auditMove = auditByMoveId.get(before.move.id);
      assert(auditMove?.status === "verified", `${debate.debateId}: ${before.move.id} missing audit record`);
      assert(auditMove.resolvedSpeaker === after.move.speaker, `${debate.debateId}: ${before.move.id} speaker-resolution mismatch`);
    }
    moveCount += 1;
  }

  for (const reference of audit.speakerReferences) {
    assert(reference.sha256 === sha256(await readSource(path.join(workspaceRoot, reference.localPath))), `${debate.debateId}: reference hash mismatch for ${reference.speaker}`);
  }
  assert(audit.sourceAudio.sha256 === sha256(await readSource(path.join(workspaceRoot, audit.sourceAudio.localPath))), `${debate.debateId}: source audio hash mismatch`);
  for (const move of audit.moves) {
    assert(move.clip.sha256 === sha256(await readSource(path.join(workspaceRoot, move.clip.localPath))), `${debate.debateId}: ${move.moveId} clip hash mismatch`);
    assert(move.transcript.sha256 === sha256(await readSource(path.join(workspaceRoot, move.transcript.localPath))), `${debate.debateId}: ${move.moveId} transcript hash mismatch`);
  }
}

assert(mediumOrLowCount === 14, `Expected 14 medium/low moves; found ${mediumOrLowCount}`);
assert(correctionCount === 2, `Expected two source-QA corrections; found ${correctionCount}`);

console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: gate.sample.debates.length,
      moves: moveCount,
      mediumOrLowAudioVerified: mediumOrLowCount,
      unresolved: 0,
      sourceQaCorrections: correctionCount,
      controlledInventoryInvariants: "passed",
      rawArtifactHashes: "passed"
    },
    null,
    2
  )
);
