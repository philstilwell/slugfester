#!/usr/bin/env node

import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("docs/calibration/v2.4/held-out-gate");
const write = process.argv.includes("--write");
function fixed(value) { return Number(value.toFixed(4)); }
function assert(condition, message) { if (!condition) throw new Error(message); }
async function exists(file) { try { await access(file); return true; } catch { return false; } }
function kappa(left, right, labels) {
  const count = left.length;
  const observed = left.filter((value, index) => value === right[index]).length / count;
  const expected = labels.reduce((sum, label) => sum + (left.filter((value) => value === label).length / count) * (right.filter((value) => value === label).length / count), 0);
  if (expected === 1) return observed === 1 ? 1 : 0;
  return fixed((observed - expected) / (1 - expected));
}
function gateMinimum(minimum, observed) { return { minimum, observed, status: observed >= minimum ? "pass" : "fail" }; }
function gateMaximum(maximum, observed) { return { maximum, observed, status: observed <= maximum ? "pass" : "fail" }; }

const gate = JSON.parse(await readFile(path.join(root, "gate-manifest.json"), "utf8"));
const coverageLabels = ["not-applicable", "full", "partial", "relevant-nonanswer", "substitution"];
const burdenLabels = ["completes", "advances-central", "advances-sub-burden", "topical-peripheral", "unadopted-or-irrelevant"];
const aggregate = { coverageA: [], coverageB: [], diagnosticA: [], diagnosticB: [], reframeA: [], reframeB: [], burdenA: [], burdenB: [], tupleA: [], tupleB: [], finalDiagnostic: [], finalReframe: [] };
const diagnostics = {
  coverageDisagreementPairs: {},
  burdenDisagreementPairs: {},
  diagnosticDisagreementDirections: { "false -> true": 0, "true -> false": 0 },
  reframeDisagreementDirections: { "false -> true": 0, "true -> false": 0 },
  finalCoverageDistribution: Object.fromEntries(coverageLabels.map((label) => [label, 0])),
  finalBurdenDistribution: Object.fromEntries(burdenLabels.map((label) => [label, 0])),
};
const debates = [];
let inventoryAtomicityViolations = 0;
let targetPacketViolations = 0;
let unresolvedSpeakerAttributions = 0;
let unresolvedAnnotationDisagreements = 0;
let movesMissingFinalLock = 0;
let prohibitedInputContamination = 0;
let sourceHashMismatches = 0;
let moveCount = 0;

