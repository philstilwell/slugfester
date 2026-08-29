#!/usr/bin/env node

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { debates } from "../src/data/debates.js";
import {
  STANDALONE_PROTOCOL_ID,
  STANDALONE_ROOT,
  STANDALONE_SCORE_PROTOCOL_ID,
  STANDALONE_SITE_LEDGER_ADAPTER_VERSION,
  assembleStandaloneFinalLedger,
  canonicalJson,
  deriveStandaloneScores,
  extractStandaloneDisagreements,
  fileRecord,
  serializedJson,
  sha256,
  validateStandaloneAdjudication,
  validateStandaloneCandidate,
  validateStandaloneInventory,
  validateStandalonePrimaryJudgment,
  validateStandaloneScoreStability,
  validateStandaloneSiteLedgerAdapter
} from "./lib/assessment-production-standalone-debate-v1.mjs";

const ROOT = process.cwd();
const DEBATE_ROOT = `${STANDALONE_ROOT}/debate-196`;
const paths = {
  registry: `${STANDALONE_ROOT}/registry.json`,
  authorization: `${DEBATE_ROOT}/authorization.json`,
  manifest: `${DEBATE_ROOT}/manifest.json`,
  sourceLock: `${DEBATE_ROOT}/source/source-lock.json`,
  events: ".assessment-cache/captions/0-8n2SGFSL8/events.json",
  inventory: `${DEBATE_ROOT}/inventory/inventory.json`,
  judgmentPacket: `${DEBATE_ROOT}/judgments/judgment-packet.json`,
  passA: `${DEBATE_ROOT}/judgments/pass-a/output.json`,
  passB: `${DEBATE_ROOT}/judgments/pass-b/output.json`,
  disagreements: `${DEBATE_ROOT}/disagreements/disagreements.json`,
  adjudicationPacket: `${DEBATE_ROOT}/adjudication/packet.json`,
  audio: `${DEBATE_ROOT}/audio/audio-verification.json`,
  adjudication: `${DEBATE_ROOT}/adjudication/output.json`,
  finalLedger: `${DEBATE_ROOT}/final-ledger/final-ledger.json`,
  scoreInput: `${DEBATE_ROOT}/score-pass/input.json`,
  scoreOutput: `${DEBATE_ROOT}/score-pass/output.json`,
  scoreAttestation: `${DEBATE_ROOT}/score-pass/attestation.json`,
  publication: `${DEBATE_ROOT}/publication/output.json`,
  publicationMotionCorrection: `${DEBATE_ROOT}/publication/correction-1-motion.json`,
  publicationCommentaryCorrection: `${DEBATE_ROOT}/publication/correction-2-overall-commentary.json`,
  rendering: `${DEBATE_ROOT}/rendering/rendering-audit.json`,
  postPublicationRendering: `${DEBATE_ROOT}/rendering/post-publication-audit-1.json`,
  validation: `${DEBATE_ROOT}/validation-summary.json`,
  productionLedger:
    "docs/assessment-ledgers/huemer-rasmussen-god-existence-2026.json"
};

const absolute = (relative) => path.join(ROOT, relative);
const bytes = (relative) => readFileSync(absolute(relative));
const json = (relative) => JSON.parse(readFileSync(absolute(relative), "utf8"));
const publicationComparable = (debate) => {
  const comparable = structuredClone(debate);
  delete comparable.sourceNote;
  delete comparable.scoringNote;
  return comparable;
};
const writeNewJson = (relative, value) => {
  assert.equal(existsSync(absolute(relative)), false, `${relative}: refusing to overwrite`);
  mkdirSync(path.dirname(absolute(relative)), { recursive: true });
  writeFileSync(absolute(relative), serializedJson(value));
};

