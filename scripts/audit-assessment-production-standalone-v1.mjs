#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
const rawArgs = process.argv.slice(2);
const debateFlagIndex = rawArgs.indexOf("--debate");
const requestedDebateNumber =
  debateFlagIndex >= 0 ? rawArgs[debateFlagIndex + 1] : null;
if (debateFlagIndex >= 0) {
  assert.match(requestedDebateNumber ?? "", /^\d{2,}$/);
}
const registryBootstrap = JSON.parse(
  readFileSync(path.join(ROOT, STANDALONE_ROOT, "registry.json"), "utf8")
);
const selectedRegistryRecord = registryBootstrap.debates.find(
  (record) => record.debateNumber === (requestedDebateNumber ?? "196")
);
assert.ok(
  selectedRegistryRecord,
  `standalone registry does not contain Debate ${requestedDebateNumber ?? "196"}`
);
const DEBATE_NUMBER = selectedRegistryRecord.debateNumber;
const DEBATE_ROOT = selectedRegistryRecord.root;
const VIDEO_ID = selectedRegistryRecord.videoId;
const paths = {
  registry: `${STANDALONE_ROOT}/registry.json`,
  authorization: `${DEBATE_ROOT}/authorization.json`,
  manifest: `${DEBATE_ROOT}/manifest.json`,
  sourceLock: `${DEBATE_ROOT}/source/source-lock.json`,
  events: `.assessment-cache/captions/${VIDEO_ID}/events.json`,
  transcript: `.assessment-cache/captions/${VIDEO_ID}/transcript.txt`,
  inventory: `${DEBATE_ROOT}/inventory/inventory.json`,
  judgmentPacket: `${DEBATE_ROOT}/judgments/judgment-packet.json`,
  judgmentExecution: `${DEBATE_ROOT}/judgments/execution.json`,
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
  publicationContentParityCorrection:
    selectedRegistryRecord.contentParity?.correctionPath,
  publicationBeforeContentParityRepair:
    selectedRegistryRecord.contentParity?.preservedOutputPath,
  publicationContentParityAudit: selectedRegistryRecord.contentParity?.auditPath,
  rendering: `${DEBATE_ROOT}/rendering/rendering-audit.json`,
  postPublicationRendering: `${DEBATE_ROOT}/rendering/post-publication-audit-1.json`,
  validation: `${DEBATE_ROOT}/validation-summary.json`,
  productionLedger: selectedRegistryRecord.productionLedger.path
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
const publicationWordCount = (value) =>
  String(value ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
const validatePublicationIdentity = (candidate, authorization) => {
  for (const side of ["pro", "con"]) {
    const productionSide = candidate.sides?.[side];
    if (selectedRegistryRecord.validationProfile === "semantic-balanced-v1") {
      assert.equal(
        productionSide?.speaker,
        authorization.identity[side].speaker,
        `${side}: publication speaker differs from the frozen identity`
      );
    } else {
      assert.equal(
        typeof productionSide?.speaker === "string" &&
          productionSide.speaker.trim().length > 0,
        true,
        `${side}: legacy publication speaker is missing`
      );
    }
    assert.equal(
      typeof productionSide?.name === "string" &&
        productionSide.name.trim().length > 0,
      true,
      `${side}: publication position label is missing`
    );
    assert.notEqual(
      productionSide.name,
      productionSide.speaker,
      `${side}: publication position label must not repeat the speaker name`
    );
    assert.equal(
      publicationWordCount(candidate.quotes?.[side]?.context) >= 12,
      true,
      `${side}: publication quote context must contain at least 12 words`
    );
    const extension = candidate.logicalExtension?.[side];
    assert.equal(
      Array.isArray(extension?.finalArgument?.premises) &&
        extension.finalArgument.premises.length >= 4,
      true,
      `${side}: AI Extension final argument must contain at least four premises`
    );
    assert.equal(
      publicationWordCount(extension?.finalArgument?.conclusion) >= 15,
      true,
      `${side}: AI Extension conclusion must contain at least 15 words`
    );
    assert.equal(
      Array.isArray(extension?.newArguments) &&
        extension.newArguments.length >= 2 &&
        extension.newArguments.every(
          (argument) => publicationWordCount(argument.text) >= 45
        ),
      true,
      `${side}: every AI Extension new argument must contain at least 45 words`
    );
  }
  assert.match(
    candidate.scoringNote ?? "",
    /AI-generated/i,
    "publication scoring note must explicitly disclose AI-generated scores"
  );
  const critiques = candidate.sections.flatMap((section) =>
    section.exchanges.flatMap((exchange) =>
      ["pro", "con"].flatMap((side) =>
        exchange[side]?.critique ? [exchange[side].critique] : []
      )
    )
  );
  const critiqueLabels = [
    "Strongest feature:",
    "Principal limitation:",
    "Live burden:",
    "Locked score:"
  ];
  for (const critique of critiques) {
    assert.equal(
      publicationWordCount(critique) >= 105 &&
        publicationWordCount(critique) <= 130,
      true,
      "publication critique must contain 105-130 words"
    );
    assert.equal(
      critique.length >= 880,
      true,
      "publication critique must contain at least 880 characters"
    );
    const parts = critique
      .split(/(?=Principal limitation:|Live burden:|Locked score:)/)
      .map((part) => part.trim());
    assert.equal(parts.length, 4, "publication critique must contain four labeled sentences");
    assert.equal(
      parts.every(
        (part, index) =>
          part.startsWith(critiqueLabels[index]) && /[.!?]$/.test(part)
      ),
      true,
      "publication critique labels or terminal punctuation are invalid"
    );
    assert.equal(
      (critique.match(/[.!?](?=\s|$)/g) ?? []).length,
      4,
      "publication critique must contain exactly four sentences"
    );
    assert.equal(
      /[\u3400-\u9fff\uac00-\ud7af\ufffd]/u.test(critique),
      false,
      "publication critique contains unexpected script or replacement characters"
    );
  }
  const critiqueComponents = critiques.flatMap((critique) =>
    critique.split(
      /(?=Principal limitation:|Live burden:|Locked score:)/
    )
  );
  assert.equal(
    new Set(critiqueComponents).size >= Math.ceil(critiqueComponents.length * 0.8),
    true,
    "publication critiques are excessively templated across locked moves"
  );
  const tokenizedCritiques = critiques.map((critique) =>
    critique
      .toLowerCase()
      .replace(/[^a-z0-9/]+/g, " ")
      .trim()
      .split(/\s+/)
  );
  const ngramSize = 6;
  const minimumDocuments = Math.max(3, Math.ceil(critiques.length * 0.25));
  const documentCounts = new Map();
  for (const tokens of tokenizedCritiques) {
    const seen = new Set();
    for (let index = 0; index <= tokens.length - ngramSize; index += 1) {
      seen.add(tokens.slice(index, index + ngramSize).join(" "));
    }
    for (const value of seen) {
      documentCounts.set(value, (documentCounts.get(value) ?? 0) + 1);
    }
  }
  const commonNgrams = new Set(
    [...documentCounts]
      .filter(([, count]) => count >= minimumDocuments)
      .map(([value]) => value)
  );
  const repeatedRatios = tokenizedCritiques.map((tokens) => {
    const covered = new Set();
    for (let index = 0; index <= tokens.length - ngramSize; index += 1) {
      if (!commonNgrams.has(tokens.slice(index, index + ngramSize).join(" "))) {
        continue;
      }
      for (let offset = 0; offset < ngramSize; offset += 1) {
        covered.add(index + offset);
      }
    }
    return covered.size / tokens.length;
  });
  assert.equal(
    repeatedRatios.reduce((sum, value) => sum + value, 0) /
        repeatedRatios.length <=
      0.15 && Math.max(...repeatedRatios) <= 0.25,
    true,
    "publication critiques repeat too much shared six-word boilerplate"
  );
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
  for (const key of ["debateNumber", "debateId", "videoId", "root"]) {
    const values = registry.debates.map((record) => record[key]);
    assert.equal(new Set(values).size, values.length, `registry: duplicate ${key}`);
  }
  const ledgerPaths = registry.debates.map(
    (record) => record.productionLedger?.path
  );
  assert.equal(
    new Set(ledgerPaths).size,
    ledgerPaths.length,
    "registry: duplicate production ledger path"
  );
  for (const record of registry.debates) {
    assert.match(record.debateNumber, /^\d{2,}$/);
    assert.ok(
      ["frozen-legacy-v1", "semantic-balanced-v1"].includes(
        record.validationProfile
      ),
      `Debate ${record.debateNumber}: unknown validation profile`
    );
    assert.equal(
      record.root,
      `${STANDALONE_ROOT}/debate-${record.debateNumber}`,
      `Debate ${record.debateNumber}: registry root does not match its number`
    );
    assert.equal(
      path.posix.dirname(record.productionLedger.path),
      "docs/assessment-ledgers",
      `Debate ${record.debateNumber}: production ledger is outside its allowed directory`
    );
    if (record.contentParity) {
      for (const value of Object.values(record.contentParity)) {
        assert.equal(
          value.startsWith(`${record.root}/publication/`),
          true,
          `Debate ${record.debateNumber}: content-parity evidence is outside its publication directory`
        );
      }
    }
  }
  assert.equal(selectedRegistryRecord.root, DEBATE_ROOT);
  assert.equal(
    selectedRegistryRecord.productionLedger.path,
    paths.productionLedger
  );
  assert.equal(authorization.protocolId, STANDALONE_PROTOCOL_ID);
  assert.equal(authorization.status, "authorized-and-frozen");
  assert.equal(authorization.identity.debateNumber, DEBATE_NUMBER);
  assert.equal(authorization.identity.debateId, selectedRegistryRecord.debateId);
  assert.equal(authorization.identity.videoId, VIDEO_ID);
  assert.equal(authorization.execution.primaryJudgments, 2);
  assert.equal(authorization.execution.oneDeterministicScorePass, true);
  assert.equal(authorization.historicalBoundary.campaignBatch, null);
  assert.equal(manifest.protocolId, STANDALONE_PROTOCOL_ID);
  assert.equal(manifest.status, "inputs-frozen-before-judgment");
  assert.equal(manifest.debateNumber, DEBATE_NUMBER);
  assert.equal(manifest.debateId, selectedRegistryRecord.debateId);
  assert.equal(manifest.videoId, VIDEO_ID);
  assert.equal(manifest.scoringControls.oneScorePass, true);
  assert.equal(sourceLock.status, "complete-and-hash-locked");
  assert.equal(sourceLock.identity.videoId, VIDEO_ID);
  assert.equal(sourceLock.identity.canonicalUrl, authorization.identity.canonicalUrl);
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
  assert.equal(inventory.debateNumber, DEBATE_NUMBER);
  assert.equal(inventory.debateId, selectedRegistryRecord.debateId);
  assert.equal(
    inventory.schemaVersion,
    selectedRegistryRecord.validationProfile === "semantic-balanced-v1"
      ? "1.1-standalone-score-blind-inventory"
      : "1.0-standalone-score-blind-inventory"
  );
  for (const side of ["pro", "con"]) {
    assert.equal(
      inventory.routes.find((route) => route.side === side)?.speaker,
      authorization.identity[side].speaker,
      `${side}: authorization and inventory speakers differ`
    );
  }
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
  const execution = json(paths.judgmentExecution);
  assert.equal(execution.status, "complete-and-schema-valid");
  assert.equal(execution.debateNumber, Number(DEBATE_NUMBER));
  assert.equal(execution.debateId, selectedRegistryRecord.debateId);
  assert.equal(execution.execution.model, "gpt-5.6-sol");
  assert.equal(execution.execution.displayModel, "5.6 Sol");
  assert.equal(execution.execution.reasoningEffort, "low");
  assert.equal(execution.execution.freshContextPerPass, true);
  assert.equal(execution.execution.forkTurns, "none");
  assert.equal(execution.execution.inventorySha256, inventorySha256);
  assert.deepEqual(
    execution.passes.map((pass) => pass.pass),
    ["pass-a", "pass-b"]
  );
  for (const pass of execution.passes) {
    const outputPath = pass.pass === "pass-a" ? paths.passA : paths.passB;
    assert.equal(pass.outputPath, outputPath);
    assert.equal(pass.outputSha256, sha256(bytes(outputPath)));
    assert.equal(pass.judgmentCount, inventory.moves.length);
    assert.equal(pass.validationStatus, "passed");
  }
  return { inventory, events, inventoryValidation, inventorySha256, passA, passB };
}

function writeJudgmentPacket() {
  const { inventory } = validateFrozenInputBoundary();
  const authorization = json(paths.authorization);
  const packet = {
    schemaVersion: "1.0-standalone-score-blind-judgment-packet",
    protocolId: STANDALONE_PROTOCOL_ID,
    status: "frozen-identical-evidence-packet",
    frozenAt: new Date().toISOString(),
    debateNumber: inventory.debateNumber,
    debateId: inventory.debateId,
    assessmentModel: "5.6 Sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    motion: inventory.motion,
    sides: {
      pro: authorization.identity.pro,
      con: authorization.identity.con
    },
    evidenceLocks: {
      inventory: fileRecord(paths.inventory, ROOT),
      events: fileRecord(paths.events, ROOT),
      transcript: fileRecord(paths.transcript, ROOT),
      workflow: fileRecord("docs/assessment-production-workflow.md", ROOT),
      rubric: fileRecord("docs/reassessment-rubric-v2.1.md", ROOT),
      validator: fileRecord(
        "scripts/lib/assessment-production-standalone-debate-v1.mjs",
        ROOT
      )
    },
    isolationBoundary: {
      legacyAssessmentsUnavailable: true,
      calculatedTotalsUnavailable: true,
      winnerLabelsUnavailable: true,
      otherJudgmentUnavailable: true,
      publicationProseUnavailable: true,
      otherDebatesUnavailable: true,
      aggregateRankingsUnavailable: true,
      priorScoresUnavailable: true,
      aiExtensionsUnavailable: true
    },
    instructions: {
      reviewCompleteLockedInventory: true,
      judgeEveryMoveExactlyOnce: true,
      preserveInventoryStructure: true,
      doNotAddDropMergeOrSplitMoves: true,
      doNotChangeSourceSpansSpeakersSectionsWeightsImportanceOrBurdenLinks: true,
      scoreTranscriptPerformanceNotWorldviewTruth: true,
      supplyRatingsAndRationalesOnly: true,
      calculatedMoveSectionAndOverallScoresForbidden: true,
      winnerForbidden: true,
      publicationProseForbidden: true
    },
    dimensionKeys: [
      "logicalCoherence",
      "evidenceWarrant",
      "responsiveness",
      "relevanceBurden",
      "precisionClarity",
      "calibrationCharity"
    ],
    ratingControls: {
      minimum: 0,
      maximum: 100,
      integerOnly: true,
      rationaleMinimumCharacters: 40,
      bands: {
        "95-100": "Exceptional and unusually complete",
        "85-94": "Very strong",
        "75-84": "Strong or competent",
        "65-74": "Mixed",
        "50-64": "Weak",
        "25-49": "Very weak",
        "0-24": "Non-performance"
      }
    },
    burdenAdjustmentControls: {
      minimum: -5,
      maximum: 5,
      integerOnly: true,
      nonzeroRequiresDistinctDebateWideConsequence: true,
      nonzeroRequiresBurdenCompletionEffect: true,
      nonzeroRequiresNotAlreadyScored: true,
      duplicateCaptureForcesZero: true
    },
    outputContract: {
      schemaVersion: "1.0-standalone-primary-judgment",
      protocolId: STANDALONE_PROTOCOL_ID,
      status: "complete-and-schema-valid",
      reviewerRole: "isolated-score-blind-primary-judge",
      assessmentModel: "5.6 Sol",
      reasoningEffort: "low",
      inventorySha256: fileRecord(paths.inventory, ROOT).sha256,
      judgmentFields: {
        moveId: "exact locked move ID in inventory order",
        assessmentConfidence: "high, medium, or low",
        dimensions:
          "exactly the six named dimension objects, each with integer value and rationale"
      },
      burdenCompletionAdjustmentFields: {
        value: "integer -5 through 5",
        rationale: "source-grounded explanation",
        eligibility: [
          "distinctDebateWideConsequence",
          "affectsBurdenCompletion",
          "notAlreadyScored",
          "affectedBurdenIds",
          "completionCriterion",
          "relatedMoveIds",
          "distinctConsequence",
          "alreadyCapturedBy",
          "counterfactual"
        ]
      },
      requiredAuditBooleans: [
        "completeLockedInventoryReviewed",
        "allMovesJudgedOnce",
        "ratingsOnlyNoCalculatedScores",
        "publicationBlind",
        "scoreBlind"
      ]
    }
  };
  writeNewJson(paths.judgmentPacket, packet);
  console.log(
    `Standalone judgment packet frozen: Debate ${DEBATE_NUMBER}, ${inventory.moves.length} moves.`
  );
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
  const authorization = json(paths.authorization);
  assert.equal(
    publication.candidate.motion,
    json(paths.inventory).motion,
    "publication motion differs from the frozen central question"
  );
  assert.equal(attestation.ordinal, 1);
  assert.equal(attestation.maximumPermitted, 1);
  validatePublicationIdentity(publication.candidate, authorization);
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
    judgmentExecution: paths.judgmentExecution,
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
    events: paths.events,
    transcript: paths.transcript
  };
  for (const [key, value] of [
    ["publicationMotionCorrection", paths.publicationMotionCorrection],
    ["publicationCommentaryCorrection", paths.publicationCommentaryCorrection],
    ["postPublicationRendering", paths.postPublicationRendering]
  ]) {
    if (existsSync(absolute(value))) evidencePaths[key] = value;
  }
  for (const [key, value] of [
    ["publicationContentParityCorrection", paths.publicationContentParityCorrection],
    ["publicationBeforeContentParityRepair", paths.publicationBeforeContentParityRepair],
    ["publicationContentParityAudit", paths.publicationContentParityAudit]
  ]) {
    if (value && existsSync(absolute(value))) evidencePaths[key] = value;
  }
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
  const authorization = json(paths.authorization);
  const disagreements = json(paths.disagreements);
  const adjudication = json(paths.adjudication);
  validateStandaloneAdjudication(adjudication, disagreements);
  const audio = json(paths.audio);
  assert.equal(audio.status, "complete");
  assert.equal(audio.audit.unresolvedAttributionChecks, 0);
  assert.deepEqual(
    audio.triggeredMoveIds,
    inventory.audit.belowHighAttributionMoveIds,
    "audio verification triggers differ from the locked inventory"
  );
  assert.equal(audio.inventory.sha256, sha256(bytes(paths.inventory)));
  assert.equal(audio.checks.length, audio.triggeredMoveIds.length);
  assert.deepEqual(
    audio.checks.map((check) => check.moveId),
    audio.triggeredMoveIds,
    "audio checks differ from their triggered move IDs"
  );
  assert.equal(
    audio.audit.completedAttributionChecks,
    audio.audit.requiredAttributionChecks
  );
  const attestation = json(paths.scoreAttestation);
  const scoreInput = json(paths.scoreInput);
  assert.equal(attestation.ordinal, 1);
  assert.equal(attestation.maximumPermitted, 1);
  assert.equal(attestation.rerunPermitted, false);
  assert.equal(attestation.modelAuthoredTotals, 0);
  assert.equal(attestation.manualScoreOverrides, 0);
  assert.equal(attestation.input.sha256, sha256(bytes(paths.scoreInput)));
  assert.equal(attestation.output.sha256, sha256(bytes(paths.scoreOutput)));
  const finalLedger = json(paths.finalLedger);
  assert.equal(scoreInput.scorePassMaximum, 1);
  assert.equal(scoreInput.modelAuthoredTotalsPermitted, false);
  assert.equal(scoreInput.manualScoreOverridesPermitted, false);
  assert.equal(scoreInput.finalLedger.sha256, sha256(bytes(paths.finalLedger)));
  const scores = json(paths.scoreOutput);
  assert.equal(scores.audit.scorePassOrdinal, 1);
  assert.equal(scores.audit.modelAuthoredTotals, 0);
  assert.equal(scores.audit.manualScoreOverrides, 0);
  const { scoreStability: _scoreStability, ...storedScores } = scores;
  assert.equal(canonicalJson(deriveStandaloneScores(finalLedger)), canonicalJson(storedScores));
  const stability = validateStandaloneScoreStability({
    inventory,
    passA,
    passB,
    finalScores: scores
  });
  const publication = json(paths.publication);
  if (existsSync(absolute(paths.publicationMotionCorrection))) {
    assert.equal(
      json(paths.publicationMotionCorrection).status,
      "applied-once-and-frozen"
    );
  }
  if (existsSync(absolute(paths.publicationCommentaryCorrection))) {
    assert.equal(
      json(paths.publicationCommentaryCorrection).status,
      "applied-once-and-frozen"
    );
  }
  if (paths.publicationContentParityCorrection) {
    const contentParityCorrection = json(paths.publicationContentParityCorrection);
    const contentParityAudit = json(paths.publicationContentParityAudit);
    assert.equal(contentParityCorrection.status, "applied-once-and-frozen");
    assert.equal(contentParityCorrection.audit.judgmentChanges, 0);
    assert.equal(contentParityCorrection.audit.scoreChanges, 0);
    assert.equal(contentParityCorrection.audit.moveChanges, 0);
    assert.equal(contentParityCorrection.audit.tagChanges, 0);
    assert.equal(
      contentParityCorrection.evidence.before.sha256,
      sha256(bytes(paths.publicationBeforeContentParityRepair))
    );
    assert.equal(
      contentParityCorrection.evidence.after.sha256,
      sha256(bytes(paths.publication))
    );
    assert.equal(
      contentParityCorrection.evidence.contentParityAudit.sha256,
      sha256(bytes(paths.publicationContentParityAudit))
    );
    assert.equal(contentParityAudit.status, "passed-content-parity-audit");
    assert.equal(contentParityAudit.debateNumber, DEBATE_NUMBER);
  }
  assert.equal(publication.candidate.motion, inventory.motion);
  assert.equal(publication.candidate.motion, authorization.identity.motion);
  validatePublicationIdentity(publication.candidate, authorization);
  for (const side of ["pro", "con"]) {
    assert.equal(
      publication.candidate.overall[side].blunders.length >= 2,
      true,
      `${side}: corrected Overall Commentary must contain at least two material blunders`
    );
  }
  const candidateAudit = validateStandaloneCandidate(publication.candidate, scores);
  const production = debates.find((debate) => debate.number === DEBATE_NUMBER);
  assert.ok(production, `Debate ${DEBATE_NUMBER}: production record missing`);
  assert.equal(production.id, selectedRegistryRecord.debateId);
  assert.equal(production.motion, authorization.identity.motion);
  assert.deepEqual(
    publicationComparable(production),
    publicationComparable(publication.candidate),
    "production debate differs from frozen publication candidate outside reader-facing note cleanup"
  );
  const adapter = json(paths.productionLedger);
  assert.equal(adapter.debateNumber, DEBATE_NUMBER);
  assert.equal(adapter.debateId, selectedRegistryRecord.debateId);
  assert.equal(adapter.calculated.debateNumber, DEBATE_NUMBER);
  assert.equal(adapter.calculated.debateId, selectedRegistryRecord.debateId);
  assert.equal(adapter.audit.scorePasses, 1);
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
  if (existsSync(absolute(paths.postPublicationRendering))) {
    const postPublicationRendering = json(paths.postPublicationRendering);
    assert.equal(postPublicationRendering.status, "passed-post-publication-rendering-audit");
    assert.equal(postPublicationRendering.audit.runtimeFailures, 0);
    assert.equal(postPublicationRendering.audit.horizontalOverflowFailures, 0);
    assert.equal(postPublicationRendering.audit.visibleCorrectionsVerified, 3);
    assert.equal(postPublicationRendering.audit.temporaryBrowsersRemaining, 0);
  }
  const validation = json(paths.validation);
  assert.equal(validation.status, "passed");
  assert.equal(validation.debateNumber, DEBATE_NUMBER);
  const directCostUsd =
    audio.cost.knownSuccessfulCallCostUsd ?? audio.cost.directCostUsd;
  assert.equal(validation.directCostUsd, directCostUsd);
  console.log(
    `Standalone debate audit passed: Debate ${DEBATE_NUMBER}, ${inventoryValidation.moves} moves, ${candidateAudit.sections} sections, pro ${scores.overall.pro.score}, con ${scores.overall.con.score}, ${disagreements.disputes.length} disputes, ${audio.audit.requiredAttributionChecks} audio checks, 2 viewports, $${directCostUsd} known direct incremental cost (${repositoryOnly ? "repository-only hash replay" : "full replay including local source bytes"}); score stability mean ${stability.meanAbsoluteDistance}, max ${stability.maximumDistance}, excursion ${stability.maximumExcursion}.`
  );
}

const args = new Set(rawArgs);
const modes = [
  "--write-judgment-packet",
  "--write-disagreements",
  "--assemble-ledger",
  "--score-once",
  "--build-adapter",
  "--audit"
].filter((mode) => args.has(mode));
assert.equal(modes.length, 1, "choose exactly one execution mode");
for (let index = 0; index < rawArgs.length; index += 1) {
  const argument = rawArgs[index];
  if (argument === "--debate") {
    index += 1;
    continue;
  }
  assert.equal(
    [modes[0], "--repository-only"].includes(argument),
    true,
    `unknown argument: ${argument}`
  );
}
if (modes[0] !== "--audit") {
  assert.ok(requestedDebateNumber, "write modes require --debate NNN");
}
if (modes[0] === "--audit" && !requestedDebateNumber) {
  for (const record of registryBootstrap.debates.filter(
    (item) => item.status === "published-and-frozen"
  )) {
    const childArgs = [
      process.argv[1],
      "--audit",
      "--debate",
      record.debateNumber,
      ...(args.has("--repository-only") ? ["--repository-only"] : [])
    ];
    const result = spawnSync(process.execPath, childArgs, {
      cwd: ROOT,
      stdio: "inherit"
    });
    assert.equal(result.status, 0, `Debate ${record.debateNumber}: audit failed`);
  }
  process.exit(0);
}
if (modes[0] === "--write-judgment-packet") writeJudgmentPacket();
if (modes[0] === "--write-disagreements") writeDisagreements();
if (modes[0] === "--assemble-ledger") assembleFinalLedger();
if (modes[0] === "--score-once") runSingleScorePass();
if (modes[0] === "--build-adapter") buildProductionAdapter();
if (modes[0] === "--audit")
  audit({ repositoryOnly: args.has("--repository-only") });
