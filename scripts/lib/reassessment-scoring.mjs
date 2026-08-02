export const SCORE_MIN = 0;
export const SCORE_MAX = 100;

export const DIMENSION_WEIGHTS = Object.freeze({
  logicalCoherence: 0.25,
  evidenceWarrant: 0.2,
  responsiveness: 0.2,
  relevanceBurden: 0.15,
  precisionClarity: 0.1,
  calibrationCharity: 0.1
});

export const V2_RUBRIC = "Slugfester Reassessment Rubric v2";
export const V21_RUBRIC = "Slugfester Reassessment Rubric v2.1";
export const V21_WORKFLOW = "Slugfester Reassessment Workflow v2.1";
export const V21_DIMENSION_DISAGREEMENT_THRESHOLD = 8;
export const V21_MOVE_DISAGREEMENT_THRESHOLD = 4;
export const V21_ADJUSTMENT_DISAGREEMENT_THRESHOLD = 2;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function requireNumber(value, label, { min = SCORE_MIN, max = SCORE_MAX, integer = false } = {}) {
  assert(Number.isFinite(value), `${label} must be a finite number`);
  assert(value >= min && value <= max, `${label} must be from ${min} to ${max}`);
  if (integer) assert(Number.isInteger(value), `${label} must be an integer`);
  return value;
}

function rounded(value) {
  return Math.round(value);
}

function fixed(value, places = 2) {
  return Number(value.toFixed(places));
}

export function scoreDimensions(dimensions, label = "dimensions") {
  assert(dimensions && typeof dimensions === "object", `${label} must be an object`);
  return rounded(
    Object.entries(DIMENSION_WEIGHTS).reduce(
      (total, [key, weight]) =>
        total + requireNumber(dimensions[key], `${label}.${key}`, { integer: true }) * weight,
      0
    )
  );
}

export function calculateV2SectionScore({ moveScores, coverage, burdenProgress, coherence }) {
  assert(Array.isArray(moveScores) && moveScores.length > 0, "moveScores must not be empty");
  const moveMean = moveScores.reduce((total, score) => total + score, 0) / moveScores.length;
  return rounded(
    moveMean * 0.7 +
      requireNumber(coverage, "coverage", { integer: true }) * 0.1 +
      requireNumber(burdenProgress, "burdenProgress", { integer: true }) * 0.1 +
      requireNumber(coherence, "coherence", { integer: true }) * 0.1
  );
}

export function calculateV2OverallScore({
  weightedSectionMean,
  caseCompletion,
  rebuttalResilience,
  globalCalibration
}) {
  return rounded(
    requireNumber(weightedSectionMean, "weightedSectionMean") * 0.7 +
      requireNumber(caseCompletion, "caseCompletion", { integer: true }) * 0.12 +
      requireNumber(rebuttalResilience, "rebuttalResilience", { integer: true }) * 0.1 +
      requireNumber(globalCalibration, "globalCalibration", { integer: true }) * 0.08
  );
}

export function calculateV2Ledger(input) {
  const ledger = structuredClone(input);
  const sideKeys = ["pro", "con"];
  let centralityTotal = 0;

  assert(ledger.rubric === V2_RUBRIC, `rubric must be ${V2_RUBRIC}`);
  assert(Array.isArray(ledger.sections) && ledger.sections.length > 0, "sections must not be empty");

  ledger.sections.forEach((section, sectionIndex) => {
    requireNumber(section.centrality, `sections[${sectionIndex}].centrality`, {
      min: 1,
      max: 3,
      integer: true
    });
    centralityTotal += section.centrality;

    for (const sideKey of sideKeys) {
      const side = section.sides?.[sideKey];
      assert(side && Array.isArray(side.moves) && side.moves.length > 0, `${section.title}.${sideKey}.moves is required`);
      side.moves.forEach((move, moveIndex) => {
        move.score = scoreDimensions(
          move.dimensions,
          `${section.title}.${sideKey}.moves[${moveIndex}].dimensions`
        );
      });
      side.moveMean = fixed(
        side.moves.reduce((total, move) => total + move.score, 0) / side.moves.length
      );
      side.score = calculateV2SectionScore({
        moveScores: side.moves.map((move) => move.score),
        coverage: side.coverage,
        burdenProgress: side.burdenProgress,
        coherence: side.coherence
      });
    }
  });

  for (const sideKey of sideKeys) {
    const weightedSectionMean =
      ledger.sections.reduce(
        (total, section) => total + section.sides[sideKey].score * section.centrality,
        0
      ) / centralityTotal;
    const overall = ledger.overall?.[sideKey];
    assert(overall, `overall.${sideKey} is required`);
    overall.weightedSectionMean = fixed(weightedSectionMean);
    overall.score = calculateV2OverallScore({ weightedSectionMean, ...overall });
  }

  return ledger;
}