function validateFrozenInputBoundary({
  requirePasses = false,
  repositoryOnly = false
} = {}) {
  const registry = json(paths.registry);
  const authorization = json(paths.authorization);
  const manifest = json(paths.manifest);
  const sourceLock = json(paths.sourceLock);
  assert.equal(registry.protocolId, "assessment-production-standalone-debates-v1");
  assert.equal(registry.campaignBoundary.batch18Permitted, false);
  assert.equal(authorization.protocolId, STANDALONE_PROTOCOL_ID);
  assert.equal(authorization.status, "authorized-and-frozen");
  assert.equal(authorization.execution.primaryJudgments, 2);
  assert.equal(authorization.execution.oneDeterministicScorePass, true);
  assert.equal(authorization.historicalBoundary.campaignBatch, null);
  assert.equal(manifest.protocolId, STANDALONE_PROTOCOL_ID);
  assert.equal(manifest.status, "inputs-frozen-before-judgment");
  assert.equal(manifest.scoringControls.oneScorePass, true);
  assert.equal(sourceLock.status, "complete-and-hash-locked");
  assert.equal(sourceLock.participants.dyadicGatePassed, true);
  assert.equal(sourceLock.duplicateAudit.identityDuplicateFound, false);
  for (const record of Object.values(manifest.sourceLocks)) {
    if (repositoryOnly && record.path.startsWith(".assessment-cache/")) continue;
    assert.equal(existsSync(absolute(record.path)), true, `${record.path}: missing`);
    assert.equal(sha256(bytes(record.path)), record.sha256, `${record.path}: source hash changed`);
  }
  for (const record of Object.values(manifest.controlLocks)) {
    assert.equal(existsSync(absolute(record.path)), true, `${record.path}: missing`);
    assert.equal(sha256(bytes(record.path)), record.sha256, `${record.path}: control hash changed`);
  }
  const inventory = json(paths.inventory);
  const events = repositoryOnly ? null : json(paths.events);
  assert.equal(
    authorization.identity.motion,
    inventory.motion,
    "authorization and inventory motions differ"
  );
  const inventoryValidation = validateStandaloneInventory(inventory, events, {
    repositoryOnly
  });
  if (!requirePasses) return { inventory, events, inventoryValidation };
  const inventorySha256 = sha256(bytes(paths.inventory));
  const passA = json(paths.passA);
  const passB = json(paths.passB);
  validateStandalonePrimaryJudgment(passA, inventory, {
    expectedPass: "pass-a",
    expectedInventorySha256: inventorySha256
  });
  validateStandalonePrimaryJudgment(passB, inventory, {
    expectedPass: "pass-b",
    expectedInventorySha256: inventorySha256
  });
  return { inventory, events, inventoryValidation, inventorySha256, passA, passB };
}

function writeDisagreements() {
  const { inventory, inventorySha256, passA, passB } =
    validateFrozenInputBoundary({ requirePasses: true });
  const passASha256 = sha256(bytes(paths.passA));
  const passBSha256 = sha256(bytes(paths.passB));
  const disagreements = extractStandaloneDisagreements({ inventory, passA, passB });
  disagreements.evidenceLocks = {
    inventory: { path: paths.inventory, sha256: inventorySha256 },
    passA: { path: paths.passA, sha256: passASha256 },
    passB: { path: paths.passB, sha256: passBSha256 }
  };
  writeNewJson(paths.disagreements, disagreements);
  const inventoryById = new Map(inventory.moves.map((move) => [move.moveId, move]));
  const packet = {
    schemaVersion: "1.0-standalone-dispute-adjudication-packet",
    protocolId: STANDALONE_PROTOCOL_ID,
    status: "frozen-anonymous-dispute-only-packet",
    debateNumber: inventory.debateNumber,
    debateId: inventory.debateId,
    assessmentModel: "5.6 Sol",
    reasoningEffort: "low",
    evidenceBoundary: {
      passIdentitiesUnavailable: true,
      calculatedTotalsUnavailable: true,
      winnerLabelsUnavailable: true,
      publicationProseUnavailable: true,
      otherDebatesUnavailable: true
    },
    disputes: disagreements.disputes.map((dispute) => ({
      ...dispute,
      moveEvidence: dispute.moveId ? inventoryById.get(dispute.moveId) : null
    })),
    sourceLocks: json(paths.manifest).sourceLocks,
    instructions: {
      selectExistingOptionOnly: true,
      permittedSelections: ["option-a", "option-b"],
      resolveEveryDisputeExactlyOnce: true,
      modelAuthoredTotalsForbidden: true
    }
  };
  writeNewJson(paths.adjudicationPacket, packet);
  console.log(
    `Standalone disagreements frozen: ${disagreements.disputes.length} disputes across ${inventory.moves.length} moves.`
  );
}

