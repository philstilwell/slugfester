#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { BURDEN_LABELS, COVERAGE_LABELS, canonicalBridgeSet } from "./lib/v25-derived-annotations.mjs";

const root = path.resolve("docs/calibration/v2.5/held-out-gate");
const write = process.argv.includes("--write");
function assert(condition, message) { if (!condition) throw new Error(message); }
function fixed(value) { return Number(value.toFixed(4)); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
async function exists(file) { try { await access(file); return true; } catch { return false; } }
async function load(file) { const source = await readFile(file, "utf8"); return { source, json: path.extname(file) === ".json" ? JSON.parse(source) : null, hash: sha256(source) }; }
function ratio(count, denominator) { return denominator === 0 ? 1 : fixed(count / denominator); }
function kappa(left, right, labels) {
  const count = left.length;
  const observed = left.filter((value, index) => value === right[index]).length / count;
  const expected = labels.reduce((sum, label) => sum + (left.filter((value) => value === label).length / count) * (right.filter((value) => value === label).length / count), 0);
  if (expected === 1) return observed === 1 ? 1 : 0;
  return fixed((observed - expected) / (1 - expected));
}
function gateMinimum(minimum, observed) { return { minimum, observed, status: observed >= minimum ? "pass" : "fail" }; }
function gateMaximum(maximum, observed) { return { maximum, observed, status: observed <= maximum ? "pass" : "fail" }; }
function direction(left, right) { return `${String(left)} -> ${String(right)}`; }
function increment(target, key) { target[key] = (target[key] ?? 0) + 1; }

const gateLoad = await load(path.join(root, "gate-manifest.json"));
const gate = gateLoad.json;
const aggregate = {
  componentContactAgreementCount: 0,
  componentContactJudgmentCount: 0,
  targetPreservationA: [], targetPreservationB: [],
  defectTypeA: [], defectTypeB: [],
  targetImpactA: [], targetImpactB: [],
  malformedA: [], malformedB: [],
  replacementA: [], replacementB: [],
  bridgeSetA: [], bridgeSetB: [],
  coverageA: [], coverageB: [],
  diagnosticA: [], diagnosticB: [],
  reframeA: [], reframeB: [],
  burdenA: [], burdenB: [],
  tupleA: [], tupleB: [],
  finalDiagnostic: [], finalReframe: [],
};
const diagnostics = {
  componentContactDisagreementPairs: {},
  targetPreservationDisagreementDirections: {},
  defectTypeDisagreementPairs: {},
  targetImpactDisagreementDirections: {},
  malformedDemandDisagreementDirections: {},
  replacementDemandDisagreementDirections: {},
  contactedBridgeSetDisagreementCount: 0,
  coverageDisagreementPairs: {},
  burdenDisagreementPairs: {},
  diagnosticDisagreementDirections: {},
  reframeDisagreementDirections: {},
  finalCoverageDistribution: Object.fromEntries(COVERAGE_LABELS.map((label) => [label, 0])),
  finalBurdenDistribution: Object.fromEntries(BURDEN_LABELS.map((label) => [label, 0])),
};
const debates = [];
let moveCount = 0;
let inventoryAtomicityViolations = 0;
let targetPacketViolations = 0;
let burdenRouteViolations = 0;
let sourceHashMismatches = 0;
let evidenceOffsetErrors = 0;
let derivationMismatches = 0;
let unresolvedSpeakerAttributions = 0;
let unresolvedAnnotationDisagreements = 0;
let movesMissingFinalLock = 0;
let prohibitedInputContamination = 0;
let primitiveDisagreementCount = 0;
let triggeredThirdReviewCount = 0;
const passSchemaVersions = new Set();

for (const debate of gate.sample.debates) {
  const name = `${debate.debateId}.json`;
  const files = {
    draft: path.join(root, "draft-inventories", name),
    reviewed: path.join(root, "reviewed-inventories", name),
    inventory: path.join(root, "inventories", name),
    firstReview: path.join(root, "inventory-reviews", name),
    thirdReview: path.join(root, "third-reviews", name),
    passA: path.join(root, "pass-a", name),
    passB: path.join(root, "pass-b", name),
    lock: path.join(root, "locks", name),
    transcript: path.resolve(`.assessment-cache/captions/${debate.videoId}/transcript.txt`),
    events: path.resolve(`.assessment-cache/captions/${debate.videoId}/events.json`),
    manifest: path.resolve(`.assessment-cache/captions/${debate.videoId}/manifest.json`),
  };
  for (const kind of ["draft", "reviewed", "inventory", "firstReview", "passA", "passB", "lock", "transcript", "events", "manifest"]) assert(await exists(files[kind]), `${debate.debateId}: missing ${kind}`);
  const loadedEntries = await Promise.all(Object.entries(files).filter(([kind]) => kind !== "thirdReview").map(async ([kind, file]) => [kind, await load(file)]));
  const loaded = Object.fromEntries(loadedEntries);
  const { json: inventory } = loaded.inventory;
  const { json: review } = loaded.firstReview;
  const { json: a } = loaded.passA;
  const { json: b } = loaded.passB;
  const { json: lock } = loaded.lock;
  const thirdRequired = review.thirdReviewTrigger.required;
  let third = null;
  if (thirdRequired) {
    assert(await exists(files.thirdReview), `${debate.debateId}: triggered third review missing`);
    third = (await load(files.thirdReview)).json;
    triggeredThirdReviewCount += 1;
  } else {
    assert(!(await exists(files.thirdReview)), `${debate.debateId}: untriggered third review present`);
    assert(loaded.reviewed.hash === loaded.inventory.hash, `${debate.debateId}: untriggered final inventory differs from reviewed inventory`);
  }

  const countMismatch = (actual, claimed) => { if (actual !== claimed) sourceHashMismatches += 1; };
  countMismatch(loaded.draft.hash, review.source.draftInventorySha256);
  countMismatch(loaded.reviewed.hash, review.source.reviewedInventorySha256);
  countMismatch(loaded.transcript.hash, review.source.transcriptSha256);
  countMismatch(loaded.events.hash, review.source.eventsSha256);
  countMismatch(loaded.manifest.hash, review.source.manifestSha256);
  if (third) {
    const thirdLoad = await load(files.thirdReview);
    countMismatch(loaded.firstReview.hash, third.source.firstReviewSha256);
    countMismatch(loaded.reviewed.hash, third.source.reviewedInventorySha256);
    countMismatch(loaded.inventory.hash, third.source.finalInventorySha256);
    countMismatch(loaded.transcript.hash, third.source.transcriptSha256);
    countMismatch(loaded.events.hash, third.source.eventsSha256);
    countMismatch(loaded.manifest.hash, third.source.manifestSha256);
    assert(thirdLoad.json.debateId === debate.debateId, `${debate.debateId}: third review identity mismatch`);
  }
  for (const pass of [a, b]) {
    passSchemaVersions.add(pass.schemaVersion);
    countMismatch(loaded.inventory.hash, pass.source.inventorySha256);
    countMismatch(loaded.transcript.hash, pass.source.transcriptSha256);
    countMismatch(loaded.events.hash, pass.source.eventsSha256);
    countMismatch(loaded.manifest.hash, pass.source.manifestSha256);
    evidenceOffsetErrors += pass.audit.evidenceOffsetErrors;
    derivationMismatches += pass.audit.derivationMismatches;
    prohibitedInputContamination += Number(pass.isolation.contaminationDetected);
  }
  countMismatch(loaded.passA.hash, lock.source.passASha256);
  countMismatch(loaded.passB.hash, lock.source.passBSha256);
  countMismatch(loaded.inventory.hash, lock.source.inventorySha256);

  const bById = new Map(b.annotations.map((item) => [item.moveId, item]));
  const lockById = new Map(lock.annotations.map((item) => [item.moveId, item]));
  const inventoryById = new Map(inventory.moves.map((item) => [item.moveId, item]));
  const counts = { componentContact: 0, componentJudgments: 0, targetPreservation: 0, defectType: 0, targetImpact: 0, malformed: 0, replacement: 0, bridgeSet: 0, coverage: 0, diagnostic: 0, reframe: 0, burden: 0, tuple: 0 };
  for (const left of a.annotations) {
    const right = bById.get(left.moveId); const final = lockById.get(left.moveId); const move = inventoryById.get(left.moveId);
    assert(right && final && move, `${debate.debateId}: incomplete annotation sources`);
    const leftContacts = new Map(left.coveragePrimitives.componentContacts.map((item) => [item.componentId, item.contact]));
    const rightContacts = new Map(right.coveragePrimitives.componentContacts.map((item) => [item.componentId, item.contact]));
    for (const component of move.targetPacket?.indispensableComponents ?? []) {
      const leftValue = leftContacts.get(component.id); const rightValue = rightContacts.get(component.id);
      counts.componentJudgments += 1; aggregate.componentContactJudgmentCount += 1;
      if (leftValue === rightValue) { counts.componentContact += 1; aggregate.componentContactAgreementCount += 1; }
      else increment(diagnostics.componentContactDisagreementPairs, [leftValue, rightValue].sort().join(" <-> "));
    }
    const primitivePairs = [
      ["targetPreservation", left.coveragePrimitives.targetPreserved, right.coveragePrimitives.targetPreserved, aggregate.targetPreservationA, aggregate.targetPreservationB, diagnostics.targetPreservationDisagreementDirections],
      ["targetImpact", left.diagnosticPrimitives.targetImpactExplicit, right.diagnosticPrimitives.targetImpactExplicit, aggregate.targetImpactA, aggregate.targetImpactB, diagnostics.targetImpactDisagreementDirections],
      ["malformed", left.reframePrimitives.malformedDemandExplained, right.reframePrimitives.malformedDemandExplained, aggregate.malformedA, aggregate.malformedB, diagnostics.malformedDemandDisagreementDirections],
      ["replacement", left.reframePrimitives.replacementDemandStated, right.reframePrimitives.replacementDemandStated, aggregate.replacementA, aggregate.replacementB, diagnostics.replacementDemandDisagreementDirections],
    ];
    for (const [field, leftValue, rightValue, leftAggregate, rightAggregate, disagreementTarget] of primitivePairs) {
      leftAggregate.push(leftValue); rightAggregate.push(rightValue);
      if (leftValue === rightValue) counts[field] += 1; else increment(disagreementTarget, direction(leftValue, rightValue));
    }
    const defectLeft = left.diagnosticPrimitives.defectType; const defectRight = right.diagnosticPrimitives.defectType;
    aggregate.defectTypeA.push(defectLeft); aggregate.defectTypeB.push(defectRight);
    if (defectLeft === defectRight) counts.defectType += 1; else increment(diagnostics.defectTypeDisagreementPairs, [defectLeft, defectRight].sort().join(" <-> "));
    const bridgeLeft = canonicalBridgeSet(left.burdenPrimitives.contactedBridges); const bridgeRight = canonicalBridgeSet(right.burdenPrimitives.contactedBridges);
    aggregate.bridgeSetA.push(bridgeLeft); aggregate.bridgeSetB.push(bridgeRight);
    if (bridgeLeft === bridgeRight) counts.bridgeSet += 1; else diagnostics.contactedBridgeSetDisagreementCount += 1;
    const coverageLeft = left.coveragePrimitives.derivedTargetCoverage; const coverageRight = right.coveragePrimitives.derivedTargetCoverage;
    const diagnosticLeft = left.diagnosticPrimitives.derivedDiagnostic; const diagnosticRight = right.diagnosticPrimitives.derivedDiagnostic;
    const reframeLeft = left.reframePrimitives.derivedReframe; const reframeRight = right.reframePrimitives.derivedReframe;
    const burdenLeft = left.burdenPrimitives.derivedBurdenRelation; const burdenRight = right.burdenPrimitives.derivedBurdenRelation;
    const tupleLeft = JSON.stringify([coverageLeft, diagnosticLeft, reframeLeft, burdenLeft]); const tupleRight = JSON.stringify([coverageRight, diagnosticRight, reframeRight, burdenRight]);
    aggregate.coverageA.push(coverageLeft); aggregate.coverageB.push(coverageRight);
    aggregate.diagnosticA.push(diagnosticLeft); aggregate.diagnosticB.push(diagnosticRight);
    aggregate.reframeA.push(reframeLeft); aggregate.reframeB.push(reframeRight);
    aggregate.burdenA.push(burdenLeft); aggregate.burdenB.push(burdenRight);
    aggregate.tupleA.push(tupleLeft); aggregate.tupleB.push(tupleRight);
    aggregate.finalDiagnostic.push(final.diagnosticPrimitives.derivedDiagnostic); aggregate.finalReframe.push(final.reframePrimitives.derivedReframe);
    diagnostics.finalCoverageDistribution[final.coveragePrimitives.derivedTargetCoverage] += 1;
    diagnostics.finalBurdenDistribution[final.burdenPrimitives.derivedBurdenRelation] += 1;
    if (coverageLeft === coverageRight) counts.coverage += 1; else increment(diagnostics.coverageDisagreementPairs, [coverageLeft, coverageRight].sort().join(" <-> "));
    if (diagnosticLeft === diagnosticRight) counts.diagnostic += 1; else increment(diagnostics.diagnosticDisagreementDirections, direction(diagnosticLeft, diagnosticRight));
    if (reframeLeft === reframeRight) counts.reframe += 1; else increment(diagnostics.reframeDisagreementDirections, direction(reframeLeft, reframeRight));
    if (burdenLeft === burdenRight) counts.burden += 1; else increment(diagnostics.burdenDisagreementPairs, [burdenLeft, burdenRight].sort().join(" <-> "));
    if (tupleLeft === tupleRight) counts.tuple += 1;
  }

  moveCount += inventory.moves.length;
  inventoryAtomicityViolations += inventory.audit.atomicityViolations + review.audit.atomicityViolations + (third?.audit.atomicityViolations ?? 0);
  targetPacketViolations += inventory.audit.targetPacketViolations + review.audit.targetPacketViolations + (third?.audit.targetPacketViolations ?? 0);
  burdenRouteViolations += inventory.audit.burdenRouteViolations + review.audit.burdenRouteViolations + (third?.audit.burdenRouteViolations ?? 0);
  unresolvedSpeakerAttributions += inventory.audit.unresolvedSpeakerAttributions + review.audit.speakerAttributionViolations + (third?.audit.speakerAttributionViolations ?? 0);
  evidenceOffsetErrors += lock.audit.evidenceOffsetErrors;
  derivationMismatches += lock.audit.derivationMismatches;
  unresolvedAnnotationDisagreements += lock.audit.unresolvedDisagreements;
  movesMissingFinalLock += lock.audit.movesMissingFinalLock;
  primitiveDisagreementCount += lock.audit.primitiveDisagreementCount;
  debates.push({
    debateNumber: debate.number,
    debateId: debate.debateId,
    moveCount: a.annotations.length,
    componentContactJudgmentCount: counts.componentJudgments,
    agreement: {
      componentContactMicro: ratio(counts.componentContact, counts.componentJudgments),
      targetPreservation: ratio(counts.targetPreservation, a.annotations.length),
      defectType: ratio(counts.defectType, a.annotations.length),
      targetImpactExplicit: ratio(counts.targetImpact, a.annotations.length),
      malformedDemandExplained: ratio(counts.malformed, a.annotations.length),
      replacementDemandStated: ratio(counts.replacement, a.annotations.length),
      contactedBridgeSet: ratio(counts.bridgeSet, a.annotations.length),
      coverage: ratio(counts.coverage, a.annotations.length),
      diagnostic: ratio(counts.diagnostic, a.annotations.length),
      reframe: ratio(counts.reframe, a.annotations.length),
      burden: ratio(counts.burden, a.annotations.length),
      tuple: ratio(counts.tuple, a.annotations.length),
    },
    primitiveDisagreementCount: lock.audit.primitiveDisagreementCount,
    thirdReviewTriggered: thirdRequired,
  });
}

assert(moveCount === gate.hardGates.moveCount, `expected ${gate.hardGates.moveCount} moves, found ${moveCount}`);
const exact = (left, right) => ratio(left.filter((value, index) => value === right[index]).length, left.length);
const agreement = {
  moveCount,
  componentContact: { exactAgreement: ratio(aggregate.componentContactAgreementCount, aggregate.componentContactJudgmentCount), judgmentCount: aggregate.componentContactJudgmentCount },
  targetPreservation: { exactAgreement: exact(aggregate.targetPreservationA, aggregate.targetPreservationB) },
  defectType: { exactAgreement: exact(aggregate.defectTypeA, aggregate.defectTypeB) },
  targetImpactExplicit: { exactAgreement: exact(aggregate.targetImpactA, aggregate.targetImpactB) },
  malformedDemandExplained: { exactAgreement: exact(aggregate.malformedA, aggregate.malformedB) },
  replacementDemandStated: { exactAgreement: exact(aggregate.replacementA, aggregate.replacementB) },
  contactedBridgeSet: { exactAgreement: exact(aggregate.bridgeSetA, aggregate.bridgeSetB) },
  targetCoverage: { exactAgreement: exact(aggregate.coverageA, aggregate.coverageB), cohensKappa: kappa(aggregate.coverageA, aggregate.coverageB, COVERAGE_LABELS) },
  diagnosticFlag: { exactAgreement: exact(aggregate.diagnosticA, aggregate.diagnosticB), adjudicatedPositiveCount: aggregate.finalDiagnostic.filter(Boolean).length },
  reframeFlag: { exactAgreement: exact(aggregate.reframeA, aggregate.reframeB), adjudicatedPositiveCount: aggregate.finalReframe.filter(Boolean).length },
  burdenRelation: { exactAgreement: exact(aggregate.burdenA, aggregate.burdenB), cohensKappa: kappa(aggregate.burdenA, aggregate.burdenB, BURDEN_LABELS) },
  exactDerivedTupleAgreement: exact(aggregate.tupleA, aggregate.tupleB),
};
const gates = {
  componentContactMicroExact: gateMinimum(gate.annotationGates.componentContactMicroExactMinimum, agreement.componentContact.exactAgreement),
  targetPreservationExact: gateMinimum(gate.annotationGates.targetPreservationExactMinimum, agreement.targetPreservation.exactAgreement),
  defectTypeExact: gateMinimum(gate.annotationGates.defectTypeExactMinimum, agreement.defectType.exactAgreement),
  targetImpactExplicitExact: gateMinimum(gate.annotationGates.targetImpactExplicitExactMinimum, agreement.targetImpactExplicit.exactAgreement),
  malformedDemandExplainedExact: gateMinimum(gate.annotationGates.malformedDemandExplainedExactMinimum, agreement.malformedDemandExplained.exactAgreement),
  replacementDemandStatedExact: gateMinimum(gate.annotationGates.replacementDemandStatedExactMinimum, agreement.replacementDemandStated.exactAgreement),
  contactedBridgeSetExact: gateMinimum(gate.annotationGates.contactedBridgeSetExactMinimum, agreement.contactedBridgeSet.exactAgreement),
  coverageExactAgreement: gateMinimum(gate.annotationGates.coverageExactAgreementMinimum, agreement.targetCoverage.exactAgreement),
  coverageKappa: gateMinimum(gate.annotationGates.coverageKappaMinimum, agreement.targetCoverage.cohensKappa),
  diagnosticExactAgreement: gateMinimum(gate.annotationGates.diagnosticFlagExactAgreementMinimum, agreement.diagnosticFlag.exactAgreement),
  diagnosticPositivePower: gateMinimum(gate.annotationGates.mechanismPositiveCountMinimum, agreement.diagnosticFlag.adjudicatedPositiveCount),
  reframeExactAgreement: gateMinimum(gate.annotationGates.reframeFlagExactAgreementMinimum, agreement.reframeFlag.exactAgreement),
  reframePositivePower: gateMinimum(gate.annotationGates.mechanismPositiveCountMinimum, agreement.reframeFlag.adjudicatedPositiveCount),
  burdenExactAgreement: gateMinimum(gate.annotationGates.burdenRelationExactAgreementMinimum, agreement.burdenRelation.exactAgreement),
  burdenKappa: gateMinimum(gate.annotationGates.burdenRelationKappaMinimum, agreement.burdenRelation.cohensKappa),
  exactDerivedTupleAgreement: gateMinimum(gate.annotationGates.exactDerivedTupleAgreementMinimum, agreement.exactDerivedTupleAgreement),
};
const hardGates = {
  moveCount: { required: gate.hardGates.moveCount, observed: moveCount, status: moveCount === gate.hardGates.moveCount ? "pass" : "fail" },
  inventoryAtomicityViolations: gateMaximum(gate.hardGates.inventoryAtomicityViolationsMaximum, inventoryAtomicityViolations),
  targetPacketViolations: gateMaximum(gate.hardGates.targetPacketViolationsMaximum, targetPacketViolations),
  burdenRouteViolations: gateMaximum(gate.hardGates.burdenRouteViolationsMaximum, burdenRouteViolations),
  sourceHashMismatches: gateMaximum(gate.hardGates.sourceHashMismatchesMaximum, sourceHashMismatches),
  evidenceOffsetErrors: gateMaximum(gate.hardGates.evidenceOffsetErrorsMaximum, evidenceOffsetErrors),
  derivationMismatches: gateMaximum(gate.hardGates.derivationMismatchesMaximum, derivationMismatches),
  unresolvedSpeakerAttributions: gateMaximum(gate.hardGates.unresolvedSpeakerAttributionsMaximum, unresolvedSpeakerAttributions),
  unresolvedAnnotationDisagreements: gateMaximum(gate.hardGates.unresolvedAnnotationDisagreementsMaximum, unresolvedAnnotationDisagreements),
  movesMissingFinalLock: gateMaximum(gate.hardGates.movesMissingFinalLockMaximum, movesMissingFinalLock),
  schemaVariants: gateMaximum(gate.hardGates.schemaVariantsMaximum, passSchemaVersions.size),
  prohibitedInputContamination: gateMaximum(gate.hardGates.prohibitedInputContaminationMaximum, prohibitedInputContamination),
};
const annotationGatesPassed = Object.values(gates).every((entry) => entry.status === "pass");
const hardGatesPassed = Object.values(hardGates).every((entry) => entry.status === "pass");
const passed = annotationGatesPassed && hardGatesPassed;
const analyzedAt = new Date().toISOString();
const report = {
  schemaVersion: "2.5-held-out-derived-annotation-gate-reliability",
  workflowVersion: gate.workflowVersion,
  rubricVersion: gate.rubricVersion,
  gateId: gate.gateId,
  model: gate.model,
  calibrationOnly: true,
  analyzedAt,
  sourceQa: { localTranscriptChains: 3, paidTranscriptionCalls: 0, inventoriesIndependentlyReviewed: 3, triggeredThirdReviews: triggeredThirdReviewCount },
  independence: { inventoryBuilders: "fresh-score-blind-per-debate", inventoryReviewers: "different-fresh-per-debate", annotationPasses: "two-different-fresh-isolated-tasks-per-debate", adjudication: "fresh-primitive-only-no-scores", legacyAssessmentAccessed: false },
  debates,
  agreement,
  diagnostics: {
    ...diagnostics,
    finalMechanismPositiveCounts: { diagnostic: agreement.diagnosticFlag.adjudicatedPositiveCount, reframe: agreement.reframeFlag.adjudicatedPositiveCount },
    primitiveDisagreementCount,
    tupleDisagreementCount: moveCount - aggregate.tupleA.filter((value, index) => value === aggregate.tupleB[index]).length,
  },
  gates,
  hardGates,
  decision: {
    annotationGatesPassed,
    hardGatesPassed,
    heldOutAnnotationGate: passed ? "passed" : "not-passed",
    completeV25ThreeDebateNumericalGate: passed ? "authorized-for-preregistration" : "not-authorized",
    tenDebateGate: "not-authorized",
    corpusWide: "not-ready",
    reason: passed ? "Every preregistered primitive, derived-label, positive-power, and hard gate passed." : "At least one preregistered annotation or hard gate failed; the stop rule blocks numerical scoring and composition.",
  },
};
const decision = {
  schemaVersion: "2.5-held-out-gate-decision",
  gateId: gate.gateId,
  decidedAt: analyzedAt,
  manifestRemainsImmutable: true,
  heldOutAnnotationGate: report.decision.heldOutAnnotationGate,
  authorization: { completeV25ThreeDebateNumericalGatePreregistration: passed, tenDebateGate: false, all195Debates: false },
  reason: report.decision.reason,
};
if (write) {
  await Promise.all([
    writeFile(path.join(root, "reliability-analysis.json"), `${JSON.stringify(report, null, 2)}\n`),
    writeFile(path.join(root, "gate-decision.json"), `${JSON.stringify(decision, null, 2)}\n`),
  ]);
  console.log(JSON.stringify({ status: "written", agreement, annotationGatesPassed, hardGatesPassed, heldOutAnnotationGate: report.decision.heldOutAnnotationGate }, null, 2));
} else process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
