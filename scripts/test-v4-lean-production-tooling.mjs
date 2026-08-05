#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V4_LEAN_ROOT,
  V4_RATING_KEYS,
  canonicalJson,
  deriveV4PrimaryScores,
  evaluateV4Escalation,
  makeV4ControlSample,
  makeV4PrimarySchema,
  projectV4ComputeHours,
  readJson,
  validateV4PrimaryOutput
} from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const rationale = "The selected transcript span supplies the named feature, and the closed rubric finding places this dimension inside the chosen operational band without calculating a participant total.";
const evidenceBasis = "The exact timestamped excerpt and its surrounding chronological context provide the evidence used for this deterministic contract fixture.";
const packet = {
  schemaVersion: "4.0-lean-source-only-packet",
  protocolId: "v4.0-lean-risk-triggered-consensus",
  debateNumber: "fixture",
  debateId: "v4-lean-contract-fixture",
  motion: "Does the fixture proposition follow from the reasons presented in this synthetic exchange?",
  sides: { pro: { label: "Fixture pro", speakers: ["Speaker Pro"] }, con: { label: "Fixture con", speakers: ["Speaker Con"] } },
  durationSeconds: 600,
  eventCount: 100,
  sourceChain: {},
  modelInputBoundary: {}
};

function rating(value) {
  return { value, rationale };
}

function zeroAdjustment() {
  return {
    value: 0,
    rationale: "No distinct uncaptured debate-wide burden-completion consequence is asserted in this deterministic fixture.",
    eligibility: {
      distinctDebateWideConsequence: false,
      affectsBurdenCompletion: false,
      notAlreadyScored: false,
      affectedBurdenIds: [],
      completionCriterion: "No separate completion criterion is affected in this fixture.",
      relatedMoveIds: [],
      distinctConsequence: "No separate debate-wide consequence is asserted in this fixture.",
      alreadyCapturedBy: ["fixture-zero-default"],
      counterfactual: "No counterfactual score correction is required in this fixture."
    }
  };
}