function assembleFinalLedger() {
  const { inventory, inventorySha256, passA, passB } =
    validateFrozenInputBoundary({ requirePasses: true });
  const disagreements = json(paths.disagreements);
  const audio = json(paths.audio);
  const adjudication = json(paths.adjudication);
  validateStandaloneAdjudication(adjudication, disagreements);
  assert.equal(audio.protocolId, STANDALONE_PROTOCOL_ID);
  assert.equal(audio.status, "complete");
  assert.equal(audio.audit.unresolvedAttributionChecks, 0);
  const finalLedger = assembleStandaloneFinalLedger({
    inventory,
    inventorySha256,
    passA,
    passASha256: sha256(bytes(paths.passA)),
    passB,
    passBSha256: sha256(bytes(paths.passB)),
    disagreements,
    disagreementsSha256: sha256(bytes(paths.disagreements)),
    adjudication,
    adjudicationSha256: sha256(bytes(paths.adjudication)),
    audio,
    audioSha256: sha256(bytes(paths.audio))
  });
  writeNewJson(paths.finalLedger, finalLedger);
  writeNewJson(paths.scoreInput, {
    schemaVersion: "1.0-standalone-score-pass-input",
    protocolId: STANDALONE_SCORE_PROTOCOL_ID,
    status: "frozen-before-single-score-pass",
    debateNumber: finalLedger.debateNumber,
    debateId: finalLedger.debateId,
    finalLedger: {
      path: paths.finalLedger,
      sha256: sha256(bytes(paths.finalLedger))
    },
    scoreCalculator: fileRecord(
      "scripts/lib/assessment-production-standalone-debate-v1.mjs",
      ROOT
    ),
    dimensionCalculator: fileRecord(
      "scripts/lib/reassessment-scoring.mjs",
      ROOT
    ),
    scorePassMaximum: 1,
    modelAuthoredTotalsPermitted: false,
    manualScoreOverridesPermitted: false
  });
  console.log(
    `Standalone resolved ledger frozen: ${finalLedger.moves.length} moves; score pass is not yet run.`
  );
}

function runSingleScorePass() {
  assert.equal(existsSync(absolute(paths.scoreOutput)), false, "score output already exists; a rerun is forbidden");
  assert.equal(existsSync(absolute(paths.scoreAttestation)), false, "score attestation already exists; a rerun is forbidden");
  const { inventory, passA, passB } = validateFrozenInputBoundary({
    requirePasses: true
  });
  const input = json(paths.scoreInput);
  assert.equal(input.status, "frozen-before-single-score-pass");
  assert.equal(sha256(bytes(paths.finalLedger)), input.finalLedger.sha256);
  assert.equal(
    sha256(bytes(input.scoreCalculator.path)),
    input.scoreCalculator.sha256,
    "score calculator changed after preregistration"
  );
  assert.equal(
    sha256(bytes(input.dimensionCalculator.path)),
    input.dimensionCalculator.sha256,
    "dimension calculator changed after preregistration"
  );
  const finalLedger = json(paths.finalLedger);
  const scores = deriveStandaloneScores(finalLedger);
  const stability = validateStandaloneScoreStability({
    inventory,
    passA,
    passB,
    finalScores: scores
  });
  scores.scoreStability = {
    status: stability.status,
    meanAbsoluteDistance: stability.meanAbsoluteDistance,
    maximumDistance: stability.maximumDistance,
    maximumExcursion: stability.maximumExcursion,
    directionPassed: stability.directionPassed
  };
  writeNewJson(paths.scoreOutput, scores);
  writeNewJson(paths.scoreAttestation, {
    schemaVersion: "1.0-standalone-score-pass-attestation",
    protocolId: STANDALONE_SCORE_PROTOCOL_ID,
    status: "single-score-pass-complete-and-frozen",
    debateNumber: scores.debateNumber,
    debateId: scores.debateId,
    executedAt: new Date().toISOString(),
    ordinal: 1,
    maximumPermitted: 1,
    input: { path: paths.scoreInput, sha256: sha256(bytes(paths.scoreInput)) },
    output: { path: paths.scoreOutput, sha256: sha256(bytes(paths.scoreOutput)) },
    modelAuthoredTotals: 0,
    manualScoreOverrides: 0,
    rerunPermitted: false
  });
  console.log(
    `Standalone single score pass complete: pro ${scores.overall.pro.score}, con ${scores.overall.con.score}; ordinal 1 of 1.`
  );
}

