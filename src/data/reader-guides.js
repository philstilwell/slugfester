// Reader aids derived only from the published record. No new scoring or model calls.
export function debateSectionAnchor(index) {
  return `assessed-section-${index + 1}`;
}

export function assessmentGuide(debate) {
  const sides = ["pro", "con"].map((key) => {
    const moves = (debate.sections || []).flatMap((section, sectionIndex) =>
      (section.exchanges || []).flatMap((exchange) => exchange[key]
        ? [{ argument: exchange[key], section, sectionIndex }] : [])
    );
    // Stable tie-break: the first displayed move with the highest published score.
    const strongest = moves.filter(({ argument }) => Number.isFinite(argument.score))
      .sort((a, b) => b.argument.score - a.argument.score)[0];
    const critique = strongest?.argument.critique || "";
    const explicitStrength = critique.match(/Strongest feature:\s*([\s\S]*?)(?=\s*Principal limitation:|\s*Live burden:|\s*Locked score:|$)/i)?.[1]?.trim();
    const limitation = debate.overall?.[key]?.blunders?.[0];
    return {
      key,
      speaker: debate.sides[key].speaker,
      score: debate.score[key],
      strongest,
      // Older records use free-form critiques; retain their existing overall strength.
      strength: explicitStrength || debate.overall?.[key]?.strengths?.[0] || "",
      strengthIsMove: Boolean(explicitStrength),
      limitation: typeof limitation === "string" ? limitation : limitation?.text || ""
    };
  });
  return {
    question: debate.motion,
    summary: debate.summary,
    gap: Math.abs(debate.score.pro - debate.score.con),
    higherSide: debate.score.pro === debate.score.con ? null : debate.score.pro > debate.score.con ? "pro" : "con",
    sides
  };
}

const ignoredWords = new Set("does do is are the a an of to and or in for on with god debate existence exist".split(" "));
function topicWords(debate) {
  return new Set([debate.motion, debate.label, ...(debate.sections || []).map((s) => s.title)]
    .join(" ").toLowerCase().match(/[a-z]{3,}/g)?.filter((word) => !ignoredWords.has(word)) || []);
}

function sourceKey(debate) {
  try {
    const url = new URL(debate.youtubeUrl);
    return url.searchParams.get("v") || url.pathname;
  } catch { return debate.id; }
}

export function relatedDebates(current, catalogue, peopleForDebate) {
  const currentPeople = new Set(peopleForDebate(current).map((person) => person.name));
  const words = topicWords(current);
  const candidates = catalogue.filter((debate) => debate.id !== current.id && sourceKey(debate) !== sourceKey(current))
    .map((debate) => {
      const people = peopleForDebate(debate).map((person) => person.name);
      const shared = people.filter((name) => currentPeople.has(name));
      const sameCast = people.length === currentPeople.size && shared.length === people.length;
      const overlap = [...topicWords(debate)].filter((word) => words.has(word)).length;
      return { debate, shared, sameCast, sameTopic: debate.topicCategory === current.topicCategory, overlap };
    }).sort((a, b) => b.overlap - a.overlap || Number(b.debate.number) - Number(a.debate.number) || a.debate.id.localeCompare(b.debate.id));
  const selected = [];
  const usedSources = new Set([sourceKey(current)]);
  const take = (predicate, label, reason) => {
    const match = candidates.find((item) => !usedSources.has(sourceKey(item.debate)) && predicate(item));
    if (!match) return;
    usedSources.add(sourceKey(match.debate));
    selected.push({ debate: match.debate, label, reason: reason(match) });
  };
  take((item) => item.sameTopic, "Explore the same topic", () => "Shares this debate’s primary topic; selected for overlap in its question and section headings.");
  take((item) => item.shared.length && !item.sameCast, "A different matchup", (item) => `Another debate featuring ${item.shared.join(" and ")}, with a different participant lineup.`);
  take((item) => item.sameTopic && !item.shared.length, "Hear other speakers", () => "A different set of interlocutors discussing the same primary topic.");
  while (selected.length < 3) {
    const before = selected.length;
    take((item) => item.sameTopic, "More on this topic", () => "Another assessment in the same primary topic, with overlapping questions or section headings.");
    if (selected.length === before) break;
  }
  return selected;
}
