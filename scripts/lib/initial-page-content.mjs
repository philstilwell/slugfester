// Build-time only. Reuse published prose and scores; never generate new assessments.
import { publishedDebates as debates } from "../../src/data/debates.js";
import { avatarsForSpeakerText } from "../../src/data/interlocutors.js";
import { topicCategoryDefinitions } from "../../src/data/topics.js";
import { debatePath, debateTitleWithYear, interlocutorPath } from "../../src/seo.js";

const escape = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const paragraph = (text) => text ? `<p>${escape(text)}</p>` : "";
const list = (items = []) => `<ul>${items.map((item) => `<li>${escape(typeof item === "string" ? item : item.text)}</li>`).join("")}</ul>`;
const eligible = (debate) => debate.interlocutorRankingEligible !== false && ["pro", "con"].every((key) => avatarsForSpeakerText(debate.sides[key].speaker).length === 1);
const catalogue = [...debates].sort((a, b) => Number(b.number) - Number(a.number));
const people = new Map();
for (const debate of debates) for (const key of ["pro", "con"]) {
  for (const person of avatarsForSpeakerText(debate.sides[key].speaker)) {
    if (!people.has(person.name)) people.set(person.name, { person, records: [] });
    people.get(person.name).records.push({ debate, key });
  }
}
const average = (records) => records.reduce((sum, { debate, key }) => sum + debate.score[key], 0) / records.length;
const number = (score) => String(Number(score.toFixed(1)));

function cards(records) {
  return records.map((debate) => `<article class="initial-debate-summary">
    <h3><a href="${escape(debatePath(debate))}">${escape(debateTitleWithYear(debate))}</a></h3>
    ${paragraph(debate.summary)}
    <p>${escape(debate.sides.pro.speaker)}: ${escape(debate.score.pro)} · ${escape(debate.sides.con.speaker)}: ${escape(debate.score.con)}. Scores assess the reasoning in this debate.</p>
  </article>`).join("");
}

function debateContent(debate) {
  return `<section><h2>Question and assessment context</h2>${paragraph(debate.motion)}${paragraph(debate.sourceNote)}${paragraph(debate.scoringNote)}
    <p><a href="${escape(debate.youtubeUrl)}">Watch the original debate</a></p></section>
    <section><h2>Overall assessment</h2>${["pro", "con"].map((key) => `<section><h3>${escape(debate.sides[key].speaker)} — ${escape(debate.sides[key].name)}: ${escape(debate.score[key])}/100</h3>
      <h4>Published strengths</h4>${list(debate.overall?.[key]?.strengths)}
      <h4>Published weaknesses</h4>${list(debate.overall?.[key]?.blunders)}</section>`).join("")}</section>
    <section><h2>Section-by-section summary</h2><p>These are excerpts from the published assessment, not a new evaluation. Each section shows its score and one representative assessed move from each side.</p>
    ${debate.sections.map((section, index) => `<section id="assessed-section-${index + 1}"><h3>${escape(section.title)}</h3>${paragraph(section.timebox)}
      ${["pro", "con"].map((key) => {
        const move = section.exchanges.find((exchange) => exchange[key])?.[key];
        return `<h4>${escape(debate.sides[key].speaker)} — section score ${escape(section.score[key])}/100</h4>${move ? `${paragraph(move.words)}${paragraph(move.critique)}` : paragraph("No separate assessed move is recorded for this side in this section.")}`;
      }).join("")}</section>`).join("")}</section>`;
}

export function initialPageContent(path) {
  const debate = debates.find((item) => debatePath(item) === path);
  if (debate) return debateContent(debate);
  const profile = [...people.values()].find(({ person }) => interlocutorPath(person) === path);
  if (profile) {
    const individual = profile.records.filter(({ debate }) => eligible(debate));
    const team = profile.records.filter(({ debate }) => !eligible(debate));
    return `<section><h2>Published debate record</h2>${paragraph(individual.length ? `${individual.length} eligible one-on-one scorecards. Average published score: ${number(average(individual))}/100. Scores describe these debates, not the person's overall ability or worth.` : "No eligible one-on-one scorecards are available. Shared side scores are excluded from individual averages.")}
      ${cards(individual.map(({ debate }) => debate))}</section>${team.length ? `<section><h2>Team and other excluded appearances</h2><p>These records do not contribute to individual averages.</p>${cards(team.map(({ debate }) => debate))}</section>` : ""}`;
  }
  if (path === "/" || path === "/search/") return `<section><h2>${path === "/" ? "Newest debate additions" : "Browse all debate summaries"}</h2><p>These summaries and links work without JavaScript. Use your browser’s Find command to locate a speaker or subject; interactive filtering requires JavaScript.</p>${cards(path === "/" ? catalogue.slice(0, 12) : catalogue)}${path === "/" ? '<p><a href="/search/">Read all debate summaries</a></p>' : ""}</section>`;
  if (path === "/topics/") return topicCategoryDefinitions.map((topic) => `<section><h2>${escape(topic.title)}</h2>${paragraph(topic.description)}${cards(catalogue.filter((debate) => debate.topicCategory === topic.id))}</section>`).join("");
  if (path === "/rankings/") {
    const rows = [...people.values()].map(({ person, records }) => ({ person, records: records.filter(({ debate }) => eligible(debate)) })).filter(({ records }) => records.length).sort((a, b) => average(b.records) - average(a.records) || b.records.length - a.records.length || a.person.name.localeCompare(b.person.name));
    return `<section><h2>One-on-one scorecard averages</h2><p>Group debate scores are excluded. These averages summarize the published sample, not a definitive ranking of ability. Small samples and different opponents limit comparisons. Interactive filters and comparisons require JavaScript.</p><table><caption>All eligible interlocutors, ordered by published average</caption><thead><tr><th scope="col">Interlocutor</th><th scope="col">Scorecards</th><th scope="col">Average /100</th></tr></thead><tbody>${rows.map(({ person, records }) => `<tr><th scope="row"><a href="${escape(interlocutorPath(person))}">${escape(person.name)}</a></th><td>${records.length}</td><td>${number(average(records))}</td></tr>`).join("")}</tbody></table></section>`;
  }
  if (path === "/backend/" || path === "/assessment/") return `<section><h2>How to read an assessment</h2><p>Slugfester assesses the reasoning presented in a debate, not the worth of its speakers or the final truth of their worldviews. Published scores are AI-generated, revisable estimates. Read the arguments, critiques, and original source alongside the numbers.</p><h3>From transcript to scorecard</h3><p>The workflow starts from a complete transcript and a defined debate question. Independent judgments assess the selected argumentative moves; disagreements are reviewed before repository code calculates the scores. Published critiques explain strengths, limitations, and the remaining argumentative burden. Logical-fallacy and cognitive-bias labels describe specific defects rather than automatically imposing additional numerical penalties.</p><h3>Selection and comparison limits</h3><p>The catalogue is curated, not random or representative. Available complete sources, topic fit, reader interest, and reliable processing influence selection. Group and panel side scores are kept separate from individual one-on-one averages. Different opponents, topics, sample sizes, and assessment processes limit direct comparisons.</p><h3>Inspect the evidence</h3><p><a href="/insights/data-and-methods/">Read the research methods, classifications, and limitations</a>, <a href="/search/">browse the debate summaries</a>, or <a href="/corrections/">report a possible scorecard issue</a>. Detailed methodological controls and interactive forms are available when JavaScript is enabled.</p></section>`;
  return "";
}
