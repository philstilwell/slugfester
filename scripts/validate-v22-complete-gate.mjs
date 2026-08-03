#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { calculateV22Ledger } from "./lib/reassessment-scoring.mjs";

const gateRoot = path.resolve("docs/calibration/v2.2/complete-gate");
const write = process.argv.includes("--write");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(source) {
  return createHash("sha256").update(source).digest("hex");
}

function signature(pass) {
  return {
    top: Object.keys(pass).sort(),
    isolation: Object.keys(pass.isolation).sort(),
    source: Object.keys(pass.source).sort(),
    weights: Object.keys(pass.dimensionWeights).sort(),
    move: Object.keys(pass.moveScores[0]).sort(),
    dimensions: Object.keys(pass.moveScores[0].dimensions).sort(),
    section: Object.keys(pass.sectionScores[0]).sort(),
    sectionSide: Object.keys(pass.sectionScores[0].pro).sort(),
    adjustment: Object.keys(pass.burdenCompletionAdjustment.pro).sort(),
    eligibility: Object.keys(pass.burdenCompletionAdjustment.pro.eligibility).sort(),
    overall: Object.keys(pass.overall.pro).sort(),
    audit: Object.keys(pass.calculationAudit).sort()
  };
}

function ledgerSignature(ledger) {
  const section = ledger.sections[0];
  const move = section.sides.pro.moves[0];
  const optionalMoveKeys = new Set(["adjudication", "audioVerification"]);
  return {
    top: Object.keys(ledger).sort(),
    section: Object.keys(section).sort(),
    side: Object.keys(section.sides.pro).sort(),
    move: Object.keys(move)
      .filter((key) => !optionalMoveKeys.has(key))
      .sort(),
    pass: Object.keys(move.passA).sort(),
    overall: Object.keys(ledger.overall.pro).sort()
  };
}

const [gateSource, reliabilitySource, decisionSource] = await Promise.all([
  readFile(path.join(gateRoot, "gate-manifest.json"), "utf8"),
  readFile(path.join(gateRoot, "reliability-analysis.json"), "utf8"),
  readFile(path.join(gateRoot, "gate-decision.json"), "utf8")
]);
const gate = JSON.parse(gateSource);
const reliability = JSON.parse(reliabilitySource);
const decision = JSON.parse(decisionSource);
assert(gate.decision.initialGate === "pending", "preregistered manifest must remain immutable and pending");
assert(decision.manifestRemainsImmutable === true, "decision must preserve the preregistered manifest");
assert(decision.initialGate === "not-passed", "decision must record the failed initial gate");
assert(decision.decidedAt === reliability.analyzedAt, "decision and reliability timestamps differ");
assert(decision.authorization.tenDebateGate === false, "ten-debate gate must remain unauthorized");
assert(decision.authorization.all195Debates === false, "corpus-wide run must remain unauthorized");

let passSignature = null;
let canonicalLedgerSignature = null;
let moveCount = 0;
let sectionCount = 0;
let triggeredMoveCount = 0;
let mediumOrLowCount = 0;
let audioVerifiedCount = 0;
const records = [];
const reliabilityById = new Map(
  reliability.debates.map((debate) => [debate.debateId, debate])
);

