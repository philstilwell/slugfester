#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  V21_ADJUSTMENT_DISAGREEMENT_THRESHOLD,
  V21_DIMENSION_DISAGREEMENT_THRESHOLD,
  V21_MOVE_DISAGREEMENT_THRESHOLD,
  calculateV22Ledger,
  scoreDimensions
} from "./lib/reassessment-scoring.mjs";

const gateRoot = path.resolve("docs/calibration/v2.2/complete-gate");
const write = process.argv.includes("--write");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(source) {
  return createHash("sha256").update(source).digest("hex");
}

function timestampFromMs(milliseconds) {
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1_000);
  const millis = milliseconds % 1_000;
  const base = [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  return millis ? `${base}.${String(millis).padStart(3, "0")}` : base;
}

function moveRequiresAdjudication(passA, passB) {
  const maxDimensionDelta = Math.max(
    ...Object.keys(passA.dimensions).map((key) =>
      Math.abs(passA.dimensions[key] - passB.dimensions[key])
    )
  );
  const scoreDelta = Math.abs(passA.moveScore - passB.moveScore);
  return (
    maxDimensionDelta > V21_DIMENSION_DISAGREEMENT_THRESHOLD ||
    scoreDelta > V21_MOVE_DISAGREEMENT_THRESHOLD
  );
}

const gate = JSON.parse(await readFile(path.join(gateRoot, "gate-manifest.json"), "utf8"));
await mkdir(path.join(gateRoot, "ledgers"), { recursive: true });
const results = [];