function buildProductionAdapter() {
  const finalLedger = json(paths.finalLedger);
  const scoreOutput = json(paths.scoreOutput);
  const attestation = json(paths.scoreAttestation);
  const publication = json(paths.publication);
  assert.equal(
    publication.candidate.motion,
    json(paths.inventory).motion,
    "publication motion differs from the frozen central question"
  );
  assert.equal(attestation.ordinal, 1);
  assert.equal(attestation.maximumPermitted, 1);
  const replayed = deriveStandaloneScores(finalLedger);
  const { scoreStability: _scoreStability, ...storedScoreOutput } = scoreOutput;
  assert.equal(canonicalJson(replayed), canonicalJson(storedScoreOutput), "score output differs from repository replay");
  const candidateAudit = validateStandaloneCandidate(publication.candidate, scoreOutput);
  const evidencePaths = {
    authorization: paths.authorization,
    manifest: paths.manifest,
    sourceLock: paths.sourceLock,
    inventory: paths.inventory,
    judgmentPacket: paths.judgmentPacket,
    passA: paths.passA,
    passB: paths.passB,
    disagreements: paths.disagreements,
    audio: paths.audio,
    adjudicationPacket: paths.adjudicationPacket,
    adjudication: paths.adjudication,
    finalLedger: paths.finalLedger,
    scoreInput: paths.scoreInput,
    scoreOutput: paths.scoreOutput,
    scoreAttestation: paths.scoreAttestation,
    publication: paths.publication,
    publicationMotionCorrection: paths.publicationMotionCorrection,
    publicationCommentaryCorrection: paths.publicationCommentaryCorrection,
    postPublicationRendering: paths.postPublicationRendering,
    events: paths.events,
    transcript: ".assessment-cache/captions/0-8n2SGFSL8/transcript.txt"
  };
  const evidenceLocks = Object.fromEntries(
    Object.entries(evidencePaths).map(([key, value]) => [key, fileRecord(value, ROOT)])
  );
  const adapter = {
    schemaVersion: STANDALONE_SITE_LEDGER_ADAPTER_VERSION,
    protocolId: STANDALONE_PROTOCOL_ID,
    status: "frozen-standalone-site-ledger-adapter",
    productionCanary: false,
    standalonePostCampaign: true,
    campaignBatch: null,
    debateNumber: scoreOutput.debateNumber,
    debateId: scoreOutput.debateId,
    model: "5.6 Sol",
    rubric: "Slugfester Reassessment Rubric v2",
    scoreProtocolId: STANDALONE_SCORE_PROTOCOL_ID,
    sourceLocks: json(paths.manifest).sourceLocks,
    evidenceLocks,
    calculated: scoreOutput,
    audit: {
      sections: candidateAudit.sections,
      moves: candidateAudit.moves,
      repositoryDerivedScores: true,
      modelAuthoredTotals: 0,
      manualScoreOverrides: 0,
      scorePasses: 1,
      batch18Selected: false,
      campaignEvidenceChanges: 0,
      calibrationEvidenceChanges: 0,
      closureEvidenceChanges: 0
    }
  };
  writeNewJson(paths.productionLedger, adapter);
  console.log(
    `Standalone production adapter frozen: ${candidateAudit.sections} sections, ${candidateAudit.moves} moves.`
  );
}

