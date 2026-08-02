#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { calculateV21Ledger } from "./lib/reassessment-scoring.mjs";

const gateRoot = path.resolve("docs/calibration/v2.1/complete-gate");
const ledgersRoot = path.join(gateRoot, "ledgers");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function fail(message) {
  throw new Error(message);
}

function signature(ledger) {
  const section = ledger.sections[0];
  const sectionSide = section.sides.pro;
  const move = sectionSide.moves[0];
  return {
    topLevelKeys: Object.keys(ledger).sort(),
    sectionKeys: Object.keys(section).sort(),
    sectionSideKeys: Object.keys(sectionSide).sort(),
    moveKeys: Object.keys(move).sort(),
    passKeys: Object.keys(move.passA).sort(),
    overallSideKeys: Object.keys(ledger.overall.pro).sort()
  };
}

const [gate, reliability, validation] = await Promise.all([
  readFile(path.join(gateRoot, "gate-manifest.json"), "utf8").then(JSON.parse),
  readFile(path.join(gateRoot, "reliability-analysis.json"), "utf8").then(JSON.parse),
  readFile(path.join(gateRoot, "ledger-validation.json"), "utf8").then(JSON.parse)
]);
const expectedIds = new Set(gate.sample.debates.map((debate) => debate.debateId));
const ledgerFiles = (await readdir(ledgersRoot))
  .filter((fileName) => fileName.endsWith(".json"))
  .sort();
if (ledgerFiles.length !== expectedIds.size) {
  fail(`Expected ${expectedIds.size} complete-gate ledgers; found ${ledgerFiles.length}`);
}

const reliabilityById = new Map(
  reliability.debates.map((debate) => [debate.debateId, debate])
);
const validationById = new Map(
  validation.ledgers.map((ledger) => [ledger.debateId, ledger])
);
let uniformSignature = null;
let sectionCount = 0;
let moveCount = 0;
let triggeredMoveCount = 0;

for (const fileName of ledgerFiles) {
  const source = await readFile(path.join(ledgersRoot, fileName), "utf8");
  const ledger = JSON.parse(source);
  if (!expectedIds.delete(ledger.debateId)) {
    fail(`Unexpected or duplicate complete-gate ledger ${ledger.debateId}`);
  }
  const calculated = `${JSON.stringify(calculateV21Ledger(ledger), null, 2)}\n`;
  if (source !== calculated) fail(`${fileName}: stale calculator fields`);

  const expected = reliabilityById.get(ledger.debateId);
  if (!expected) fail(`${fileName}: missing reliability result`);
  for (const side of ["pro", "con"]) {
    if (ledger.overall[side].score !== expected.sideAgreement[side].finalOverall) {
      fail(`${fileName}: ${side} overall differs from locked reliability result`);
    }
  }

  const recorded = validationById.get(ledger.debateId);
  if (!recorded || recorded.ledgerSha256 !== sha256(source)) {
    fail(`${fileName}: ledger-validation hash mismatch`);
  }

  const currentSignature = JSON.stringify(signature(ledger));
  if (uniformSignature === null) uniformSignature = currentSignature;
  else if (currentSignature !== uniformSignature) fail(`${fileName}: schema drift`);

  sectionCount += ledger.sections.length;
  for (const section of ledger.sections) {
    for (const side of ["pro", "con"]) {
      moveCount += section.sides[side].moves.length;
      triggeredMoveCount += section.sides[side].moves.filter(
        (move) => move.requiresAdjudication
      ).length;
    }
  }
}

if (expectedIds.size) fail(`Missing ledgers: ${[...expectedIds].join(", ")}`);
for (const [label, observed, expected] of [
  ["sections", sectionCount, validation.totals.sectionCount],
  ["moves", moveCount, validation.totals.moveCount],
  ["triggered moves", triggeredMoveCount, validation.totals.triggeredMoveCount]
]) {
  if (observed !== expected) fail(`${label}: expected ${expected}; found ${observed}`);
}
if (validation.overallStatus !== "passed") fail("ledger-validation is not passed");
if (gate.decision.initialGate === "pending") fail("complete-gate decision is pending");

console.log(
  JSON.stringify(
    {
      ledgers: ledgerFiles.length,
      sections: sectionCount,
      moves: moveCount,
      triggeredMoves: triggeredMoveCount,
      calculatorMismatches: 0,
      schemaUniformity: "passed",
      gateDecision: gate.decision.initialGate
    },
    null,
    2
  )
);
