// Scenario arithmetic only: never changes a published assessment.
export const weightDimensions = Object.freeze([
  { key: "logicalCoherence", label: "Logic", description: "Do the conclusions follow from the reasons given?", weight: 25 },
  { key: "evidenceWarrant", label: "Evidence and support", description: "How well are the claims and assumptions supported?", weight: 20 },
  { key: "responsiveness", label: "Replies", description: "Does the speaker address the opposing argument?", weight: 20 },
  { key: "relevanceBurden", label: "Relevance", description: "Does the argument help establish what the speaker needs to show?", weight: 15 },
  { key: "precisionClarity", label: "Clarity", description: "Are the terms, claims and qualifications clear?", weight: 10 },
  { key: "calibrationCharity", label: "Confidence and fairness", description: "Does confidence fit the support, and is the opposing position represented fairly?", weight: 10 }
]);
export const defaultWeights = Object.freeze(weightDimensions.map(d => d.weight));

export function validateWeights(weights) {
  if (!Array.isArray(weights) || weights.length !== 6 ||
      weights.some(w => !Number.isFinite(w) || w < 0 || w > 100) ||
      Math.abs(weights.reduce((a, b) => a + b, 0) - 100) > 1e-8) {
    throw new Error("The six scoring weights must be nonnegative and total 100%.");
  }
}

// Keep one slider at the chosen percentage; distribute the rest in whole
// percentage points, using largest remainders so the total stays exactly 100.
export function redistributeWeights(weights, index, value) {
  validateWeights(weights);
  if (!Number.isInteger(index) || index < 0 || index > 5 || !Number.isFinite(value)) throw new Error("Invalid slider value.");
  const chosen = Math.round(Math.max(0, Math.min(100, value)));
  const others = weights.map((w, i) => i === index ? 0 : w);
  const bases = others.some(w => w > 0) ? others : defaultWeights.map((w, i) => i === index ? 0 : w);
  const total = bases.reduce((a, b) => a + b, 0);
  const raw = bases.map(w => (100 - chosen) * w / total);
  const result = raw.map(Math.floor);
  result[index] = chosen;
  const order = raw.map((v, i) => ({ i, remainder: v - Math.floor(v) }))
    .filter(x => x.i !== index).sort((a, b) => b.remainder - a.remainder || a.i - b.i);
  const left = 100 - result.reduce((a, b) => a + b, 0);
  for (let i = 0; i < left; i++) result[order[i].i]++;
  return result;
}

export function scoreScenarioSide(side, sections, weights, adjustment) {
  // A compact move is [importance, logic, evidence, replies, relevance, clarity, care].
  // Retain the published move -> section -> overall rounding order.
  const total = sections.reduce((sum, section) => {
    const moves = section[side];
    const importance = moves.reduce((n, move) => n + move[0], 0);
    const weighted = moves.reduce((n, move) => n + move[0] * Math.round(
      weights.reduce((score, weight, i) => score + move[i + 1] * (weight / 100), 0)
    ), 0);
    return sum + Math.round(weighted / importance) * section.weight / 100;
  }, 0);
  return Math.max(0, Math.min(100, Math.round(total + adjustment)));
}

export function evaluateWeights(debates, weights = defaultWeights, cohort = "all") {
  validateWeights(weights);
  if (!["all", "earlier", "later"].includes(cohort)) throw new Error("Unknown assessment group.");
  const rows = debates.filter(d => cohort === "all" || d.cohort === cohort).map(d => {
    const proGod = scoreScenarioSide("proGod", d.sections, weights, d.adjustments[0]);
    const conGod = scoreScenarioSide("conGod", d.sections, weights, d.adjustments[1]);
    const gap = conGod - proGod;
    const baselineGap = d.published[1] - d.published[0];
    return { ...d, proGod, conGod, gap, baselineGap, changed: Math.sign(gap) !== Math.sign(baselineGap) };
  });
  if (!rows.length) return { count: 0, rows, proGod: null, conGod: null, gap: null };
  const mean = f => rows.reduce((sum, row) => sum + f(row), 0) / rows.length;
  return {
    count: rows.length, rows,
    proGod: mean(r => r.proGod), conGod: mean(r => r.conGod), gap: mean(r => r.gap),
    baselineProGod: mean(r => r.published[0]), baselineConGod: mean(r => r.published[1]), baselineGap: mean(r => r.baselineGap),
    proGodAhead: rows.filter(r => r.gap < 0).length,
    conGodAhead: rows.filter(r => r.gap > 0).length,
    ties: rows.filter(r => r.gap === 0).length,
    changed: rows.filter(r => r.changed).length
  };
}
