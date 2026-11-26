// Presentation only: clarify existing labels and process wording, never reassess an argument.
const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

export const critiqueLabels = {
  "Strongest feature:": "Main strength:",
  "Principal limitation:": "Main limitation:",
  "Live burden:": "What remains to be shown:",
  "Locked score:": "Why this score:"
};

const critiqueLabelPattern = Object.keys(critiqueLabels).concat(Object.values(critiqueLabels)).join("|");

// Existing frozen records keep their headings; new writing contracts require the reader labels.
export function hasStructuredCritique(critique = "", { labels } = {}) {
  const text = String(critique).trim();
  const orderedLabels = labels || (text.startsWith("Main strength:") ? Object.values(critiqueLabels) : Object.keys(critiqueLabels));
  const parts = text.split(new RegExp(`(?=${critiqueLabelPattern})`)).map((part) => part.trim());
  return parts.length === 4 && orderedLabels.length === 4 &&
    parts.every((part, index) => part.startsWith(orderedLabels[index]) && /[.!?]$/.test(part)) &&
    (text.match(/[.!?](?=\s|$)/g) || []).length === 4;
}

export function readerCritiqueText(text = "") {
  return String(text)
    .replace(/\b(?:locked|frozen|fixed) score\b/g, "published score")
    .replace(/\b(?:locked|frozen|fixed) (\d{1,3})(?=\s+(?:reflects|rewards|credits|captures|recognizes|acknowledges|preserves|fits|appropriately|properly|fittingly|balances|retains|represents)\b)/g, "score of $1")
    .replace(/\bfrozen assessment record\b/g, "saved assessment record")
    .replace(/\bfrozen assessment\b/g, "recorded assessment")
    .replace(/\bfrozen (profile|pattern)\b/g, "recorded pattern of ratings")
    .replace(/\blocked pattern\b/g, "recorded pattern of ratings")
    .replace(/\bfrozen dimensions\b/g, "recorded ratings for the scoring criteria")
    .replace(/\blocked (findings?|concerns?|deductions|reservations?|limitations?|constraints|distinction|formulation)\b/g, "recorded $1")
    .replace(/\blocked evidential (limitation|weakness)\b/g, "recorded evidential $1")
    .replace(/\blocked record\b/g, "assessment record")
    .replace(/\blocked very-strong score\b/g, "published very-strong score")
    .replaceAll("legally available earlier experiential target", "earlier argument from experience that could have been answered at this point")
    .replaceAll("locked resurrection and birth conflicts", "identified conflicts in the resurrection and birth accounts")
    .replaceAll("locked response structure", "recorded pattern of replies")
    .replaceAll("locked route requirement", "previously identified requirement for establishing the argument")
    .replaceAll("locked decisive demands", "previously identified central challenges")
    .replaceAll("locked proposition’s", "assessed claim’s")
    .replaceAll("locked band", "assigned score range")
    .replaceAll("weakest locked move", "lowest-scoring assessed contribution")
    .replaceAll("locked historical motion", "assessed historical question")
    .replaceAll("locked passage", "assessed passage")
    .replaceAll("locked historical facts", "historical facts identified for assessment")
    .replaceAll("frozen unevenness", "uneven pattern of ratings")
    .replaceAll("locked relevanceBurden high of", "high recorded relevance-and-burden rating of")
    .replaceAll("locked responsiveness high of", "high recorded responsiveness rating of")
    .replace(/\bpublished score (is|of|at) (\d{1,3}) (?=[A-Z])/g, "published score $1 $2. ");
}

const argumentRoles = {
  "constructive": "Argument for this side",
  "load-bearing constructive": "Central argument for this side",
  "supporting constructive": "Supporting argument for this side",
  "load-bearing reply": "Central reply",
  "diagnostic challenge": "Challenge testing the argument"
};
export function readerArgumentRole(role = "") {
  return argumentRoles[String(role).toLowerCase()] || role;
}

export function renderCritiqueText(critique = "") {
  return readerCritiqueText(critique)
    .split(new RegExp(`(?:^|\\s+)(?=(?:${critiqueLabelPattern}))`, "g"))
    .map((section) => section.trim())
    .filter(Boolean)
    .map((section) => {
      const label = section.match(new RegExp(`^(?:${critiqueLabelPattern})`))?.[0];
      const content = label
        ? `<strong>${escape(critiqueLabels[label] || label)}</strong>${escape(section.slice(label.length))}`
        : escape(section);
      return `<span class="critique-section">${content}</span>`;
    })
    .join("\n");
}