function averageDimensions(passA, passB) {
  return Object.fromEntries(
    Object.keys(DIMENSION_WEIGHTS).map((key) => [key, rounded((passA[key] + passB[key]) / 2)])
  );
}

function moveDisagreement(passA, passB) {
  const dimensionDeltas = Object.fromEntries(
    Object.keys(DIMENSION_WEIGHTS).map((key) => [key, Math.abs(passA[key] - passB[key])])
  );
  const passAScore = scoreDimensions(passA, "passA.dimensions");
  const passBScore = scoreDimensions(passB, "passB.dimensions");
  const maxDimensionDelta = Math.max(...Object.values(dimensionDeltas));
  const scoreDelta = Math.abs(passAScore - passBScore);
  return {
    dimensionDeltas,
    maxDimensionDelta,
    passAScore,
    passBScore,
    scoreDelta,
    requiresAdjudication:
      maxDimensionDelta > V21_DIMENSION_DISAGREEMENT_THRESHOLD ||
      scoreDelta > V21_MOVE_DISAGREEMENT_THRESHOLD
  };
}

function calculateImportanceWeightedMean(moves, scoreKey) {
  const importanceTotal = moves.reduce(
    (total, move) =>
      total + requireNumber(move.importance, `${move.id}.importance`, { min: 1, max: 3, integer: true }),
    0
  );
  assert(importanceTotal > 0, "move importance total must be positive");
  return (
    moves.reduce((total, move) => total + move[scoreKey] * move.importance, 0) / importanceTotal
  );
}

function calculateV21Overall(sectionScores, sections, adjustment, label) {
  const weightedMean = sections.reduce(
    (total, section, index) => total + sectionScores[index] * (section.weightPercent / 100),
    0
  );
  const adjustmentValue = requireNumber(adjustment.value, `${label}.burdenCompletionAdjustment`, {
    min: -5,
    max: 5,
    integer: true
  });
  assert(typeof adjustment.rationale === "string" && adjustment.rationale.trim(), `${label}.adjustment rationale is required`);
  return {
    weightedSectionMean: fixed(weightedMean),
    burdenCompletionAdjustment: adjustmentValue,
    score: Math.max(SCORE_MIN, Math.min(SCORE_MAX, rounded(weightedMean + adjustmentValue)))
  };
}

function resolveBurdenAdjustment(adjustment, label) {
  assert(adjustment?.passA && adjustment?.passB, `${label} requires passA and passB`);
  for (const passKey of ["passA", "passB"]) {
    requireNumber(adjustment[passKey].value, `${label}.${passKey}.value`, {
      min: -5,
      max: 5,
      integer: true
    });
    assert(
      typeof adjustment[passKey].rationale === "string" && adjustment[passKey].rationale.trim(),
      `${label}.${passKey}.rationale is required`
    );
  }
  const delta = Math.abs(adjustment.passA.value - adjustment.passB.value);
  const requiresAdjudication = delta > V21_ADJUSTMENT_DISAGREEMENT_THRESHOLD;
  let final;
  if (requiresAdjudication) {
    assert(adjustment.adjudication, `${label} requires adjudication`);
    requireNumber(adjustment.adjudication.value, `${label}.adjudication.value`, {
      min: -5,
      max: 5,
      integer: true
    });
    assert(
      typeof adjustment.adjudication.rationale === "string" &&
        adjustment.adjudication.rationale.trim(),
      `${label}.adjudication.rationale is required`
    );
    final = adjustment.adjudication;
  } else {
    final = {
      value: rounded((adjustment.passA.value + adjustment.passB.value) / 2),
      rationale: "Rounded mean of the two locked scoring passes; no adjudication threshold was triggered."
    };
  }
  return { delta, requiresAdjudication, final };
}