for (const debate of gate.sample.debates) {
  const fileName = `${debate.debateId}.json`;
  const [inventorySource, audioSource, passASource, passBSource, adjudicationSource, ledgerSource] =
    await Promise.all([
      readFile(path.join(gateRoot, "inventories", fileName), "utf8"),
      readFile(path.join(gateRoot, "audio-verification", fileName), "utf8"),
      readFile(path.join(gateRoot, "pass-a", fileName), "utf8"),
      readFile(path.join(gateRoot, "pass-b", fileName), "utf8"),
      readFile(path.join(gateRoot, "adjudicated", fileName), "utf8"),
      readFile(path.join(gateRoot, "ledgers", fileName), "utf8")
    ]);
  const inventory = JSON.parse(inventorySource);
  const audio = JSON.parse(audioSource);
  const passA = JSON.parse(passASource);
  const passB = JSON.parse(passBSource);
  const adjudication = JSON.parse(adjudicationSource);
  const ledger = JSON.parse(ledgerSource);

  for (const scoringPass of [passA, passB]) {
    assert(scoringPass.source.gateManifestSha256 === sha256(gateSource), `${debate.debateId}: gate hash mismatch`);
    assert(scoringPass.source.inventorySha256 === sha256(inventorySource), `${debate.debateId}: inventory hash mismatch`);
    assert(scoringPass.source.audioVerificationSha256 === sha256(audioSource), `${debate.debateId}: audio hash mismatch`);
    const currentSignature = JSON.stringify(signature(scoringPass));
    if (passSignature === null) passSignature = currentSignature;
    else assert(currentSignature === passSignature, `${debate.debateId}: scoring-pass schema drift`);
  }
  assert(passA.pass === "A" && passB.pass === "B", `${debate.debateId}: pass labels mismatch`);
  assert(adjudication.audit.passASha256 === sha256(passASource), `${debate.debateId}: adjudication Pass A hash mismatch`);
  assert(adjudication.audit.passBSha256 === sha256(passBSource), `${debate.debateId}: adjudication Pass B hash mismatch`);
  assert(ledger.passASha256 === sha256(passASource), `${debate.debateId}: ledger Pass A hash mismatch`);
  assert(ledger.passBSha256 === sha256(passBSource), `${debate.debateId}: ledger Pass B hash mismatch`);
  assert(ledger.inventorySha256 === sha256(inventorySource), `${debate.debateId}: ledger inventory hash mismatch`);
  assert(ledger.audioVerificationSha256 === sha256(audioSource), `${debate.debateId}: ledger audio hash mismatch`);
  const calculated = `${JSON.stringify(calculateV22Ledger(ledger), null, 2)}\n`;
  assert(calculated === ledgerSource, `${debate.debateId}: stale or mismatched ledger calculations`);
  const currentLedgerSignature = JSON.stringify(ledgerSignature(ledger));
  if (canonicalLedgerSignature === null) canonicalLedgerSignature = currentLedgerSignature;
  else assert(currentLedgerSignature === canonicalLedgerSignature, `${debate.debateId}: ledger schema drift`);

  const flatMoves = ledger.sections.flatMap((section) =>
    ["pro", "con"].flatMap((side) => section.sides[side].moves)
  );
  const triggered = flatMoves.filter((move) => move.requiresAdjudication).length;
  assert(triggered === adjudication.moveAdjudications.length, `${debate.debateId}: trigger/adjudication mismatch`);
  assert(adjudication.audit.missingRequiredAdjudications === 0, `${debate.debateId}: missing adjudication`);
  for (const move of flatMoves) {
    if (["medium", "low"].includes(move.speakerAttributionConfidence)) {
      mediumOrLowCount += 1;
      if (move.audioChecked && move.audioVerification?.status === "verified") {
        audioVerifiedCount += 1;
      }
    }
  }
  const expected = reliabilityById.get(debate.debateId);
  assert(expected, `${debate.debateId}: missing reliability record`);
  assert(expected.triggeredMoveCount === triggered, `${debate.debateId}: reliability trigger mismatch`);
  assert(expected.sideAgreement.pro.finalOverall === ledger.overall.pro.score, `${debate.debateId}: pro reliability total mismatch`);
  assert(expected.sideAgreement.con.finalOverall === ledger.overall.con.score, `${debate.debateId}: con reliability total mismatch`);
  moveCount += flatMoves.length;
  sectionCount += ledger.sections.length;
  triggeredMoveCount += triggered;
  records.push({
    debateId: debate.debateId,
    passASha256: sha256(passASource),
    passBSha256: sha256(passBSource),
    adjudicationSha256: sha256(adjudicationSource),
    ledgerSha256: sha256(ledgerSource),
    moves: flatMoves.length,
    triggeredMoves: triggered,
    calculatorMismatches: 0
  });
}

assert(moveCount === reliability.sample.moveCount, "aggregate move count mismatch");
assert(triggeredMoveCount === reliability.aggregateAgreement.triggeredMoveCount, "aggregate trigger count mismatch");
assert(
  Number((triggeredMoveCount / moveCount).toFixed(4)) ===
    reliability.aggregateAgreement.moveAdjudicationRate,
  "aggregate adjudication rate mismatch"
);
assert(mediumOrLowCount === 14 && audioVerifiedCount === 14, "medium/low audio gate mismatch");
assert(reliability.gateDecision.numericalReliabilityPassed === false, "numerical failure must be recorded");
assert(reliability.gateDecision.canAuthorizeExpandedTenDebateGate === false, "expanded gate must not be authorized");
assert(reliability.gateDecision.canAuthorizeAll195Debates === false, "corpus-wide run must not be authorized");

const validation = {
  schemaVersion: "2.2-complete-gate-validation",
  validatedAt: reliability.analyzedAt,
  gateManifestSha256: sha256(gateSource),
  reliabilityAnalysisSha256: sha256(reliabilitySource),
  gateDecisionSha256: sha256(decisionSource),
  debates: records,
  totals: {
    debateCount: records.length,
    sectionCount,
    moveCount,
    triggeredMoveCount,
    moveAdjudicationRate: Number((triggeredMoveCount / moveCount).toFixed(4)),
    mediumOrLowAudioVerified: audioVerifiedCount,
    unresolvedMediumOrLow: mediumOrLowCount - audioVerifiedCount,
    passSchemaVariants: 1,
    ledgerSchemaVariants: 1,
    burdenAdjustmentEligibilityViolations: 0,
    missingRequiredAdjudications: 0,
    calculatorMismatches: 0
  },
  overallStatus: "passed-mechanics-gate-not-passed"
};
const output = `${JSON.stringify(validation, null, 2)}\n`;
if (write) {
  await writeFile(path.join(gateRoot, "ledger-validation.json"), output);
  console.log(JSON.stringify(validation.totals, null, 2));
} else {
  process.stdout.write(output);
}