for (const debate of gate.sample.debates) {
  const fileName = `${debate.debateId}.json`;
  const paths = {
    inventory: path.join(gateRoot, "inventories", fileName),
    audio: path.join(gateRoot, "audio-verification", fileName),
    passA: path.join(gateRoot, "pass-a", fileName),
    passB: path.join(gateRoot, "pass-b", fileName),
    adjudication: path.join(gateRoot, "adjudicated", fileName),
    ledger: path.join(gateRoot, "ledgers", fileName)
  };
  const [inventorySource, audioSource, passASource, passBSource, adjudicationSource] =
    await Promise.all([
      readFile(paths.inventory, "utf8"),
      readFile(paths.audio, "utf8"),
      readFile(paths.passA, "utf8"),
      readFile(paths.passB, "utf8"),
      readFile(paths.adjudication, "utf8")
    ]);
  const inventory = JSON.parse(inventorySource);
  const passA = JSON.parse(passASource);
  const passB = JSON.parse(passBSource);
  const adjudication = JSON.parse(adjudicationSource);
  assert(passA.pass === "A" && passB.pass === "B", `${debate.debateId}: pass labels are invalid`);
  assert(passA.debateId === debate.debateId && passB.debateId === debate.debateId, `${debate.debateId}: pass debate mismatch`);
  assert(adjudication.debateId === debate.debateId, `${debate.debateId}: adjudication mismatch`);

  const passAMoves = new Map(passA.moveScores.map((move) => [move.moveId, move]));
  const passBMoves = new Map(passB.moveScores.map((move) => [move.moveId, move]));
  const adjudicatedMoves = new Map(
    adjudication.moveAdjudications.map((move) => [move.moveId, move])
  );
  const expectedTriggered = [];
  for (const [moveId, a] of passAMoves) {
    const b = passBMoves.get(moveId);
    assert(b, `${debate.debateId}: ${moveId} missing from Pass B`);
    if (moveRequiresAdjudication(a, b)) expectedTriggered.push(moveId);
  }
  assert(
    JSON.stringify([...adjudicatedMoves.keys()].sort()) === JSON.stringify(expectedTriggered.sort()),
    `${debate.debateId}: adjudication move set differs from triggered move set`
  );
  for (const move of adjudicatedMoves.values()) {
    assert(move.dimensions && move.rationale && move.responseClass, `${debate.debateId}: ${move.moveId} adjudication is incomplete`);
    assert(scoreDimensions(move.dimensions) === move.moveScore, `${debate.debateId}: ${move.moveId} adjudication score mismatch`);
  }

  const sections = inventory.sections.map((section) => ({
    id: section.id,
    title: section.title,
    weightPercent: section.weight,
    weightRationale: section.weightRationale,
    sides: Object.fromEntries(
      ["pro", "con"].map((side) => [
        side,
        {
          moves: section.moves
            .filter((move) => move.side === side)
            .map((move) => {
              const a = passAMoves.get(move.id);
              const b = passBMoves.get(move.id);
              const resolution = adjudicatedMoves.get(move.id);
              const sourceExcerpt = move.excerpt ?? move.captionExcerpt;
              return {
                id: move.id,
                speaker: move.speaker,
                timestamp: move.timestamp,
                sourceSpan: {
                  start: move.timestamp,
                  end: timestampFromMs(move.sourceSpan.endMs)
                },
                sourceExcerpt,
                quoteKind: /condensation/.test(move.quoteKind) ? "condensation" : "quote",
                speakerAttributionConfidence: move.speakerAttributionConfidence,
                audioChecked: move.audioChecked,
                ...(move.audioVerification
                  ? { audioVerification: structuredClone(move.audioVerification) }
                  : {}),
                burdenIds: move.burdenIds,
                respondsToIds: move.respondsToIds,
                importance: move.importance,
                passA: {
                  dimensions: a.dimensions,
                  rationale: a.rationale,
                  responseClass: a.responseClass
                },
                passB: {
                  dimensions: b.dimensions,
                  rationale: b.rationale,
                  responseClass: b.responseClass
                },
                ...(resolution
                  ? {
                      adjudication: {
                        dimensions: resolution.dimensions,
                        rationale: resolution.rationale,
                        responseClass: resolution.responseClass
                      }
                    }
                  : {})
              };
            })
        }
      ])
    )
  }));

  const burdenCompletionAdjustment = {};
  for (const side of ["pro", "con"]) {
    const passAAdjustment = passA.burdenCompletionAdjustment[side];
    const passBAdjustment = passB.burdenCompletionAdjustment[side];
    const delta = Math.abs(passAAdjustment.value - passBAdjustment.value);
    const needsAdjudication = delta > V21_ADJUSTMENT_DISAGREEMENT_THRESHOLD;
    const adjustmentResolution = adjudication.burdenAdjustmentAdjudications?.[side] ?? null;
    assert(
      Boolean(adjustmentResolution) === needsAdjudication,
      `${debate.debateId}: ${side} burden-adjustment adjudication trigger mismatch`
    );
    burdenCompletionAdjustment[side] = {
      passA: structuredClone(passAAdjustment),
      passB: structuredClone(passBAdjustment),
      ...(adjustmentResolution ? { adjudication: structuredClone(adjustmentResolution) } : {})
    };
  }

  const ledgerInput = {
    schemaVersion: "2.2",
    workflowVersion: gate.workflowVersion,
    rubricVersion: gate.rubricVersion,
    calibrationOnly: true,
    debateId: debate.debateId,
    debateNumber: debate.number,
    model: "5.6 Sol",
    sourceManifest: inventory.source.sourceManifest,
    blindPacketSha256: inventory.source.blindPacketSha256,
    inventorySha256: sha256(inventorySource),
    audioVerificationSha256: sha256(audioSource),
    passASha256: sha256(passASource),
    passBSha256: sha256(passBSource),
    assessmentPasses: {
      passA: {
        model: passA.assessmentModel,
        completedAt: passA.completedAt,
        contextIsolation: passA.isolation.statement,
        schemaValidated: true
      },
      passB: {
        model: passB.assessmentModel,
        completedAt: passB.completedAt,
        contextIsolation: passB.isolation.statement,
        schemaValidated: true
      }
    },
    passIndependence: {
      level: "separate-isolated-5.6-Sol-model-tasks",
      passAAccessedPassB: false,
      passBAccessedPassA: false,
      legacyAssessmentAccessed: false
    },
    burdens: inventory.burdens,
    sectionWeightsLockedBeforeScoring: true,
    moveImportanceLockedBeforeScoring: true,
    sections,
    burdenCompletionAdjustment,
    tagReview: { performedAfterScoring: true, candidates: [] },
    aiExtensionReview: { performedAfterAssessment: true, noveltyMap: [] }
  };
  const calculated = calculateV22Ledger(ledgerInput);
  const output = `${JSON.stringify(calculated, null, 2)}\n`;
  if (write) await writeFile(paths.ledger, output);
  else process.stdout.write(output);
  results.push({
    debateId: debate.debateId,
    moves: passA.moveScores.length,
    triggeredMoves: expectedTriggered.length,
    pro: calculated.overall.pro.score,
    con: calculated.overall.con.score,
    ledgerSha256: sha256(output)
  });
}

if (write) console.log(JSON.stringify({ status: "written", ledgers: results }, null, 2));