for (const debate of gate.sample.debates) {
  const name = `${debate.debateId}.json`;
  const paths = {
    inventory: path.join(root, "inventories", name),
    review: path.join(root, "inventory-reviews", name),
    passA: path.join(root, "pass-a", name),
    passB: path.join(root, "pass-b", name),
    lock: path.join(root, "locks", name),
  };
  for (const [kind, file] of Object.entries(paths)) assert(await exists(file), `${debate.debateId}: missing ${kind}`);
  const [inventory, review, a, b, lock] = await Promise.all(Object.values(paths).map((file) => readFile(file, "utf8").then(JSON.parse)));
  const bById = new Map(b.annotations.map((item) => [item.moveId, item]));
  const lockById = new Map(lock.annotations.map((item) => [item.moveId, item]));
  const counts = { coverage: 0, diagnostic: 0, reframe: 0, burden: 0, tuple: 0 };
  for (const left of a.annotations) {
    const right = bById.get(left.moveId); const final = lockById.get(left.moveId);
    assert(right && final, `${debate.debateId}: incomplete annotation sources`);
    const leftTuple = JSON.stringify([left.targetCoverage, left.mechanismFlags.diagnostic, left.mechanismFlags.reframe, left.burdenRelation]);
    const rightTuple = JSON.stringify([right.targetCoverage, right.mechanismFlags.diagnostic, right.mechanismFlags.reframe, right.burdenRelation]);
    aggregate.coverageA.push(left.targetCoverage); aggregate.coverageB.push(right.targetCoverage);
    aggregate.diagnosticA.push(left.mechanismFlags.diagnostic); aggregate.diagnosticB.push(right.mechanismFlags.diagnostic);
    aggregate.reframeA.push(left.mechanismFlags.reframe); aggregate.reframeB.push(right.mechanismFlags.reframe);
    aggregate.burdenA.push(left.burdenRelation); aggregate.burdenB.push(right.burdenRelation);
    aggregate.tupleA.push(leftTuple); aggregate.tupleB.push(rightTuple);
    aggregate.finalDiagnostic.push(final.diagnostic); aggregate.finalReframe.push(final.reframe);
    diagnostics.finalCoverageDistribution[final.targetCoverage] += 1;
    diagnostics.finalBurdenDistribution[final.burdenRelation] += 1;
    if (left.targetCoverage === right.targetCoverage) counts.coverage += 1;
    else {
      const pair = [left.targetCoverage, right.targetCoverage].sort().join(" <-> ");
      diagnostics.coverageDisagreementPairs[pair] = (diagnostics.coverageDisagreementPairs[pair] ?? 0) + 1;
    }
    if (left.mechanismFlags.diagnostic === right.mechanismFlags.diagnostic) counts.diagnostic += 1;
    else diagnostics.diagnosticDisagreementDirections[`${left.mechanismFlags.diagnostic} -> ${right.mechanismFlags.diagnostic}`] += 1;
    if (left.mechanismFlags.reframe === right.mechanismFlags.reframe) counts.reframe += 1;
    else diagnostics.reframeDisagreementDirections[`${left.mechanismFlags.reframe} -> ${right.mechanismFlags.reframe}`] += 1;
    if (left.burdenRelation === right.burdenRelation) counts.burden += 1;
    else {
      const pair = [left.burdenRelation, right.burdenRelation].sort().join(" <-> ");
      diagnostics.burdenDisagreementPairs[pair] = (diagnostics.burdenDisagreementPairs[pair] ?? 0) + 1;
    }
    if (leftTuple === rightTuple) counts.tuple += 1;
  }
  moveCount += inventory.moves.length;
  inventoryAtomicityViolations += inventory.audit.atomicityViolations + review.audit.atomicityViolations;
  targetPacketViolations += inventory.audit.targetPacketViolations + review.audit.targetPacketViolations;
  unresolvedSpeakerAttributions += inventory.audit.unresolvedSpeakerAttributions + review.audit.speakerAttributionViolations;
  unresolvedAnnotationDisagreements += lock.audit.unresolvedDisagreements;
  movesMissingFinalLock += lock.audit.movesMissingFinalLock;
  prohibitedInputContamination += Number(a.isolation.contaminationDetected) + Number(b.isolation.contaminationDetected);
  sourceHashMismatches += Number(a.source.inventorySha256 !== b.source.inventorySha256 || a.source.transcriptSha256 !== b.source.transcriptSha256 || a.source.eventsSha256 !== b.source.eventsSha256 || a.source.manifestSha256 !== b.source.manifestSha256);
  debates.push({
    debateNumber: debate.number,
    debateId: debate.debateId,
    moveCount: a.annotations.length,
    agreement: Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, fixed(value / a.annotations.length)])),
    fieldDisagreementCount: lock.audit.fieldDisagreementCount,
  });
}