function primaryFixture() {
  const sections = [1, 2, 3, 4].map((number) => ({ sectionId: `section-${number}`, title: `Fixture section ${number}`, weightPercent: 25, rationale: "This section represents one distinct load-bearing portion of the synthetic debate and receives an equal pre-rating weight." }));
  const moves = [];
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    const section = sections[sectionIndex];
    const proId = `move-${sectionIndex * 2 + 1}`;
    const conId = `move-${sectionIndex * 2 + 2}`;
    moves.push({
      moveId: proId,
      sectionId: section.sectionId,
      side: "pro",
      speaker: "Speaker Pro",
      moveKind: "constructive",
      proposition: "The pro speaker advances a recoverable premise connected to the synthetic motion and its stated burden.",
      sourceSpan: { startEvent: sectionIndex * 20, endEvent: sectionIndex * 20 + 4, startMs: sectionIndex * 120000, endMs: sectionIndex * 120000 + 20000, excerpt: "This exact synthetic excerpt states the pro premise clearly enough to anchor the fixture judgment and its source span." },
      attributionConfidence: "high",
      attributionBasis: "The synthetic event sequence labels Speaker Pro continuously throughout this exact source span.",
      importance: sectionIndex === 0 ? 3 : 2,
      burdenContact: { polarity: "support", tier: sectionIndex === 0 ? "motion" : "central", bridgeId: sectionIndex === 0 ? "pro-motion" : "pro-central" },
      response: { class: "constructive-opening", decisiveTargetIds: [], components: [], issueBearingContraryMaterial: false, diagnosticConsequenceExplicit: false, replacementDemandAnswered: false, rationale: "This is a constructive contribution to the adopted route and therefore has no earlier response target or indispensable target component." },
      precisionFindings: { propositionRecoverability: "complete", termStability: "stable", scopeStability: "stable", qualificationExplicitness: "explicit" },
      calibrationFindings: { assertedForce: "probability", warrantFit: "matched", qualificationStatus: "explicit", uncertaintyAcknowledged: "yes" },
      charity: { tested: false, alternative: "", decisiveQualification: "" },
      ratings: Object.fromEntries(V4_RATING_KEYS.map((key) => [key, rating(key === "relevanceBurden" ? (sectionIndex === 0 ? 92 : 82) : key === "representationalCharity" ? 75 : 92)])),
      evidenceBasis,
      assessmentConfidence: "high"
    });
    moves.push({
      moveId: conId,
      sectionId: section.sectionId,
      side: "con",
      speaker: "Speaker Con",
      moveKind: "reply",
      proposition: "The con speaker directly answers the pro premise by addressing its complete indispensable inferential component.",
      sourceSpan: { startEvent: sectionIndex * 20 + 5, endEvent: sectionIndex * 20 + 9, startMs: sectionIndex * 120000 + 25000, endMs: sectionIndex * 120000 + 45000, excerpt: "This exact synthetic excerpt states the con reply and directly addresses the complete indispensable component of the earlier pro premise." },
      attributionConfidence: "high",
      attributionBasis: "The synthetic event sequence labels Speaker Con continuously throughout this exact reply span.",
      importance: 2,
      burdenContact: { polarity: "attack", tier: "central", bridgeId: "pro-central" },
      response: { class: "full-answer", decisiveTargetIds: [proId], components: [{ componentId: `${conId}-component-1`, targetMoveId: proId, text: "The decisive inferential bridge asserted by the pro premise.", contacted: true, decisive: true }], issueBearingContraryMaterial: true, diagnosticConsequenceExplicit: false, replacementDemandAnswered: false, rationale: "The reply contacts the earlier premise's only indispensable component and explains why that component does not establish the asserted inference." },
      precisionFindings: { propositionRecoverability: "complete", termStability: "stable", scopeStability: "stable", qualificationExplicitness: "implicit" },
      calibrationFindings: { assertedForce: "plausibility", warrantFit: "matched", qualificationStatus: "implicit", uncertaintyAcknowledged: "no" },
      charity: { tested: true, alternative: "The pro premise and its asserted inferential bridge.", decisiveQualification: "The premise claims support rather than deductive certainty." },
      ratings: Object.fromEntries(V4_RATING_KEYS.map((key) => [key, rating(key === "responsiveness" ? 86 : key === "relevanceBurden" ? 82 : key === "precisionClarity" || key === "epistemicCalibration" ? 85 : 84)])),
      evidenceBasis,
      assessmentConfidence: "high"
    });
  }
  return {
    schemaVersion: "4.0-lean-primary-output",
    protocolId: "v4.0-lean-risk-triggered-consensus",
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    reviewerRole: "integrated-primary-judge",
    assessmentModel: "5.6 Sol",
    calibrationOnly: true,
    isolation: { legacyAssessmentsUnavailable: true, calculatedTotalsUnavailable: true, winnerLabelsUnavailable: true, otherJudgmentsUnavailable: true, assessmentProseUnavailable: true, contaminationDetected: false },
    routes: [
      { routeId: "pro-route", side: "pro", description: "The pro route supports the fixture motion through a central inferential bridge and a subsidiary supporting consideration.", successCriteria: "The pro side succeeds if the premise and central inferential bridge make the fixture conclusion proportionately supported.", bridges: [{ bridgeId: "pro-motion", tier: "motion", description: "The complete pro conclusion at motion level." }, { bridgeId: "pro-central", tier: "central", description: "The central inferential bridge in the pro case." }, { bridgeId: "pro-subsidiary", tier: "subsidiary", description: "A necessary subsidiary support for the pro route." }] },
      { routeId: "con-route", side: "con", description: "The con route challenges whether the pro bridge succeeds and supplies an independent critical route against the motion.", successCriteria: "The con side succeeds if it defeats the central pro inference or establishes its own proportionate critical conclusion.", bridges: [{ bridgeId: "con-motion", tier: "motion", description: "The complete con conclusion at motion level." }, { bridgeId: "con-central", tier: "central", description: "The central inferential bridge in the con case." }, { bridgeId: "con-subsidiary", tier: "subsidiary", description: "A necessary subsidiary support for the con route." }] }
    ],
    sections,
    moves,
    burdenCompletionAdjustment: { pro: zeroAdjustment(), con: zeroAdjustment() },
    audit: { completeTranscriptReviewed: true, allLoadBearingLinesRepresented: true, allMovesJudgedOnce: true, sectionWeightsLockedBeforeRatings: true, responseComponentsApplied: true, closedPrecisionAnchorsApplied: true, closedCalibrationAnchorsApplied: true, charityAnchorApplied: true, burdenExclusionRuleApplied: true, calculatedTotalsAbsent: true }
  };
}

const schema = makeV4PrimarySchema();
const primary = primaryFixture();
const validation = validateV4PrimaryOutput(primary, packet);
const scores = deriveV4PrimaryScores(primary);
const cleanScores = structuredClone(scores);
cleanScores.overall.pro.score = 82;
cleanScores.overall.con.score = 72;
cleanScores.winningMargin = 10;
const clean = evaluateV4Escalation({ primary, scores: cleanScores });
if (clean.requiresSecondPass) throw new Error(`clean fixture unexpectedly escalated: ${clean.reasons.join(", ")}`);

