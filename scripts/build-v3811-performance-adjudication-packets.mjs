#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V3811_PERFORMANCE_ROOT, assertV3811, canonicalJson, validateV3811PerformanceOutput } from "./lib/v3811-performance-judgment.mjs";
import { V3811_ADJUDICATION_ROOT, makeV3811AdjudicationSchema } from "./lib/v3811-performance-adjudication.mjs";

const root = process.cwd();
const initialOutputsRoot = `${V3811_PERFORMANCE_ROOT}/initial-outputs`;
const disagreementsPath = `${V3811_PERFORMANCE_ROOT}/initial-disagreements.json`;
const audioAuditPath = "docs/calibration/v3.8.8/performance-judgment-consensus/audio-verification.json";
const schemaPath = `${V3811_ADJUDICATION_ROOT}/adjudication-schema.json`;
const preparationPath = `${V3811_ADJUDICATION_ROOT}/preparation-audit.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytes = (relativePath) => readFile(path.resolve(root, relativePath));
const readJson = async (relativePath) => JSON.parse(await bytes(relativePath));
const exists = async (relativePath) => { try { await access(path.resolve(root, relativePath)); return true; } catch { return false; } };

assertV3811(!(await exists(V3811_ADJUDICATION_ROOT)), `${V3811_ADJUDICATION_ROOT} already exists`);
const [disagreements, audioAudit] = await Promise.all([readJson(disagreementsPath), readJson(audioAuditPath)]);
assertV3811(disagreements.status === "passed-deterministic-disagreement-extraction" && disagreements.authorization.prepareDisputeOnlyAdjudicationPackets && !disagreements.authorization.adjudicationModelExecution && !disagreements.authorization.scoreDerivation, "disagreement artifact does not authorize preparation");
assertV3811(audioAudit.status === "passed-all-medium-confidence-moves-audio-verified" && audioAudit.verifiedMoves === 17 && audioAudit.authorization.prepareDisputeOnlyAdjudicationPackets && !audioAudit.authorization.adjudicationModelExecution, "audio verification does not authorize preparation");

const audioByMoveId = new Map(audioAudit.debateAudits.flatMap((debate) => debate.moves.map((move) => [move.moveId, move])));
const schema = makeV3811AdjudicationSchema();
await mkdir(path.resolve(root, `${V3811_ADJUDICATION_ROOT}/packets`), { recursive: true });
await writeFile(path.resolve(root, schemaPath), `${JSON.stringify(schema, null, 2)}\n`);

const packetAudits = [];
let disputedMoves = 0;
let responseTupleChoices = 0;
let charityPairChoices = 0;
let ratingChoices = 0;
let burdenAdjustmentChoices = 0;
let dependencyAddedCharityRatings = 0;
let exposedCharityRatingsAbsorbed = 0;
let audioVerifiedDisputedMoves = 0;

for (const debateDisagreements of disagreements.debates) {
  const debateNumber = debateDisagreements.debateNumber;
  const packetPath = `${V3811_PERFORMANCE_ROOT}/packets/debate-${debateNumber}.json`;
  const passAPath = `${initialOutputsRoot}/debate-${debateNumber}-pass-a.json`;
  const passBPath = `${initialOutputsRoot}/debate-${debateNumber}-pass-b.json`;
  const [lockedPacket, passA, passB] = await Promise.all([readJson(packetPath), readJson(passAPath), readJson(passBPath)]);
  validateV3811PerformanceOutput(passA, lockedPacket, "A");
  validateV3811PerformanceOutput(passB, lockedPacket, "B");
  const moveIndexById = new Map(lockedPacket.moves.map((move, index) => [move.moveId, index]));
  const disputedMovePackets = [];
  let debateDependencyAdded = 0;
  let debateAudioVerified = 0;

  for (const dispute of debateDisagreements.moveDisputes) {
    const index = moveIndexById.get(dispute.moveId);
    assertV3811(Number.isInteger(index), `${debateNumber}:${dispute.moveId}: locked move missing`);
    const lockedMove = lockedPacket.moves[index];
    const judgmentA = passA.moveJudgments[index];
    const judgmentB = passB.moveJudgments[index];
    const charityMismatch = dispute.disputedFields.charityTested !== null;
    const ratings = structuredClone(dispute.disputedFields.ratings);
    let charityPair = null;
    if (charityMismatch) {
      if (!Object.hasOwn(ratings, "representationalCharity")) {
        dependencyAddedCharityRatings += 1;
        debateDependencyAdded += 1;
      } else exposedCharityRatingsAbsorbed += 1;
      delete ratings.representationalCharity;
      charityPair = {
        candidate1: { charityTested: judgmentA.charityTested, representationalCharity: judgmentA.ratings.representationalCharity.value },
        candidate2: { charityTested: judgmentB.charityTested, representationalCharity: judgmentB.ratings.representationalCharity.value },
        selectionRule: "Choose one candidate pair; the flag and charity value may not be mixed across candidates.",
      };
      assertV3811(charityPair.candidate1.charityTested !== charityPair.candidate2.charityTested, `${dispute.moveId}: charity pair lacks a flag dispute`);
      for (const candidate of [charityPair.candidate1, charityPair.candidate2]) if (!candidate.charityTested) assertV3811(candidate.representationalCharity === 75, `${dispute.moveId}: untested charity candidate is not 75`);
    }

    const audioVerification = audioByMoveId.get(dispute.moveId) ?? null;
    if (audioVerification) {
      assertV3811(audioVerification.verificationStatus === "passed-audio-derived-transcript-matches-locked-excerpt", `${dispute.moveId}: invalid audio verification`);
      debateAudioVerified += 1;
      audioVerifiedDisputedMoves += 1;
    }
    disputedMovePackets.push({
      moveId: lockedMove.moveId,
      moveIndex: index,
      sectionId: lockedMove.sectionId,
      sectionTitle: lockedMove.sectionTitle,
      side: lockedMove.side,
      speaker: lockedMove.speaker,
      moveKind: lockedMove.moveKind,
      lockedBurdenContact: lockedMove.lockedBurdenContact,
      evidence: {
        proposition: lockedMove.proposition,
        atomicExcerpt: lockedMove.atomicExcerpt,
        contextWindow: lockedMove.contextWindow,
        sourceSpan: lockedMove.sourceSpan,
        allowedResponseTargetIds: lockedMove.allowedResponseTargetIds,
        responseTargets: lockedMove.responseTargets,
        audioVerification: audioVerification ? {
          status: audioVerification.verificationStatus,
          clipSha256: audioVerification.clipSha256,
          transcriptSha256: audioVerification.transcriptSha256,
          bagOfWordsRecallAgainstLockedExcerpt: audioVerification.bagOfWordsRecallAgainstLockedExcerpt,
          audioDerivedTranscript: audioVerification.audioDerivedTranscript,
        } : null,
      },
      candidates: {
        responseTuple: dispute.disputedFields.responseTuple,
        charityPair,
        ratings,
      },
      requiredDecision: {
        responseTupleChoiceRequired: dispute.disputedFields.responseTuple !== null,
        charityPairChoiceRequired: charityPair !== null,
        ratingChoiceKeys: Object.keys(ratings),
      },
    });
  }

  const burdenAdjustmentDisputes = debateDisagreements.burdenAdjustmentDisputes.map((dispute) => ({
    side: dispute.side,
    candidates: {
      candidate1: dispute.candidate1FullRecord,
      candidate2: dispute.candidate2FullRecord,
    },
    lockedRouteEvidence: lockedPacket.routes.find((route) => route.side === dispute.side),
    selectionRule: "Choose one supplied complete record. Rationale wording alone is not a separate field and no third record may be invented.",
  }));

  const packet = {
    schemaVersion: "3.8.11-performance-adjudication-packet",
    protocolId: "v3.8.11-performance-judgment-consensus",
    debateNumber,
    debateId: lockedPacket.debateId,
    motion: lockedPacket.motion,
    candidateOrdering: "anonymous-and-stable; candidate numbers do not reveal pass identity",
    evidenceBoundary: {
      disputedFieldsOnly: true,
      lockedMoveEvidenceOnly: true,
      nondisputedPerformanceFieldsUnavailable: true,
      initialPassRationalesUnavailable: true,
      fullInitialOutputsUnavailable: true,
      calculatedScoresUnavailable: true,
      legacyAssessmentsUnavailable: true,
      assessmentProseUnavailable: true,
      mediumConfidenceMovesRequireAudioVerification: true,
    },
    dependencyClosure: {
      charityFlagAndCharityValueAreCompound: true,
      addedCharityRatingFields: debateDependencyAdded,
      responseClassAndResponsivenessBandCheckedByFinalValidator: true,
    },
    disputedMoves: disputedMovePackets,
    burdenAdjustmentDisputes,
    audit: {
      uniqueMoves: disputedMovePackets.length,
      responseTupleChoices: disputedMovePackets.filter((move) => move.candidates.responseTuple !== null).length,
      charityPairChoices: disputedMovePackets.filter((move) => move.candidates.charityPair !== null).length,
      ratingChoices: disputedMovePackets.reduce((sum, move) => sum + Object.keys(move.candidates.ratings).length, 0),
      burdenAdjustmentChoices: burdenAdjustmentDisputes.length,
      audioVerifiedDisputedMoves: debateAudioVerified,
      dependencyAddedCharityRatings: debateDependencyAdded,
      calculatedScores: 0,
    },
  };

  const adjudicationPacketPath = `${V3811_ADJUDICATION_ROOT}/packets/debate-${debateNumber}.json`;
  await writeFile(path.resolve(root, adjudicationPacketPath), `${JSON.stringify(packet, null, 2)}\n`);
  disputedMoves += packet.audit.uniqueMoves;
  responseTupleChoices += packet.audit.responseTupleChoices;
  charityPairChoices += packet.audit.charityPairChoices;
  ratingChoices += packet.audit.ratingChoices;
  burdenAdjustmentChoices += packet.audit.burdenAdjustmentChoices;
  packetAudits.push({
    debateNumber,
    debateId: lockedPacket.debateId,
    packetPath: adjudicationPacketPath,
    packetSha256: sha256(await bytes(adjudicationPacketPath)),
    ...packet.audit,
  });
}

assertV3811(disputedMoves === disagreements.summary.disputedMoves, "adjudication packets changed disputed move population");
assertV3811(responseTupleChoices === disagreements.summary.responseTupleDisputes && charityPairChoices === disagreements.summary.charityTestedDisputes, "adjudication compound choice counts mismatch");
assertV3811(dependencyAddedCharityRatings + exposedCharityRatingsAbsorbed === charityPairChoices, "charity dependency closure count mismatch");
assertV3811(ratingChoices + exposedCharityRatingsAbsorbed === disagreements.summary.ratingFieldDisputes, "exposed charity ratings must be absorbed into compound pairs");
assertV3811(burdenAdjustmentChoices === disagreements.summary.burdenAdjustmentDisputes, "burden adjustment dispute count mismatch");

const preparation = {
  schemaVersion: "3.8.11-performance-adjudication-preparation-audit",
  protocolId: "v3.8.11-performance-judgment-consensus",
  status: "passed-dispute-only-adjudication-preparation",
  sourceDisagreementsPath: disagreementsPath,
  audioVerificationPath: audioAuditPath,
  sharedSchemaPath: schemaPath,
  sharedSchemaSha256: sha256(await bytes(schemaPath)),
  contexts: packetAudits.length,
  disputedMoves,
  responseTupleChoices,
  charityPairChoices,
  ratingChoices,
  burdenAdjustmentChoices,
  dependencyClosure: {
    initialExposedRatingFields: disagreements.summary.ratingFieldDisputes,
    exposedCharityRatingsAbsorbedIntoCompoundPairs: exposedCharityRatingsAbsorbed,
    charityRatingsAddedToCloseFlagValueInvariant: dependencyAddedCharityRatings,
    independentRatingChoicesAfterCompoundPairing: ratingChoices,
  },
  audioVerifiedDisputedMoves,
  candidateValuesInvented: 0,
  calculatedScores: 0,
  meteredApiCostUsdForPreparation: 0,
  estimatedAudioVerificationCostUsd: audioAudit.transcription.estimatedTranscriptionCostUsd,
  authorization: {
    freezeAdjudicationExecutionManifest: true,
    adjudicationModelExecution: false,
    scoreDerivation: false,
    numericalParticipantScoring: false,
    assessmentProse: false,
    productionMutation: false,
    tenDebateGate: false,
    all195Debates: false,
  },
  packetAudits,
};
await writeFile(path.resolve(root, preparationPath), `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, contexts: preparation.contexts, disputedMoves, responseTupleChoices, charityPairChoices, independentRatingChoices: ratingChoices, dependencyAddedCharityRatings, burdenAdjustmentChoices, audioVerifiedDisputedMoves, scoreDerivationAuthorized: false }, null, 2));
