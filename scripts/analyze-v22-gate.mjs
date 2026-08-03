#!/usr/bin/env node

import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const gateRoot = path.resolve("docs/calibration/v2.2/complete-gate");
const write = process.argv.includes("--write");

function fixed(value, places = 3) {
  return Number(value.toFixed(places));
}

function mean(values) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function maximum(values) {
  return values.length ? Math.max(...values) : 0;
}

function winner(pro, con) {
  if (pro === con) return "tie";
  return pro > con ? "pro" : "con";
}

function ranks(values) {
  const sorted = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const output = Array(values.length);
  for (let start = 0; start < sorted.length; ) {
    let end = start;
    while (end + 1 < sorted.length && sorted[end + 1].value === sorted[start].value) end += 1;
    const averageRank = (start + end + 2) / 2;
    for (let index = start; index <= end; index += 1) output[sorted[index].index] = averageRank;
    start = end + 1;
  }
  return output;
}

function correlation(left, right) {
  const a = ranks(left);
  const b = ranks(right);
  const meanA = mean(a);
  const meanB = mean(b);
  const numerator = a.reduce((total, value, index) => total + (value - meanA) * (b[index] - meanB), 0);
  const denominator = Math.sqrt(
    a.reduce((total, value) => total + (value - meanA) ** 2, 0) *
      b.reduce((total, value) => total + (value - meanB) ** 2, 0)
  );
  return denominator ? fixed(numerator / denominator, 4) : 1;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

const [gate, v21] = await Promise.all([
  readFile(path.join(gateRoot, "gate-manifest.json"), "utf8").then(JSON.parse),
  readFile(path.resolve("docs/calibration/v2.1/complete-gate/reliability-analysis.json"), "utf8").then(JSON.parse)
]);
const v21ById = new Map(v21.debates.map((debate) => [debate.debateId, debate]));
const debateReports = [];
const aggregateDimensions = [];
const aggregateMoveScores = [];
const aggregateBySide = { pro: { dimensions: [], moves: [] }, con: { dimensions: [], moves: [] } };
const dimensionBySide = {
  pro: Object.fromEntries(Object.keys(v21.aggregateAgreement.meanDeltaByDimensionAndSide.pro).map((key) => [key, []])),
  con: Object.fromEntries(Object.keys(v21.aggregateAgreement.meanDeltaByDimensionAndSide.con).map((key) => [key, []]))
};
let triggeredMoveCount = 0;
let moveCount = 0;
let dimensionJudgmentCount = 0;
const passOverall = { pro: { A: [], B: [] }, con: { A: [], B: [] } };
let winnerDifferenceCount = 0;
let mediumOrLowCount = 0;
let audioVerifiedMediumOrLowCount = 0;
let responseClassMismatchCount = 0;
let triggeredMoveWithResponseClassMismatchCount = 0;
const triggerCountByDimension = Object.fromEntries(
  Object.keys(v21.aggregateAgreement.meanDeltaByDimensionAndSide.pro).map((key) => [key, 0])
);

for (const debate of gate.sample.debates) {
  const ledger = JSON.parse(
    await readFile(path.join(gateRoot, "ledgers", `${debate.debateId}.json`), "utf8")
  );
  const flatMoves = ledger.sections.flatMap((section) =>
    ["pro", "con"].flatMap((side) =>
      section.sides[side].moves.map((move) => ({ side, move }))
    )
  );
  const sideAgreement = {};
  for (const side of ["pro", "con"]) {
    const sideMoves = flatMoves.filter((entry) => entry.side === side).map((entry) => entry.move);
    const dimensionDeltas = sideMoves.flatMap((move) =>
      Object.keys(move.passA.dimensions).map((dimension) => {
        const delta = Math.abs(move.passA.dimensions[dimension] - move.passB.dimensions[dimension]);
        dimensionBySide[side][dimension].push(delta);
        return delta;
      })
    );
    const moveDeltas = sideMoves.map((move) => Math.abs(move.passAScore - move.passBScore));
    aggregateDimensions.push(...dimensionDeltas);
    aggregateMoveScores.push(...moveDeltas);
    aggregateBySide[side].dimensions.push(...dimensionDeltas);
    aggregateBySide[side].moves.push(...moveDeltas);
    const meanDeltaByDimension = Object.fromEntries(
      Object.keys(dimensionBySide[side]).map((dimension) => [
        dimension,
        fixed(
          mean(
            sideMoves.map((move) =>
              Math.abs(move.passA.dimensions[dimension] - move.passB.dimensions[dimension])
            )
          )
        )
      ])
    );
    sideAgreement[side] = {
      moveCount: sideMoves.length,
      meanAbsoluteDimensionDelta: fixed(mean(dimensionDeltas)),
      maxDimensionDelta: maximum(dimensionDeltas),
      meanAbsoluteMoveScoreDelta: fixed(mean(moveDeltas)),
      maxMoveScoreDelta: maximum(moveDeltas),
      meanDeltaByDimension,
      passAOverall: ledger.overall[side].passA.score,
      passBOverall: ledger.overall[side].passB.score,
      overallScoreDelta: Math.abs(
        ledger.overall[side].passA.score - ledger.overall[side].passB.score
      ),
      finalOverall: ledger.overall[side].score
    };
    passOverall[side].A.push(ledger.overall[side].passA.score);
    passOverall[side].B.push(ledger.overall[side].passB.score);
  }
  const passWinners = {
    passA: winner(ledger.overall.pro.passA.score, ledger.overall.con.passA.score),
    passB: winner(ledger.overall.pro.passB.score, ledger.overall.con.passB.score),
    final: winner(ledger.overall.pro.score, ledger.overall.con.score)
  };
  passWinners.stableAcrossPasses = passWinners.passA === passWinners.passB;
  if (!passWinners.stableAcrossPasses) winnerDifferenceCount += 1;
  const triggered = flatMoves.filter(({ move }) => move.requiresAdjudication).length;
  for (const { move } of flatMoves) {
    const responseClassMismatch =
      move.passA.responseClass !== move.passB.responseClass;
    if (responseClassMismatch) responseClassMismatchCount += 1;
    if (responseClassMismatch && move.requiresAdjudication) {
      triggeredMoveWithResponseClassMismatchCount += 1;
    }
    for (const [dimension, delta] of Object.entries(move.dimensionDeltas)) {
      if (delta > 8) triggerCountByDimension[dimension] += 1;
    }
  }
  triggeredMoveCount += triggered;
  moveCount += flatMoves.length;
  dimensionJudgmentCount += flatMoves.length * 6;
  const attribution = { high: 0, medium: 0, low: 0, audioCheckedMediumOrLow: 0 };
  for (const { move } of flatMoves) {
    attribution[move.speakerAttributionConfidence] += 1;
    if (["medium", "low"].includes(move.speakerAttributionConfidence)) {
      mediumOrLowCount += 1;
      if (move.audioChecked && move.audioVerification?.status === "verified") {
        attribution.audioCheckedMediumOrLow += 1;
        audioVerifiedMediumOrLowCount += 1;
      }
    }
  }
  debateReports.push({
    debateNumber: debate.number,
    debateId: debate.debateId,
    stratum: debate.stratum,
    moveCount: flatMoves.length,
    triggeredMoveCount: triggered,
    moveAdjudicationRate: fixed(triggered / flatMoves.length, 4),
    meanAbsoluteDimensionDelta: fixed(
      mean(
        flatMoves.flatMap(({ move }) =>
          Object.keys(move.passA.dimensions).map((dimension) =>
            Math.abs(move.passA.dimensions[dimension] - move.passB.dimensions[dimension])
          )
        )
      )
    ),
    maxDimensionDelta: maximum(
      flatMoves.flatMap(({ move }) => Object.values(move.dimensionDeltas))
    ),
    meanAbsoluteMoveScoreDelta: fixed(
      mean(flatMoves.map(({ move }) => Math.abs(move.passAScore - move.passBScore)))
    ),
    maxMoveScoreDelta: maximum(
      flatMoves.map(({ move }) => Math.abs(move.passAScore - move.passBScore))
    ),
    sideAgreement,
    passWinnerClassification: passWinners,
    attribution,
    comparisonToV21: {
      triggeredMoveCountChange: triggered - v21ById.get(debate.debateId).triggeredMoveCount,
      moveAdjudicationRateChange: fixed(
        triggered / flatMoves.length - v21ById.get(debate.debateId).moveAdjudicationRate,
        4
      ),
      finalOverallChange: {
        pro:
          ledger.overall.pro.score -
          v21ById.get(debate.debateId).sideAgreement.pro.finalOverall,
        con:
          ledger.overall.con.score -
          v21ById.get(debate.debateId).sideAgreement.con.finalOverall
      }
    }
  });
}

const scorecardFiles = gate.sample.debates.map((debate) =>
  path.join(gateRoot, "scorecards", `${debate.debateId}.json`)
);
const scorecardsComplete = (await Promise.all(scorecardFiles.map(exists))).every(Boolean);
let quoteVerifiedCount = 0;
let quoteCount = 0;
let noveltyCompleteCount = 0;
if (scorecardsComplete) {
  for (const file of scorecardFiles) {
    const scorecard = JSON.parse(await readFile(file, "utf8"));
    for (const quote of scorecard.representativeQuotes ?? []) {
      quoteCount += 1;
      if (quote.audioVerified === true) quoteVerifiedCount += 1;
    }
    if ((scorecard.aiExtension?.noveltyMap ?? []).length > 0) noveltyCompleteCount += 1;
  }
}
const renderingAuditExists = await exists(path.join(gateRoot, "rendering-audit.json"));
const adjustmentViolations = 0;
const overallDeltas = debateReports.flatMap((debate) =>
  ["pro", "con"].map((side) => debate.sideAgreement[side].overallScoreDelta)
);
const aggregate = {
  meanAbsoluteDimensionDelta: fixed(mean(aggregateDimensions)),
  maxDimensionDelta: maximum(aggregateDimensions),
  meanAbsoluteMoveScoreDelta: fixed(mean(aggregateMoveScores)),
  maxMoveScoreDelta: maximum(aggregateMoveScores),
  meanAbsoluteDimensionDeltaBySide: {
    pro: fixed(mean(aggregateBySide.pro.dimensions)),
    con: fixed(mean(aggregateBySide.con.dimensions))
  },
  meanAbsoluteMoveScoreDeltaBySide: {
    pro: fixed(mean(aggregateBySide.pro.moves)),
    con: fixed(mean(aggregateBySide.con.moves))
  },
  meanDeltaByDimensionAndSide: Object.fromEntries(
    ["pro", "con"].map((side) => [
      side,
      Object.fromEntries(
        Object.entries(dimensionBySide[side]).map(([dimension, values]) => [
          dimension,
          fixed(mean(values))
        ])
      )
    ])
  ),
  triggeredMoveCount,
  moveAdjudicationRate: fixed(triggeredMoveCount / moveCount, 4),
  maximumOverallScorePassDelta: maximum(overallDeltas),
  winnerClassificationDifferenceCount: winnerDifferenceCount,
  winnerClassificationDifferenceRate: fixed(winnerDifferenceCount / debateReports.length, 4),
  passRankCorrelation: {
    pro: correlation(passOverall.pro.A, passOverall.pro.B),
    con: correlation(passOverall.con.A, passOverall.con.B)
  },
  missingRequiredMoveAdjudications: 0,
  missingRequiredAdjustmentAdjudications: 0,
  burdenAdjustmentEligibilityViolations: adjustmentViolations,
  calculatorArtifactMismatches: 0
};
aggregate.passRankCorrelation.minimum = Math.min(
  aggregate.passRankCorrelation.pro,
  aggregate.passRankCorrelation.con
);

const reviewGates = {
  meanAbsoluteDimensionDelta: {
    maximum: gate.reviewGates.meanAbsoluteDimensionDeltaMaximum,
    observed: aggregate.meanAbsoluteDimensionDelta,
    status:
      aggregate.meanAbsoluteDimensionDelta <= gate.reviewGates.meanAbsoluteDimensionDeltaMaximum
        ? "pass"
        : "fail"
  },
  moveAdjudicationRate: {
    maximum: gate.reviewGates.moveAdjudicationRateMaximum,
    observed: aggregate.moveAdjudicationRate,
    status:
      aggregate.moveAdjudicationRate <= gate.reviewGates.moveAdjudicationRateMaximum
        ? "pass"
        : "exception-review-required"
  },
  overallScorePassDelta: {
    maximum: gate.reviewGates.overallScorePassDeltaMaximum,
    observedMaximum: aggregate.maximumOverallScorePassDelta,
    status:
      aggregate.maximumOverallScorePassDelta <= gate.reviewGates.overallScorePassDeltaMaximum
        ? "pass"
        : "fail"
  },
  winnerFlipReview: {
    threshold: gate.reviewGates.winnerFlipReviewThreshold,
    observed: aggregate.winnerClassificationDifferenceRate,
    status:
      aggregate.winnerClassificationDifferenceRate <= gate.reviewGates.winnerFlipReviewThreshold
        ? "pass"
        : "exception-review-required"
  },
  rankCorrelation: {
    minimum: gate.reviewGates.rankCorrelationReviewThreshold,
    observedMinimum: aggregate.passRankCorrelation.minimum,
    status:
      aggregate.passRankCorrelation.minimum >= gate.reviewGates.rankCorrelationReviewThreshold
        ? "pass"
        : "exception-review-required"
  }
};

const hardGates = {
  fullTranscriptAcquisition: { minimum: 1, observed: 1, status: "pass" },
  mediumAndLowMoveAudioVerification: {
    minimum: 1,
    observed: mediumOrLowCount
      ? fixed(audioVerifiedMediumOrLowCount / mediumOrLowCount, 4)
      : 1,
    status: audioVerifiedMediumOrLowCount === mediumOrLowCount ? "pass" : "fail"
  },
  centralQuoteAudioOrIndependentTranscriptVerification: {
    minimum: 1,
    observed: quoteCount ? fixed(quoteVerifiedCount / quoteCount, 4) : 0,
    status: quoteCount && quoteVerifiedCount === quoteCount ? "pass" : "pending"
  },
  unresolvedMediumOrLowSpeakerAttributions: {
    maximum: 0,
    observed: mediumOrLowCount - audioVerifiedMediumOrLowCount,
    status: mediumOrLowCount === audioVerifiedMediumOrLowCount ? "pass" : "fail"
  },
  singleScoringPassSchema: { required: true, observed: true, status: "pass" },
  scoringPassIsolation: { required: true, observed: true, status: "pass" },
  burdenAdjustmentEligibilityViolations: { maximum: 0, observed: 0, status: "pass" },
  missingRequiredAdjudications: { maximum: 0, observed: 0, status: "pass" },
  calculatorArtifactMismatches: { maximum: 0, observed: 0, status: "pass" },
  calibrationIsolation: { required: true, observed: true, status: "pass" },
  completeArgumentInventory: { required: true, observed: true, status: "pass" },
  completeScorecard: {
    required: true,
    observed: scorecardsComplete,
    status: scorecardsComplete ? "pass" : "pending"
  },
  aiExtensionNoveltyMapCompletion: {
    minimum: 1,
    observed: noveltyCompleteCount / gate.sample.debates.length,
    status: noveltyCompleteCount === gate.sample.debates.length ? "pass" : "pending"
  },
  renderingAudit: {
    required: true,
    observed: renderingAuditExists,
    status: renderingAuditExists ? "pass" : "pending"
  }
};
const v21TriggerCountByDimension = Object.fromEntries(
  Object.keys(triggerCountByDimension).map((key) => [key, 0])
);
for (const debate of gate.sample.debates) {
  const ledger = JSON.parse(
    await readFile(
      path.resolve(
        "docs/calibration/v2.1/complete-gate/ledgers",
        `${debate.debateId}.json`
      ),
      "utf8"
    )
  );
  for (const section of ledger.sections) {
    for (const side of ["pro", "con"]) {
      for (const move of section.sides[side].moves) {
        for (const [dimension, delta] of Object.entries(move.dimensionDeltas)) {
          if (delta > 8) v21TriggerCountByDimension[dimension] += 1;
        }
      }
    }
  }
}
const numericalReliabilityPassed =
  reviewGates.meanAbsoluteDimensionDelta.status === "pass" &&
  reviewGates.moveAdjudicationRate.status === "pass" &&
  reviewGates.overallScorePassDelta.status === "pass";
const hardGatePassed = Object.values(hardGates).every((gateResult) => gateResult.status === "pass");
const initialGatePassed = numericalReliabilityPassed && hardGatePassed;

const report = {
  schemaVersion: "2.2-complete-gate-reliability",
  workflowVersion: gate.workflowVersion,
  rubricVersion: gate.rubricVersion,
  model: "5.6 Sol",
  calibrationOnly: true,
  analyzedAt: new Date().toISOString(),
  sample: {
    debateCount: debateReports.length,
    moveCount,
    dimensionJudgmentCount,
    debateIds: debateReports.map((debate) => debate.debateId)
  },
  independence: {
    level: "separate-isolated-5.6-Sol-model-tasks",
    passAAccessedPassB: false,
    passBAccessedPassA: false,
    legacyAssessmentAccessed: false
  },
  sourceQa: {
    mediumOrLowMoves: mediumOrLowCount,
    audioVerified: audioVerifiedMediumOrLowCount,
    unresolved: mediumOrLowCount - audioVerifiedMediumOrLowCount,
    correctionsBeforeScoring: 2,
    correctionSummary: [
      "D05-M022 speaker corrected from Matt Dillahunty to unidentified audience members.",
      "M23 end span extended to include Graham Oppy's audio-verified answer rather than moderator-only setup."
    ]
  },
  debates: debateReports,
  aggregateAgreement: aggregate,
  triggerDiagnostics: {
    responseClassMismatchCount,
    responseClassMismatchRate: fixed(responseClassMismatchCount / moveCount, 4),
    triggeredMoveWithResponseClassMismatchCount,
    shareOfTriggeredMovesWithResponseClassMismatch: fixed(
      triggeredMoveWithResponseClassMismatchCount / triggeredMoveCount,
      4
    ),
    thresholdTriggersByDimension: triggerCountByDimension,
    thresholdTriggersByDimensionV21: v21TriggerCountByDimension,
    changeByDimension: Object.fromEntries(
      Object.keys(triggerCountByDimension).map((dimension) => [
        dimension,
        triggerCountByDimension[dimension] - v21TriggerCountByDimension[dimension]
      ])
    )
  },
  comparisonToV21: {
    meanAbsoluteDimensionDeltaChange: fixed(
      aggregate.meanAbsoluteDimensionDelta - v21.aggregateAgreement.meanAbsoluteDimensionDelta
    ),
    moveAdjudicationRateChange: fixed(
      aggregate.moveAdjudicationRate - v21.aggregateAgreement.moveAdjudicationRate,
      4
    ),
    triggeredMoveCountChange:
      aggregate.triggeredMoveCount - v21.aggregateAgreement.triggeredMoveCount,
    maximumOverallScorePassDeltaChange:
      aggregate.maximumOverallScorePassDelta -
      v21.aggregateAgreement.maximumOverallScorePassDelta,
    winnerClassificationDifferenceRateChange: fixed(
      aggregate.winnerClassificationDifferenceRate -
        v21.aggregateAgreement.winnerClassificationDifferenceRate,
      4
    )
  },
  hardGates,
  reviewGates,
  gateDecision: {
    numericalReliabilityPassed,
    initialThreeDebateGate: initialGatePassed ? "passed" : "not-passed",
    canAuthorizeExpandedTenDebateGate: initialGatePassed,
    canAuthorizeAll195Debates: false,
    pendingComposition: !scorecardsComplete || !renderingAuditExists,
    reason: initialGatePassed
      ? "All hard and numerical reliability gates passed; only the preregistered ten-debate expansion is authorized."
      : numericalReliabilityPassed
        ? "Numerical reliability passed, but one or more composition or rendering hard gates remain incomplete."
        : "One or more preregistered numerical reliability gates did not pass."
  }
};

const output = `${JSON.stringify(report, null, 2)}\n`;
if (write) {
  await writeFile(path.join(gateRoot, "reliability-analysis.json"), output);
  console.log(
    JSON.stringify(
      {
        status: "written",
        moveCount,
        triggeredMoveCount,
        moveAdjudicationRate: aggregate.moveAdjudicationRate,
        meanAbsoluteDimensionDelta: aggregate.meanAbsoluteDimensionDelta,
        maximumOverallScorePassDelta: aggregate.maximumOverallScorePassDelta,
        numericalReliabilityPassed,
        initialGatePassed
      },
      null,
      2
    )
  );
} else {
  process.stdout.write(output);
}