const triggerTests = {};
const control = evaluateV4Escalation({ primary, scores: cleanScores, controlSampleSelected: true });
triggerTests.controlSample = control.reasons.includes("frozen-control-sample");
const closeScores = structuredClone(cleanScores); closeScores.overall.pro.score = 78; closeScores.overall.con.score = 74; closeScores.winningMargin = 4;
triggerTests.closeWinner = evaluateV4Escalation({ primary, scores: closeScores }).reasons.includes("winner-margin-at-most-five");
const boundaryScores = structuredClone(cleanScores); boundaryScores.overall.pro.score = 84; boundaryScores.overall.con.score = 72; boundaryScores.winningMargin = 12;
triggerTests.bandBoundary = evaluateV4Escalation({ primary, scores: boundaryScores }).reasons.includes("pro-score-near-band-boundary");
const uncertain = structuredClone(primary); uncertain.moves[0].assessmentConfidence = "medium";
triggerTests.highImportanceConfidence = evaluateV4Escalation({ primary: uncertain, scores: cleanScores }).reasons.includes("importance-three-confidence-below-high");
const adjustment = structuredClone(primary); adjustment.burdenCompletionAdjustment.pro.value = 1;
triggerTests.nonzeroAdjustment = evaluateV4Escalation({ primary: adjustment, scores: cleanScores }).reasons.includes("nonzero-burden-completion-adjustment");
triggerTests.semanticWarning = evaluateV4Escalation({ primary, scores: cleanScores, structuralWarnings: ["fixture warning"] }).reasons.includes("semantic-integrity-warning");
const audio = structuredClone(primary); audio.moves[0].attributionConfidence = "medium";
const audioResult = evaluateV4Escalation({ primary: audio, scores: cleanScores, unresolvedAudioMoveIds: [audio.moves[0].moveId] });
triggerTests.audioRequired = audioResult.requiresAudioVerification && audioResult.publicationBlocked && audioResult.reasons.includes("load-bearing-attribution-unresolved-after-audio");
if (!Object.values(triggerTests).every(Boolean)) throw new Error(`one or more escalation triggers failed: ${JSON.stringify(triggerTests)}`);

const invalidPrecision = structuredClone(primary); invalidPrecision.moves[0].ratings.precisionClarity.value = 70;
let invalidPrecisionRejected = false;
try { validateV4PrimaryOutput(invalidPrecision, packet); } catch (error) { invalidPrecisionRejected = /precision\/clarity outside/.test(error.message); }
if (!invalidPrecisionRejected) throw new Error("precision closed-anchor mutation was not rejected");
const invalidResponse = structuredClone(primary); invalidResponse.moves[1].response.class = "partial-answer";
let invalidResponseRejected = false;
try { validateV4PrimaryOutput(invalidResponse, packet); } catch (error) { invalidResponseRejected = /partial answer must contact some but not all/.test(error.message); }
if (!invalidResponseRejected) throw new Error("response component mutation was not rejected");

const corpusIds = Array.from({ length: 195 }, (_, index) => `debate-${index + 1}`);
const controlSample = makeV4ControlSample(corpusIds);
if (controlSample.length !== 20) throw new Error("control sample must contain exactly 20 of 195 debates");
const compute = projectV4ComputeHours();
if (!compute.centralTargetPassed || !compute.conservativeCeilingPassed) throw new Error("central compute projection exceeds the v4 budget");

if (shouldWrite) {
  await mkdir(path.resolve(V4_LEAN_ROOT, "schemas"), { recursive: true });
  await writeFile(path.resolve(V4_LEAN_ROOT, "schemas/primary.schema.json"), `${JSON.stringify(schema, null, 2)}\n`);
}
const storedSchemaPath = `${V4_LEAN_ROOT}/schemas/primary.schema.json`;
if (shouldWrite) {
  const stored = await readJson(storedSchemaPath);
  if (canonicalJson(stored) !== canonicalJson(schema)) throw new Error("stored schema differs from generator");
}
const fixture = {
  schemaVersion: "4.0-lean-production-tooling-fixture",
  protocolId: "v4.0-lean-risk-triggered-consensus",
  status: "passed",
  validation,
  calculatedFixture: { pro: scores.overall.pro.score, con: scores.overall.con.score, winner: scores.winner },
  triggerTests,
  mutationTests: { precisionClosedAnchorRejected: true, responseComponentMismatchRejected: true },
  controlSample: { corpusDebates: 195, selectedDebates: controlSample.length, exactTenPercentRounded: true },
  computeProjection: compute,
  costs: { modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }
};
if (shouldWrite) await writeFile(path.resolve(V4_LEAN_ROOT, "dry-fixture.json"), `${JSON.stringify(fixture, null, 2)}\n`);
console.log(JSON.stringify(fixture, null, 2));
