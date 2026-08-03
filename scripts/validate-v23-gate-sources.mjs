#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const workspaceRoot = path.resolve(".");
const gateRoot = path.join(workspaceRoot, "docs", "calibration", "v2.3", "three-debate-gate");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(source) {
  return createHash("sha256").update(source).digest("hex");
}

function flatMoves(inventory) {
  return inventory.sections.flatMap((section) =>
    section.moves.map((move) => ({ sectionId: section.id, move }))
  );
}

const gate = JSON.parse(await readFile(path.join(gateRoot, "gate-manifest.json"), "utf8"));
let moveCount = 0;
let mediumOrLowCount = 0;
let audioVerified = 0;

for (const debate of gate.sample.debates) {
  const paths = {
    sourceInventory: path.join(workspaceRoot, debate.sourceInventory),
    inventory: path.join(gateRoot, "inventories", `${debate.debateId}.json`),
    audio: path.join(workspaceRoot, debate.sourceAudioVerification)
  };
  const [beforeSource, afterSource, audioSource] = await Promise.all([
    readFile(paths.sourceInventory, "utf8"),
    readFile(paths.inventory, "utf8"),
    readFile(paths.audio, "utf8")
  ]);
  const before = JSON.parse(beforeSource);
  const after = JSON.parse(afterSource);
  const audio = JSON.parse(audioSource);
  assert(after.schemaVersion === "2.3-argument-inventory", `${debate.debateId}: inventory schema mismatch`);
  assert(after.workflowVersion === gate.workflowVersion, `${debate.debateId}: workflow mismatch`);
  assert(after.rubricVersion === gate.rubricVersion, `${debate.debateId}: rubric mismatch`);
  assert(after.gateId === gate.gateId, `${debate.debateId}: gate mismatch`);
  assert(after.controlledRerun.sourceInventorySha256 === sha256(beforeSource), `${debate.debateId}: source inventory hash mismatch`);
  assert(after.controlledRerun.sourceAudioVerificationSha256 === sha256(audioSource), `${debate.debateId}: source audio hash mismatch`);
  assert(after.controlledRerun.paidTranscriptionCalls === 0, `${debate.debateId}: unexpected paid call`);
  assert(after.source.audioVerificationSha256 === sha256(audioSource), `${debate.debateId}: audio audit hash mismatch`);
  assert(JSON.stringify(after.motion) === JSON.stringify(before.motion), `${debate.debateId}: motion changed`);
  assert(JSON.stringify(after.sides) === JSON.stringify(before.sides), `${debate.debateId}: sides changed`);
  assert(JSON.stringify(after.burdens) === JSON.stringify(before.burdens), `${debate.debateId}: burdens changed`);
  assert(after.sections.length === before.sections.length, `${debate.debateId}: section count changed`);
  for (let index = 0; index < before.sections.length; index += 1) {
    const a = before.sections[index];
    const b = after.sections[index];
    for (const key of ["id", "title", "weight", "weightRationale"]) {
      assert(JSON.stringify(a[key]) === JSON.stringify(b[key]), `${debate.debateId}: ${a.id}.${key} changed`);
    }
  }
  const beforeMoves = flatMoves(before);
  const afterMoves = flatMoves(after);
  assert(afterMoves.length === beforeMoves.length, `${debate.debateId}: move count changed`);
  for (let index = 0; index < beforeMoves.length; index += 1) {
    assert(JSON.stringify(afterMoves[index]) === JSON.stringify(beforeMoves[index]), `${debate.debateId}: ${beforeMoves[index].move.id} changed`);
    const move = afterMoves[index].move;
    if (["medium", "low"].includes(move.speakerAttributionConfidence)) {
      mediumOrLowCount += 1;
      assert(move.audioChecked === true, `${debate.debateId}: ${move.id} was not audio checked`);
      assert(move.audioVerification?.status === "verified", `${debate.debateId}: ${move.id} lacks verified status`);
      assert(move.audioVerification.sha256 === sha256(audioSource), `${debate.debateId}: ${move.id} audit hash mismatch`);
      audioVerified += 1;
    }
    moveCount += 1;
  }

  const captionRoot = path.join(workspaceRoot, ".assessment-cache", "captions", debate.videoId);
  const [transcript, events, manifestSource] = await Promise.all([
    readFile(path.join(captionRoot, "transcript.txt")),
    readFile(path.join(captionRoot, "events.json")),
    readFile(path.join(captionRoot, "manifest.json"), "utf8")
  ]);
  const captionManifest = JSON.parse(manifestSource);
  assert(after.source.transcriptSha256 === sha256(transcript), `${debate.debateId}: transcript hash mismatch`);
  assert(captionManifest.transcriptSha256 === sha256(transcript), `${debate.debateId}: caption manifest transcript mismatch`);
  assert(captionManifest.normalizedEventsSha256 === sha256(events), `${debate.debateId}: caption manifest events mismatch`);

  assert(audio.totals.unresolved === 0 && audio.totals.verificationRate === 1, `${debate.debateId}: unresolved audio audit`);
  assert(audio.sourceAudio.sha256 === sha256(await readFile(path.join(workspaceRoot, audio.sourceAudio.localPath))), `${debate.debateId}: raw source audio hash mismatch`);
  for (const reference of audio.speakerReferences) {
    assert(reference.sha256 === sha256(await readFile(path.join(workspaceRoot, reference.localPath))), `${debate.debateId}: ${reference.speaker} reference hash mismatch`);
  }
  for (const record of audio.moves) {
    assert(record.clip.sha256 === sha256(await readFile(path.join(workspaceRoot, record.clip.localPath))), `${debate.debateId}: ${record.moveId} clip hash mismatch`);
    assert(record.transcript.sha256 === sha256(await readFile(path.join(workspaceRoot, record.transcript.localPath))), `${debate.debateId}: ${record.moveId} transcript artifact hash mismatch`);
  }
}

assert(mediumOrLowCount === 14, `expected 14 medium/low moves; found ${mediumOrLowCount}`);
assert(audioVerified === mediumOrLowCount, "not every medium/low move was audio verified");
console.log(JSON.stringify({status: "passed", debates: gate.sample.debates.length, moves: moveCount, mediumOrLowAudioVerified: audioVerified, paidTranscriptionCalls: 0, controlledInventoryInvariants: "passed", localTranscriptAndRawAudioHashes: "passed"}, null, 2));
