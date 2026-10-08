// Editorial grouping rules for the manually published Charts snapshot.
// These are descriptive text labels, never new scores or speaker identities.
export const chartFamilies = [
  { id: "cosmology", label: "Cosmology & contingency", pattern: /cosmolog|contingen|kalam|first.cause|uncaused|infinite.past|infinity|cosmic.begin|universe.{0,25}begin|necessary.being|necessary.foundation|causal.regress/i },
  { id: "design", label: "Fine-tuning & design", pattern: /fine.?tun|design|life.permitting|intelligent.selection|biological.complexity|origin.of.life|cellular|\bdna\b/i },
  { id: "morality", label: "Morality & value", pattern: /moral|ethic|objective.value|euthyphro|well.being|normativ/i },
  { id: "mind", label: "Mind, reason & logic", pattern: /conscious|\bsoul\b|\bsouls\b|mind.brain|free.will|rational.facult|transcendental|presuppos|laws.of.logic|logical.laws|intelligib|argument.from.reason/i },
  { id: "experience", label: "Experience & belief", pattern: /religious.experience|divine.experience|experience.of.god|experienc.{0,15}god|personal.experience|mystic|properly.basic|basicality|revelation|religious.disagreement/i },
  { id: "history", label: "Scripture & miracles", pattern: /resurrect|miracle|\bbible\b|biblical|scriptur|gospel|jesus|testament|empty.tomb|martyr|prophec/i },
  { id: "suffering", label: "Evil & suffering", pattern: /suffer|\bevil\b|theodic|gratuitous|divine.goodness|skeptical.theism|\bhell\b|genocide|slavery/i },
  { id: "hiddenness", label: "Divine hiddenness", pattern: /hiddenness|nonresistan|non.resistan|divine.silence|unequal.disclosure/i },
  { id: "meaning", label: "Meaning & society", pattern: /meaning|purpose|social|societ|cultur|civiliz|humanism|humanist|religion.{0,12}harm|religion.{0,12}good/i },
  { id: "general", label: "Other / general reasoning", pattern: null }
];

export const chartDimensions = [
  ["logicalCoherence", "Logical coherence"],
  ["evidenceWarrant", "Evidence & support"],
  ["responsiveness", "Responsiveness"],
  ["relevanceBurden", "Relevance & burden"],
  ["precisionClarity", "Precision & clarity"],
  ["calibrationCharity", "Calibration & charity"]
];

export const chartScopes = [
  ["god", "God & theism"],
  ["religion", "Specific religious claims"],
  ["society", "Religion, meaning & society"],
  ["all", "All included religious claims"]
];

export function classifyChartMove(move, section) {
  // Prefer the assessed move's own words. Use its section only when no family matches.
  const text = `${move.ledgerMoveId || ""} ${move.words || ""}`.replaceAll("-", " ");
  const match = (value) => chartFamilies.filter((family) => family.pattern?.test(value)).map((family) => family.id);
  const explicit = match(text);
  return explicit.length ? explicit : match(section.title).length ? match(section.title) : ["general"];
}
