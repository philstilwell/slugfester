#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V389_PERFORMANCE_DEBATES,
  V389_PERFORMANCE_ROOT,
  assertV389,
  canonicalJson,
  makeV389PerformanceSchema
} from "./lib/v389-performance-judgment.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const coveragePath = "docs/calibration/v3.8.8/coverage-consensus/final-coverage-inventory.json";
const sectionPath = "docs/calibration/v3.8.8/section-weight-consensus/locked-section-weight-plans.json";
const contactPath = "docs/calibration/v3.8.8/burden-contact-consensus/locked-burden-contact-ledger.json";
const contactAnalysisPath = "docs/calibration/v3.8.8/burden-contact-consensus/burden-contact-consensus-analysis.json";
const sourceAuditPath = "docs/calibration/v3.8.8/burden-contact-consensus/packet-construction-audit.json";
const workflowPath = "docs/assessment-workflow-v3.8.9.md";
const rubricPath = "docs/reassessment-rubric-v3.8.9.md";
const manualPath = `${V389_PERFORMANCE_ROOT}/manual.md`;
const preregistrationPath = `${V389_PERFORMANCE_ROOT}/preregistration.md`;

const readBytes = (relativePath) => readFile(path.resolve(root, relativePath));
const readJson = async (relativePath) => JSON.parse((await readBytes(relativePath)).toString("utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const [coverage, sectionLock, contactLock, contactAnalysis, sourceAudit] = await Promise.all([
  readJson(coveragePath),
  readJson(sectionPath),
  readJson(contactPath),
  readJson(contactAnalysisPath),
  readJson(sourceAuditPath)
]);

assertV389(coverage.schemaVersion === "3.8.8-final-coverage-inventory" && coverage.selectedMoveCount === 81, "inherited coverage lock invalid");
assertV389(sectionLock.schemaVersion === "3.8.8-locked-section-weight-plans" && sectionLock.assignedMoveCount === 81, "inherited section lock invalid");
assertV389(contactLock.schemaVersion === "3.8.8-locked-burden-contact-ledger" && contactLock.moveCount === 81 && contactLock.unresolvedMoves === 0, "inherited burden-contact lock invalid");
assertV389(contactAnalysis.passed === true && contactAnalysis.decision.performanceJudgmentPreregistrationAuthorized === true, "burden-contact checkpoint did not authorize performance preregistration");
assertV389(contactAnalysis.decision.numericalParticipantScoringAuthorized === false, "scores unexpectedly authorized");
assertV389(sourceAudit.totals.pendingAudioVerifications === 0, "medium-confidence source move remains unverified");

const sourceHashes = {};
for (const source of [coveragePath, sectionPath, contactPath, contactAnalysisPath, sourceAuditPath, workflowPath, rubricPath, manualPath, preregistrationPath]) sourceHashes[source] = sha256(await readBytes(source));