export function calculateV21Ledger(input) {
  const ledger = structuredClone(input);
  const sideKeys = ["pro", "con"];

  assert(ledger.schemaVersion === "2.1", "schemaVersion must be 2.1");
  assert(ledger.workflowVersion === V21_WORKFLOW, `workflowVersion must be ${V21_WORKFLOW}`);
  assert(ledger.rubricVersion === V21_RUBRIC, `rubricVersion must be ${V21_RUBRIC}`);
  assert(typeof ledger.calibrationOnly === "boolean", "calibrationOnly must be a boolean");
  assert(typeof ledger.model === "string" && ledger.model.trim(), "model is required");
  assert(typeof ledger.sourceManifest === "string" && ledger.sourceManifest.trim(), "sourceManifest is required");
  assert(
    typeof ledger.blindPacketSha256 === "string" && /^[a-f0-9]{64}$/.test(ledger.blindPacketSha256),
    "blindPacketSha256 must be a SHA-256 digest"
  );
  assert(
    ledger.assessmentPasses?.passA && ledger.assessmentPasses?.passB,
    "assessmentPasses.passA and assessmentPasses.passB are required"
  );
  for (const passKey of ["passA", "passB"]) {
    const assessmentPass = ledger.assessmentPasses[passKey];
    assert(assessmentPass.model === ledger.model, `${passKey}.model must match ledger.model`);
    assert(typeof assessmentPass.completedAt === "string" && assessmentPass.completedAt, `${passKey}.completedAt is required`);
    assert(typeof assessmentPass.contextIsolation === "string" && assessmentPass.contextIsolation, `${passKey}.contextIsolation is required`);
  }
  assert(
    typeof ledger.passIndependence?.level === "string" && ledger.passIndependence.level,
    "passIndependence.level is required"
  );
  assert(Array.isArray(ledger.burdens) && ledger.burdens.length >= 2, "burdens must include both sides");
  const burdenIds = new Set();
  for (const [index, burden] of ledger.burdens.entries()) {
    assert(burden.id && ["pro", "con"].includes(burden.side), `burdens[${index}] needs id and valid side`);
    assert(!burdenIds.has(burden.id), `duplicate burden id: ${burden.id}`);
    burdenIds.add(burden.id);
    assert(burden.description && burden.successCriteria, `burdens[${index}] needs description and successCriteria`);
  }
  assert(ledger.sectionWeightsLockedBeforeScoring === true, "section weights must be locked before scoring");
  assert(ledger.moveImportanceLockedBeforeScoring === true, "move importance must be locked before scoring");
  assert(Array.isArray(ledger.sections) && ledger.sections.length > 0, "sections must not be empty");

  const sectionWeightTotal = ledger.sections.reduce(
    (total, section, index) =>
      total + requireNumber(section.weightPercent, `sections[${index}].weightPercent`, { min: 1, max: 100 }),
    0
  );
  assert(Math.abs(sectionWeightTotal - 100) < 0.001, "section weight percentages must sum to 100");

  const audit = {
    moveCount: 0,
    adjudicationCount: 0,
    adjustmentAdjudicationCount: 0,
    maxDimensionDelta: 0,
    maxMoveScoreDelta: 0,
    maxAdjustmentDelta: 0
  };

  ledger.sections.forEach((section, sectionIndex) => {
    assert(section.id && section.title && section.weightRationale, `sections[${sectionIndex}] needs id, title, and weightRationale`);
    for (const sideKey of sideKeys) {
      const side = section.sides?.[sideKey];
      assert(side && Array.isArray(side.moves), `${section.id}.${sideKey}.moves is required`);
      side.moves.forEach((move, moveIndex) => {
        const label = `${section.id}.${sideKey}.moves[${moveIndex}]`;
        assert(move.id && move.timestamp && move.sourceExcerpt, `${label} needs id, timestamp, and sourceExcerpt`);
        const sourceExcerptWordCount = move.sourceExcerpt.trim().split(/\s+/).filter(Boolean).length;
        assert(
          sourceExcerptWordCount >= 30 && sourceExcerptWordCount <= 90,
          `${label}.sourceExcerpt must contain 30 to 90 words`
        );
        assert(
          move.sourceSpan?.start === move.timestamp && typeof move.sourceSpan?.end === "string",
          `${label}.sourceSpan must begin at timestamp and include an end timestamp`
        );
        assert(["quote", "condensation"].includes(move.quoteKind), `${label}.quoteKind is invalid`);
        assert(["high", "medium", "low"].includes(move.speakerAttributionConfidence), `${label}.speakerAttributionConfidence is invalid`);
        assert(typeof move.audioChecked === "boolean", `${label}.audioChecked must be a boolean`);
        assert(Array.isArray(move.burdenIds), `${label}.burdenIds must be an array`);
        assert(Array.isArray(move.respondsToIds), `${label}.respondsToIds must be an array`);
        assert(move.passA?.dimensions && move.passB?.dimensions, `${label} requires passA and passB dimensions`);
        for (const passKey of ["passA", "passB"]) {
          assert(
            typeof move[passKey].rationale === "string" && move[passKey].rationale.trim(),
            `${label}.${passKey}.rationale is required`
          );
        }
        for (const burdenId of move.burdenIds) {
          assert(burdenIds.has(burdenId), `${label} references unknown burden ${burdenId}`);
        }

        const disagreement = moveDisagreement(move.passA.dimensions, move.passB.dimensions);
        Object.assign(move, disagreement);
        if (disagreement.requiresAdjudication) {
          assert(move.adjudication?.dimensions, `${label} requires adjudication dimensions`);
          assert(
            typeof move.adjudication.rationale === "string" && move.adjudication.rationale.trim(),
            `${label} requires an adjudication rationale`
          );
          move.finalDimensions = move.adjudication.dimensions;
          audit.adjudicationCount += 1;
        } else {
          move.finalDimensions = averageDimensions(move.passA.dimensions, move.passB.dimensions);
        }
        move.finalScore = scoreDimensions(move.finalDimensions, `${label}.finalDimensions`);
        audit.moveCount += 1;
        audit.maxDimensionDelta = Math.max(audit.maxDimensionDelta, disagreement.maxDimensionDelta);
        audit.maxMoveScoreDelta = Math.max(audit.maxMoveScoreDelta, disagreement.scoreDelta);
      });

      if (side.moves.length) {
        side.passAScore = rounded(calculateImportanceWeightedMean(side.moves, "passAScore"));
        side.passBScore = rounded(calculateImportanceWeightedMean(side.moves, "passBScore"));
        side.score = rounded(calculateImportanceWeightedMean(side.moves, "finalScore"));
      } else {
        assert(
          Array.isArray(side.unansweredMoveIds) && side.unansweredMoveIds.length > 0,
          `${section.id}.${sideKey} requires moves or explicit unansweredMoveIds`
        );
        side.passAScore = null;
        side.passBScore = null;
        side.score = null;
      }
    }
  });

  for (const sideKey of sideKeys) {
    const scoredSections = ledger.sections.filter((section) => section.sides[sideKey].score !== null);
    assert(scoredSections.length === ledger.sections.length, `${sideKey} needs at least one scored move in every pilot section`);
    const adjustment = resolveBurdenAdjustment(
      ledger.burdenCompletionAdjustment[sideKey],
      `${sideKey}.burdenCompletionAdjustment`
    );
    ledger.burdenCompletionAdjustment[sideKey].delta = adjustment.delta;
    ledger.burdenCompletionAdjustment[sideKey].requiresAdjudication =
      adjustment.requiresAdjudication;
    ledger.burdenCompletionAdjustment[sideKey].final = adjustment.final;
    audit.maxAdjustmentDelta = Math.max(audit.maxAdjustmentDelta, adjustment.delta);
    if (adjustment.requiresAdjudication) audit.adjustmentAdjudicationCount += 1;

    const passA = calculateV21Overall(
      ledger.sections.map((section) => section.sides[sideKey].passAScore),
      ledger.sections,
      ledger.burdenCompletionAdjustment[sideKey].passA,
      sideKey
    );
    const passB = calculateV21Overall(
      ledger.sections.map((section) => section.sides[sideKey].passBScore),
      ledger.sections,
      ledger.burdenCompletionAdjustment[sideKey].passB,
      sideKey
    );
    const final = calculateV21Overall(
      ledger.sections.map((section) => section.sides[sideKey].score),
      ledger.sections,
      adjustment.final,
      sideKey
    );
    ledger.overall ??= {};
    ledger.overall[sideKey] = {
      passA,
      passB,
      ...final,
      confidenceRange: {
        low: Math.max(SCORE_MIN, Math.min(passA.score, passB.score, final.score) - 2),
        high: Math.min(SCORE_MAX, Math.max(passA.score, passB.score, final.score) + 2)
      }
    };
  }

  ledger.agreementAudit = {
    ...audit,
    adjudicationRate: audit.moveCount ? fixed(audit.adjudicationCount / audit.moveCount) : 0
  };
  assert(ledger.tagReview?.performedAfterScoring === true, "tagReview must occur after scoring");
  assert(Array.isArray(ledger.tagReview.candidates), "tagReview.candidates must be an array");
  for (const [index, candidate] of ledger.tagReview.candidates.entries()) {
    assert(candidate.id && candidate.moveId && candidate.label, `tagReview.candidates[${index}] needs id, moveId, and label`);
    assert(["fallacy", "bias"].includes(candidate.type), `tagReview.candidates[${index}].type is invalid`);
    assert(["accepted", "rejected"].includes(candidate.decision), `tagReview.candidates[${index}].decision is invalid`);
    assert(candidate.rationale, `tagReview.candidates[${index}].rationale is required`);
  }
  assert(
    ledger.aiExtensionReview?.performedAfterAssessment === true,
    "aiExtensionReview must occur after assessment"
  );
  assert(
    Array.isArray(ledger.aiExtensionReview.noveltyMap),
    "aiExtensionReview.noveltyMap must be an array"
  );
  if (!ledger.calibrationOnly) {
    assert(
      ledger.aiExtensionReview.noveltyMap.length > 0,
      "production ledgers require an AI Extension novelty map"
    );
  }
  return ledger;
}
