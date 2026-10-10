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
export const weightPresets = Object.freeze([
  { id: "current", label: "Current rubric", weights: defaultWeights, description: "Slugfester’s published scoring weights." },
  { id: "evidence", label: "Evidence-focused", weights: [15, 40, 15, 10, 10, 10], description: "Evidence and support count for 40%." },
  { id: "logic", label: "Logic-focused", weights: [40, 15, 15, 10, 10, 10], description: "Logic counts for 40%." },
  { id: "replies", label: "Reply-focused", weights: [15, 15, 40, 10, 10, 10], description: "Replies count for 40%." }
].map(preset => Object.freeze({ ...preset, weights: Object.freeze(preset.weights) })));

export function findWeightPreset(weights) {
  return weightPresets.find(preset => preset.weights.length === weights.length && preset.weights.every((w, i) => w === weights[i]));
}

// These are the reviewed research groups, not the site's finer browsing categories.
export const weightTopics = Object.freeze([
  { id: "cosmology-science-design", label: "Cosmology, science & design" },
  { id: "evil-suffering-hiddenness", label: "Evil, suffering & hiddenness" },
  { id: "general-theism-naturalism", label: "General theism & naturalism" },
  { id: "mind-reason-logic", label: "Mind, reason & logic" },
  { id: "morality-foundations", label: "Morality & moral foundations" },
  { id: "religion-culture-meaning", label: "Religion, culture & meaning" },
  { id: "resurrection-history", label: "Resurrection & historical evidence" },
  { id: "scripture-revelation-doctrine", label: "Scripture, revelation & doctrine" }
].map(Object.freeze));

export function countWeightTopics(debates, cohort = "all") {
  validateWeightFilters(cohort, "all");
  const rows = debates.filter(d => cohort === "all" || d.cohort === cohort);
  return [{ id: "all", label: "All research topics", count: rows.length },
    ...weightTopics.map(t => ({ ...t, count: rows.filter(d => d.topic === t.id).length }))];
}

const shareKeys = ["sw", "edition", "weights", "procedure", "topic"];
export function parseWeightSettings(search, edition) {
  const defaults = { weights: [...defaultWeights], cohort: "all", topic: "all", warning: "" };
  const params = new URLSearchParams(search);
  if (!shareKeys.some(key => params.has(key))) return defaults;
  if (params.get("edition") !== edition) return { ...defaults, warning: "This link does not match the available research edition. The current weights and all debates are shown instead." };
  try {
    if (shareKeys.some(key => params.getAll(key).length !== 1) || params.get("sw") !== "1") throw new Error("Unsupported link");
    const raw = params.get("weights");
    if (!/^\d{1,3}(,\d{1,3}){5}$/.test(raw)) throw new Error("Invalid weights");
    const weights = raw.split(",").map(Number);
    validateWeights(weights);
    const cohort = params.get("procedure"), topic = params.get("topic");
    validateWeightFilters(cohort, topic);
    return { weights, cohort, topic, warning: "" };
  } catch {
    return { ...defaults, warning: "This link contains unsupported or invalid settings. The current weights and all debates are shown instead." };
  }
}

export function buildWeightShareUrl(origin, { weights, cohort, topic }, edition) {
  validateWeights(weights);
  if (!weights.every(Number.isInteger)) throw new Error("Shared slider weights must be whole percentages.");
  validateWeightFilters(cohort, topic);
  const base = new URL(origin);
  if (!["http:", "https:"].includes(base.protocol)) throw new Error("Unsupported share origin.");
  const url = new URL("/insights/", base.origin);
  const values = { sw: "1", edition, weights: weights.join(","), procedure: cohort, topic };
  for (const key of shareKeys) url.searchParams.set(key, values[key]);
  url.hash = "scoring-weights";
  return url.href;
}

function validateWeightFilters(cohort, topic) {
  if (!["all", "earlier", "later"].includes(cohort)) throw new Error("Unknown assessment group.");
  if (topic !== "all" && !weightTopics.some(t => t.id === topic)) throw new Error("Unknown research topic.");
}

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

export function evaluateWeights(debates, weights = defaultWeights, cohort = "all", topic = "all") {
  validateWeights(weights);
  validateWeightFilters(cohort, topic);
  const rows = debates.filter(d => (cohort === "all" || d.cohort === cohort) && (topic === "all" || d.topic === topic)).map(d => {
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