const packets = [];
for (const debateNumber of V389_PERFORMANCE_DEBATES) {
  const coverageDebate = coverage.debates.find((item) => item.debateNumber === debateNumber);
  const sectionDebate = sectionLock.debates.find((item) => item.debateNumber === debateNumber);
  const contactDebate = contactLock.debates.find((item) => item.debateNumber === debateNumber);
  const sourceChain = sourceAudit.sourceChains[debateNumber];
  assertV389(coverageDebate && sectionDebate && contactDebate && sourceChain, `${debateNumber}: incomplete locked source set`);
  assertV389(coverageDebate.debateId === sectionDebate.debateId && coverageDebate.debateId === contactDebate.debateId, `${debateNumber}: debate identity mismatch`);
  const assignments = new Map(sectionDebate.plan.sections.flatMap((section) => section.moveAssignments.map((assignment) => [assignment.moveId, { sectionId: section.sectionId, sectionTitle: section.title, sectionWeight: section.weight, importance: assignment.importance }])));
  const contactByMove = new Map(contactDebate.moves.map((move) => [move.moveId, move]));
  assertV389(assignments.size === coverageDebate.moves.length && contactByMove.size === coverageDebate.moves.length, `${debateNumber}: move lock cardinality mismatch`);
  const coverageByMove = new Map(coverageDebate.moves.map((move) => [move.moveId, move]));
  const moves = coverageDebate.moves.map((move) => {
    const assignment = assignments.get(move.moveId);
    const contact = contactByMove.get(move.moveId);
    assertV389(assignment && contact, `${move.moveId}: missing section or contact lock`);
    assertV389(canonicalJson(move.sourceSpan) === canonicalJson(contact.sourceSpan), `${move.moveId}: source span changed between locks`);
    assertV389(move.attributionConfidence === "high" && move.audioVerification === null, `${move.moveId}: audio verification boundary not satisfied`);
    const responseTargets = move.respondsToRefs.map((targetId) => {
      const target = coverageByMove.get(targetId);
      assertV389(target, `${move.moveId}: unavailable response target ${targetId}`);
      return {
        moveId: target.moveId,
        speaker: target.speaker,
        side: target.side,
        proposition: target.proposition,
        atomicExcerpt: target.atomicExcerpt,
        sourceSpan: target.sourceSpan
      };
    });
    return {
      moveId: move.moveId,
      sectionId: assignment.sectionId,
      sectionTitle: assignment.sectionTitle,
      sectionWeight: assignment.sectionWeight,
      importance: assignment.importance,
      sourceSpan: move.sourceSpan,
      atomicExcerpt: move.atomicExcerpt,
      contextWindow: move.contextWindow,
      speaker: move.speaker,
      side: move.side,
      proposition: move.proposition,
      selectionRole: move.selectionRole,
      moveKind: move.moveKind,
      attributionConfidence: move.attributionConfidence,
      allowedResponseTargetIds: [...move.respondsToRefs],
      responseTargets,
      lockedBurdenContact: contact.finalSemanticTuple.burdenContact
    };
  });
  const [transcriptBytes, eventBytes, manifestBytes] = await Promise.all([
    readBytes(sourceChain.transcriptPath),
    readBytes(sourceChain.eventsPath),
    readBytes(sourceChain.localManifestPath)
  ]);
  assertV389(sha256(transcriptBytes) === sourceChain.transcriptSha256, `${debateNumber}: transcript hash mismatch`);
  assertV389(sha256(eventBytes) === sourceChain.eventsSha256, `${debateNumber}: event hash mismatch`);
  assertV389(sha256(manifestBytes) === sourceChain.localManifestSha256, `${debateNumber}: caption manifest hash mismatch`);
  const packet = {
    schemaVersion: "3.8.9-performance-judgment-packet",
    protocolId: "v3.8.9-performance-judgment-consensus",
    debateNumber,
    debateId: coverageDebate.debateId,
    motion: coverageDebate.motion,
    sides: coverageDebate.sides,
    sourceChain,
    routes: coverageDebate.routes,
    sections: sectionDebate.plan.sections.map((section) => ({ sectionId: section.sectionId, title: section.title, weight: section.weight, rationale: section.rationale })),
    moves,
    modelInputBoundary: {
      identicalPacketForPassAAndB: true,
      sharedSchemaPath: `${V389_PERFORMANCE_ROOT}/performance-judgment-schema.json`,
      otherPassOutputUnavailable: true,
      legacyAssessmentsUnavailable: true,
      calculatedScoresUnavailable: true,
      participantProseUnavailable: true,
      inheritedSourceLocksOnly: true,
      priorV388JudgmentsScoresAndProseUnavailable: true
    }
  };
  packets.push(packet);
  if (shouldWrite) {
    const outputPath = path.resolve(root, `${V389_PERFORMANCE_ROOT}/packets/debate-${debateNumber}.json`);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(packet, null, 2)}\n`);
  }
}

const schema = makeV389PerformanceSchema();
const manifest = {
  schemaVersion: "3.8.9-performance-judgment-preparation",
  protocolId: "v3.8.9-performance-judgment-consensus",
  status: "prepared-score-blind-no-model-execution",
  calibrationOnly: true,
  AIOnly: true,
  dyadicOnly: true,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high", authentication: "ChatGPT subscription", APIKeysRemoved: true },
  inputs: { coveragePath, sectionPath, contactPath, contactAnalysisPath, sourceAuditPath, workflowPath, rubricPath, manualPath, preregistrationPath },
  packets: packets.map((packet) => ({ debateNumber: packet.debateNumber, debateId: packet.debateId, path: `${V389_PERFORMANCE_ROOT}/packets/debate-${packet.debateNumber}.json`, moveCount: packet.moves.length, highConfidenceAttributions: packet.moves.filter((move) => move.attributionConfidence === "high").length, pendingAudioVerifications: 0 })),
  consensus: {
    initialContexts: 6,
    independentContextsPerDebate: 2,
    sharedPacketAcrossPasses: true,
    sharedClosedSchemaAcrossAllSixContexts: true,
    deterministicDisagreementExtraction: true,
    responseTupleIsCompoundField: true,
    responseTupleFields: ["class", "decisiveTargetIds", "contactedComponents", "totalComponents"],
    charityTestedMismatchAlwaysDisputed: true,
    scalarDisputeDeltaGreaterThan: 5,
    diagnosticMoveDeltaGreaterThan: 4,
    thirdPassDisputedFieldsOnly: true,
    thirdPassMayChooseOnlyInitialCandidates: true,
    finalSemanticChoiceRequiresTwoVotes: true
  },
  safeguards: {
    inheritedSourceLocksOnly: true,
    priorV388JudgmentsScoresAndProseUnavailable: true,
    mediumConfidenceMovesRequireAudioBeforeJudgment: true,
    mediumConfidenceMovesAtPreparation: 0,
    responseBandValidation: true,
    burdenBandValidation: true,
    untestedCharityMustEqual75: true,
    duplicateBurdenAdjustmentCaptureForcesZero: true,
    scoresDerivedOnlyAfterAdjudication: true,
    modelCalculatedTotalsProhibited: true,
    assessmentProseProhibited: true
  },
  totals: { debates: 3, moves: packets.reduce((sum, packet) => sum + packet.moves.length, 0), initialContexts: 6, modelContextsExecuted: 0, scoreFields: 0, calculatedTotals: 0, pendingAudioVerifications: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: { initialModelExecution: false, adjudicationModelExecution: false, scoreDerivation: false, assessmentProse: false, productionMutation: false, tenDebateGate: false, all195Debates: false },
  sourceHashes
};

if (shouldWrite) {
  await mkdir(path.resolve(root, V389_PERFORMANCE_ROOT), { recursive: true });
  await writeFile(path.resolve(root, `${V389_PERFORMANCE_ROOT}/performance-judgment-schema.json`), `${JSON.stringify(schema, null, 2)}\n`);
  await writeFile(path.resolve(root, `${V389_PERFORMANCE_ROOT}/preparation-manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", debates: packets.length, moves: manifest.totals.moves, initialContexts: 6, sharedSchemas: 1, pendingAudioVerifications: 0, calculatedTotals: 0, scoresAuthorized: false }, null, 2));