assert(moveCount === gate.hardGates.moveCount, `expected ${gate.hardGates.moveCount} moves, found ${moveCount}`);
const agreement = {
  moveCount,
  targetCoverage: { exactAgreement: fixed(aggregate.coverageA.filter((value, index) => value === aggregate.coverageB[index]).length / moveCount), cohensKappa: kappa(aggregate.coverageA, aggregate.coverageB, coverageLabels) },
  diagnosticFlag: { exactAgreement: fixed(aggregate.diagnosticA.filter((value, index) => value === aggregate.diagnosticB[index]).length / moveCount), adjudicatedPositiveCount: aggregate.finalDiagnostic.filter(Boolean).length },
  reframeFlag: { exactAgreement: fixed(aggregate.reframeA.filter((value, index) => value === aggregate.reframeB[index]).length / moveCount), adjudicatedPositiveCount: aggregate.finalReframe.filter(Boolean).length },
  burdenRelation: { exactAgreement: fixed(aggregate.burdenA.filter((value, index) => value === aggregate.burdenB[index]).length / moveCount), cohensKappa: kappa(aggregate.burdenA, aggregate.burdenB, burdenLabels) },
  exactTupleAgreement: fixed(aggregate.tupleA.filter((value, index) => value === aggregate.tupleB[index]).length / moveCount),
};
const gates = {
  coverageExactAgreement: gateMinimum(gate.annotationGates.coverageExactAgreementMinimum, agreement.targetCoverage.exactAgreement),
  coverageKappa: gateMinimum(gate.annotationGates.coverageKappaMinimum, agreement.targetCoverage.cohensKappa),
  diagnosticExactAgreement: gateMinimum(gate.annotationGates.diagnosticFlagExactAgreementMinimum, agreement.diagnosticFlag.exactAgreement),
  diagnosticPositivePower: gateMinimum(gate.annotationGates.mechanismPositiveCountMinimum, agreement.diagnosticFlag.adjudicatedPositiveCount),
  reframeExactAgreement: gateMinimum(gate.annotationGates.reframeFlagExactAgreementMinimum, agreement.reframeFlag.exactAgreement),
  reframePositivePower: gateMinimum(gate.annotationGates.mechanismPositiveCountMinimum, agreement.reframeFlag.adjudicatedPositiveCount),
  burdenExactAgreement: gateMinimum(gate.annotationGates.burdenRelationExactAgreementMinimum, agreement.burdenRelation.exactAgreement),
  burdenKappa: gateMinimum(gate.annotationGates.burdenRelationKappaMinimum, agreement.burdenRelation.cohensKappa),
  exactTupleAgreement: gateMinimum(gate.annotationGates.exactTupleAgreementMinimum, agreement.exactTupleAgreement),
};
const hardGates = {
  moveCount: { required: gate.hardGates.moveCount, observed: moveCount, status: moveCount === gate.hardGates.moveCount ? "pass" : "fail" },
  inventoryAtomicityViolations: gateMaximum(gate.hardGates.inventoryAtomicityViolationsMaximum, inventoryAtomicityViolations),
  targetPacketViolations: gateMaximum(gate.hardGates.targetPacketViolationsMaximum, targetPacketViolations),
  sourceHashMismatches: gateMaximum(gate.hardGates.sourceHashMismatchesMaximum, sourceHashMismatches),
  unresolvedSpeakerAttributions: gateMaximum(gate.hardGates.unresolvedSpeakerAttributionsMaximum, unresolvedSpeakerAttributions),
  unresolvedAnnotationDisagreements: gateMaximum(gate.hardGates.unresolvedAnnotationDisagreementsMaximum, unresolvedAnnotationDisagreements),
  movesMissingFinalLock: gateMaximum(gate.hardGates.movesMissingFinalLockMaximum, movesMissingFinalLock),
  schemaVariants: gateMaximum(gate.hardGates.schemaVariantsMaximum, new Set(["2.4-annotation-pass"]).size),
  prohibitedInputContamination: gateMaximum(gate.hardGates.prohibitedInputContaminationMaximum, prohibitedInputContamination),
};
const annotationGatesPassed = Object.values(gates).every((entry) => entry.status === "pass");
const hardGatesPassed = Object.values(hardGates).every((entry) => entry.status === "pass");
const passed = annotationGatesPassed && hardGatesPassed;
const analyzedAt = new Date().toISOString();
const report = {
  schemaVersion: "2.4-held-out-annotation-gate-reliability",
  workflowVersion: gate.workflowVersion,
  rubricVersion: gate.rubricVersion,
  gateId: gate.gateId,
  model: "5.6 Sol",
  calibrationOnly: true,
  analyzedAt,
  sourceQa: { localTranscriptChains: 3, paidTranscriptionCalls: 0, inventoriesIndependentlyReviewed: 3 },
  independence: { inventoryBuilders: "fresh-score-blind-per-debate", inventoryReviewers: "different-fresh-per-debate", annotationPasses: "two-different-fresh-isolated-tasks-per-debate", adjudication: "fresh-no-scores", legacyAssessmentAccessed: false },
  debates,
  agreement,
  diagnostics: {
    ...diagnostics,
    finalMechanismPositiveCounts: { diagnostic: agreement.diagnosticFlag.adjudicatedPositiveCount, reframe: agreement.reframeFlag.adjudicatedPositiveCount },
    fieldDisagreementCount: debates.reduce((sum, debate) => sum + debate.fieldDisagreementCount, 0),
    tupleDisagreementCount: moveCount - aggregate.tupleA.filter((value, index) => value === aggregate.tupleB[index]).length,
  },
  gates,
  hardGates,
  decision: {
    annotationGatesPassed,
    hardGatesPassed,
    heldOutAnnotationGate: passed ? "passed" : "not-passed",
    completeV24ThreeDebateNumericalGate: passed ? "authorized-for-preregistration" : "not-authorized",
    tenDebateGate: "not-authorized",
    corpusWide: "not-ready",
    reason: passed ? "Every preregistered orthogonal annotation and hard gate passed." : "At least one preregistered annotation or hard gate failed; the stop rule blocks numerical scoring and composition.",
  },
};
const decision = {
  schemaVersion: "2.4-held-out-gate-decision",
  gateId: gate.gateId,
  decidedAt: analyzedAt,
  manifestRemainsImmutable: true,
  heldOutAnnotationGate: report.decision.heldOutAnnotationGate,
  authorization: { completeV24ThreeDebateNumericalGatePreregistration: passed, tenDebateGate: false, all195Debates: false },
  reason: report.decision.reason,
};
if (write) {
  await Promise.all([
    writeFile(path.join(root, "reliability-analysis.json"), `${JSON.stringify(report, null, 2)}\n`),
    writeFile(path.join(root, "gate-decision.json"), `${JSON.stringify(decision, null, 2)}\n`),
  ]);
  console.log(JSON.stringify({ status: "written", agreement, annotationGatesPassed, hardGatesPassed, heldOutAnnotationGate: report.decision.heldOutAnnotationGate }, null, 2));
} else process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