function audit({ repositoryOnly = false } = {}) {
  const { inventory, inventoryValidation, passA, passB } =
    validateFrozenInputBoundary({ requirePasses: true, repositoryOnly });
  const disagreements = json(paths.disagreements);
  const adjudication = json(paths.adjudication);
  validateStandaloneAdjudication(adjudication, disagreements);
  const audio = json(paths.audio);
  assert.equal(audio.status, "complete");
  assert.equal(audio.audit.unresolvedAttributionChecks, 0);
  const attestation = json(paths.scoreAttestation);
  assert.equal(attestation.ordinal, 1);
  assert.equal(attestation.maximumPermitted, 1);
  assert.equal(attestation.output.sha256, sha256(bytes(paths.scoreOutput)));
  const finalLedger = json(paths.finalLedger);
  const scores = json(paths.scoreOutput);
  const { scoreStability: _scoreStability, ...storedScores } = scores;
  assert.equal(canonicalJson(deriveStandaloneScores(finalLedger)), canonicalJson(storedScores));
  const stability = validateStandaloneScoreStability({
    inventory,
    passA,
    passB,
    finalScores: scores
  });
  const publication = json(paths.publication);
  const motionCorrection = json(paths.publicationMotionCorrection);
  const commentaryCorrection = json(paths.publicationCommentaryCorrection);
  assert.equal(motionCorrection.status, "applied-once-and-frozen");
  assert.equal(commentaryCorrection.status, "applied-once-and-frozen");
  assert.equal(publication.candidate.motion, inventory.motion);
  for (const side of ["pro", "con"]) {
    assert.equal(
      publication.candidate.overall[side].blunders.length >= 2,
      true,
      `${side}: corrected Overall Commentary must contain at least two material blunders`
    );
  }
  const candidateAudit = validateStandaloneCandidate(publication.candidate, scores);
  const production = debates.find((debate) => debate.number === "196");
  assert.deepEqual(
    publicationComparable(production),
    publicationComparable(publication.candidate),
    "production debate differs from frozen publication candidate outside reader-facing note cleanup"
  );
  const adapter = json(paths.productionLedger);
  validateStandaloneSiteLedgerAdapter({
    adapter,
    candidate: production,
    repositoryOnly,
    root: ROOT
  });
  const rendering = json(paths.rendering);
  assert.equal(rendering.status, "passed-standalone-production-rendering");
  assert.equal(rendering.audit.runtimeFailures, 0);
  assert.equal(rendering.audit.horizontalOverflowFailures, 0);
  assert.equal(rendering.audit.emptyArgumentCards, 0);
  assert.equal(rendering.audit.viewports, 2);
  assert.equal(rendering.audit.screenshots >= 4, true);
  const postPublicationRendering = json(paths.postPublicationRendering);
  assert.equal(postPublicationRendering.status, "passed-post-publication-rendering-audit");
  assert.equal(postPublicationRendering.audit.runtimeFailures, 0);
  assert.equal(postPublicationRendering.audit.horizontalOverflowFailures, 0);
  assert.equal(postPublicationRendering.audit.visibleCorrectionsVerified, 3);
  assert.equal(postPublicationRendering.audit.temporaryBrowsersRemaining, 0);
  const validation = json(paths.validation);
  assert.equal(validation.status, "passed");
  assert.equal(validation.debateNumber, "196");
  assert.equal(validation.directCostUsd, 0);
  console.log(
    `Standalone debate audit passed: Debate 196, ${inventoryValidation.moves} moves, ${candidateAudit.sections} sections, pro ${scores.overall.pro.score}, con ${scores.overall.con.score}, ${disagreements.disputes.length} disputes, ${audio.audit.requiredAttributionChecks} audio checks, 2 viewports, $0 direct incremental cost (${repositoryOnly ? "repository-only hash replay" : "full replay including local source bytes"}); score stability mean ${stability.meanAbsoluteDistance}, max ${stability.maximumDistance}, excursion ${stability.maximumExcursion}.`
  );
}

const args = new Set(process.argv.slice(2));
const modes = [
  "--write-disagreements",
  "--assemble-ledger",
  "--score-once",
  "--build-adapter",
  "--audit"
].filter((mode) => args.has(mode));
assert.equal(modes.length, 1, "choose exactly one execution mode");
for (const argument of args) {
  assert.equal(
    [modes[0], "--repository-only"].includes(argument),
    true,
    `unknown argument: ${argument}`
  );
}
if (modes[0] === "--write-disagreements") writeDisagreements();
if (modes[0] === "--assemble-ledger") assembleFinalLedger();
if (modes[0] === "--score-once") runSingleScorePass();
if (modes[0] === "--build-adapter") buildProductionAdapter();
if (modes[0] === "--audit")
  audit({ repositoryOnly: args.has("--repository-only") });
