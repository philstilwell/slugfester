import { debates } from "./data/debates.js";
import { avatarsForSpeakerText } from "./data/interlocutors.js";
import { getReferenceDefinition, referenceFromUrl } from "./data/references.js";
import {
  DEFAULT_IMAGE_ALT,
  DEFAULT_IMAGE_HEIGHT,
  DEFAULT_IMAGE_TYPE,
  DEFAULT_IMAGE_WIDTH,
  SITE_LOCALE,
  SITE_NAME,
  SITE_THEME_COLOR,
  absoluteUrl,
  assessmentPath,
  assessmentSeo,
  debateNumberLabel,
  debatePath,
  debateSeo,
  landingSeo,
  notFoundSeo,
  referencePath,
  referenceSeo,
  searchPath,
  searchSeo
} from "./seo.js";

const app = document.querySelector("#app");
const debateHashRoutePattern = /^#\/debate\/([a-z0-9-]+)$/;
const searchHashRoutePattern = /^#\/search$/;
const assessmentHashRoutePattern = /^#\/assessment$/;
const referenceHashRoutePattern = /^#\/reference\/(fallacy|bias)\/([a-z0-9-]+)(?:\?debate=([a-z0-9-]+))?$/;
const debatePathRoutePattern = /^\/debate\/([a-z0-9-]+)\/?$/;
const searchPathRoutePattern = /^\/search\/?$/;
const assessmentPathRoutePattern = /^\/assessment\/?$/;
const referencePathRoutePattern = /^\/reference\/(fallacy|bias)\/([a-z0-9-]+)\/?$/;

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const anchorSlug = (value = "") =>
  String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function timestampToSeconds(value = "") {
  const normalized = String(value).trim();
  if (!/^\d+:\d{2}(?::\d{2})?$/.test(normalized)) return null;

  const parts = normalized.split(":").map(Number);
  return parts.reduce((total, part) => total * 60 + part, 0);
}

function timestampStart(value = "") {
  return String(value).split(/[–—-]/)[0]?.trim() || "";
}

function timestampedYouTubeUrl(youtubeUrl, timestamp) {
  const seconds = timestampToSeconds(timestampStart(timestamp));
  if (seconds === null) return youtubeUrl;

  try {
    const url = new URL(youtubeUrl);
    url.searchParams.set("t", `${seconds}s`);
    return url.href;
  } catch {
    return youtubeUrl;
  }
}

const scoreTone = (score) => {
  if (score >= 80) return "strong";
  if (score >= 65) return "mixed";
  return "weak";
};

const average = (values) =>
  Math.round(values.reduce((total, value) => total + value, 0) / values.length);

const assessmentModel = "GPT 5.5 Extra High";

function setMeta(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.append(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}

function setCanonical(href) {
  let element = document.head.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.append(element);
  }

  element.setAttribute("href", href);
}

function removeHeadElement(selector) {
  document.head.querySelector(selector)?.remove();
}

function setStructuredData(jsonLd) {
  const id = "seo-structured-data";
  let element = document.getElementById(id);

  if (!jsonLd) {
    element?.remove();
    return;
  }

  if (!element) {
    element = document.createElement("script");
    element.id = id;
    element.type = "application/ld+json";
    document.head.append(element);
  }

  element.textContent = JSON.stringify(jsonLd);
}

function setSeo(seo) {
  const canonicalUrl = absoluteUrl(seo.canonicalPath || "/");
  const imageUrl = absoluteUrl(seo.imagePath || "/assets/slugfester-logo.jpg");
  const imageAlt = seo.imageAlt || DEFAULT_IMAGE_ALT;
  const imageWidth = seo.imageWidth || DEFAULT_IMAGE_WIDTH;
  const imageHeight = seo.imageHeight || DEFAULT_IMAGE_HEIGHT;
  const imageType = seo.imageType || DEFAULT_IMAGE_TYPE;
  const robots = seo.robots || "index,follow,max-image-preview:large";

  document.title = seo.title;
  setCanonical(canonicalUrl);
  setMeta('meta[name="description"]', { name: "description", content: seo.description });
  setMeta('meta[name="robots"]', { name: "robots", content: robots });
  setMeta('meta[name="author"]', { name: "author", content: SITE_NAME });
  setMeta('meta[name="application-name"]', { name: "application-name", content: SITE_NAME });
  setMeta('meta[name="apple-mobile-web-app-title"]', {
    name: "apple-mobile-web-app-title",
    content: SITE_NAME
  });
  setMeta('meta[name="theme-color"]', { name: "theme-color", content: SITE_THEME_COLOR });
  setMeta('meta[property="og:site_name"]', { property: "og:site_name", content: SITE_NAME });
  setMeta('meta[property="og:locale"]', { property: "og:locale", content: SITE_LOCALE });
  setMeta('meta[property="og:title"]', { property: "og:title", content: seo.title });
  setMeta('meta[property="og:description"]', { property: "og:description", content: seo.description });
  setMeta('meta[property="og:type"]', { property: "og:type", content: seo.type || "website" });
  setMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
  setMeta('meta[property="og:image"]', { property: "og:image", content: imageUrl });
  setMeta('meta[property="og:image:secure_url"]', {
    property: "og:image:secure_url",
    content: imageUrl
  });
  setMeta('meta[property="og:image:type"]', { property: "og:image:type", content: imageType });
  setMeta('meta[property="og:image:width"]', {
    property: "og:image:width",
    content: imageWidth
  });
  setMeta('meta[property="og:image:height"]', {
    property: "og:image:height",
    content: imageHeight
  });
  setMeta('meta[property="og:image:alt"]', { property: "og:image:alt", content: imageAlt });
  if (seo.articleSection) {
    setMeta('meta[property="article:section"]', {
      property: "article:section",
      content: seo.articleSection
    });
  } else {
    removeHeadElement('meta[property="article:section"]');
  }
  if (seo.modifiedTime) {
    setMeta('meta[property="article:modified_time"]', {
      property: "article:modified_time",
      content: seo.modifiedTime
    });
  } else {
    removeHeadElement('meta[property="article:modified_time"]');
  }
  setMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
  setMeta('meta[name="twitter:title"]', { name: "twitter:title", content: seo.title });
  setMeta('meta[name="twitter:description"]', { name: "twitter:description", content: seo.description });
  setMeta('meta[name="twitter:image"]', { name: "twitter:image", content: imageUrl });
  setMeta('meta[name="twitter:image:alt"]', { name: "twitter:image:alt", content: imageAlt });
  setStructuredData(seo.jsonLd);
}

function renderDebateNumber(debate) {
  return `
    <span class="debate-number" aria-label="${escapeHtml(debateNumberLabel(debate))}">
      ${escapeHtml(debate.number)}
    </span>
  `;
}

function renderShell(content) {
  return `
    <header class="site-header">
      <a class="brand" href="/" aria-label="Slugfester home">
        <img class="brand-logo" src="/assets/debate-gloves.png" alt="" width="444" height="444">
        <span class="brand-name">Slugfester</span>
      </a>
      <nav aria-label="Primary">
        <a href="/">Debates</a>
        <a href="${searchPath()}">Search</a>
        <a href="${assessmentPath()}">Assessment</a>
        <span class="external-sites" aria-label="External Sites">
          <span class="external-sites-label">External Sites</span>
          <span class="external-sites-links">
            <span class="external-site-item">
              <a href="https://logfall.com/" target="_blank" rel="noreferrer" aria-describedby="logfall-menu-popover">LogFall</a>
              <span class="external-site-popover" id="logfall-menu-popover" role="tooltip">
                <strong>LogFall</strong>
                Logical fallacy reference used for Slugfester's fallacy labels and source links.
              </span>
            </span>
            <span class="external-site-item">
              <a href="https://cogbias.site/" target="_blank" rel="noreferrer" aria-describedby="cogbias-menu-popover">CogBias</a>
              <span class="external-site-popover" id="cogbias-menu-popover" role="tooltip">
                <strong>CogBias</strong>
                Cognitive bias reference used for Slugfester's bias labels and source links.
              </span>
            </span>
          </span>
        </span>
      </nav>
    </header>
    ${content}
  `;
}

function renderLanding() {
  setSeo(landingSeo(debates));

  const debateCards = debates.map(renderDebateCard).join("");
  const topicList = debates
    .map((debate) => `${escapeHtml(debate.number)} ${escapeHtml(debate.label)}`)
    .join('<span aria-hidden="true"> | </span>');

  app.innerHTML = renderShell(`
    <main class="landing">
      <section class="landing-panel">
        <div class="intro-copy">
          <p class="eyebrow">Video debate transcript scorecards</p>
          <h1>Slugfester</h1>
          <p class="lede">Debate transcripts turned into side-by-side argument maps for ease of reader assessment.  Each claim and rebuttal receives AI scores, and every ◉ opens a deeper critique of the reasoning.</p>
          <div class="topic-divider" aria-hidden="true"></div>
          <p class="topic-list" aria-label="Topics mentioned in currently listed debates">${topicList}</p>
        </div>
        <figure class="logo-showcase">
          <img
            src="/assets/slugfester-logo.jpg"
            alt="Slugfester illustrated debate crest"
            width="603"
            height="900"
          >
        </figure>
      </section>

      <section class="debate-list" aria-labelledby="debates-heading">
        <div class="section-heading">
          <p class="eyebrow">Scorecards</p>
          <h2 id="debates-heading">Debates</h2>
        </div>
        <div class="debate-grid">${debateCards}</div>
      </section>
    </main>
  `);
}

function renderDebateCard(debate) {
  return `
    <article class="debate-card">
      <div class="card-topline">
        <span class="card-label">${renderDebateNumber(debate)}<span>${escapeHtml(debate.label)}</span></span>
        <span>${escapeHtml(debate.duration)}</span>
      </div>
      <h3><a class="debate-title-link" href="${escapeHtml(debatePath(debate))}">${escapeHtml(debate.title)}</a></h3>
      <p class="motion">${escapeHtml(debate.motion)}</p>
      <p>${escapeHtml(debate.summary)}</p>
      <div class="side-score-strip" aria-label="Overall scores">
        ${renderMiniScore(debate.sides.pro.name, debate.score.pro, "teal")}
        ${renderMiniScore(debate.sides.con.name, debate.score.con, "coral")}
      </div>
      <div class="card-actions">
        <a class="button primary" href="${escapeHtml(debatePath(debate))}">Open Debate Assessment</a>
        <a class="button secondary" href="${escapeHtml(debate.youtubeUrl)}" target="_blank" rel="noreferrer">YouTube Source</a>
      </div>
    </article>
  `;
}

function renderMiniScore(label, score, color) {
  return `
    <div class="mini-score ${color}">
      <span>${escapeHtml(label)}</span>
      <strong>${score}</strong>
      <i style="--score-width:${score}%"></i>
    </div>
  `;
}

function normalizeSearchValue(value = "") {
  return String(value)
    .replaceAll("’", "'")
    .toLowerCase()
    .trim();
}

function uniqueInterlocutorsForDebate(debate) {
  const avatars = [
    ...avatarsForSpeakerText(debate.sides.pro.speaker),
    ...avatarsForSpeakerText(debate.sides.con.speaker)
  ];
  return [...new Map(avatars.map((avatar) => [avatar.name, avatar])).values()];
}

function searchFacets() {
  const people = new Map();

  debates.forEach((debate) => {
    uniqueInterlocutorsForDebate(debate).forEach((avatar) => {
      const current = people.get(avatar.name) || { ...avatar, count: 0 };
      current.count += 1;
      people.set(avatar.name, current);
    });
  });

  return {
    people: [...people.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  };
}

function searchState() {
  const params = new URLSearchParams(window.location.search);
  return {
    query: params.get("q") || "",
    people: params.getAll("person")
  };
}

function searchUrl(state) {
  const params = new URLSearchParams();

  if (state.query.trim()) params.set("q", state.query.trim());
  state.people.forEach((person) => params.append("person", person));

  const query = params.toString();
  return `${searchPath()}${query ? `?${query}` : ""}`;
}

function debateSearchText(debate) {
  return [
    debate.number,
    debate.title,
    debate.label,
    debate.motion,
    debate.summary,
    debate.sides.pro.name,
    debate.sides.pro.speaker,
    debate.sides.con.name,
    debate.sides.con.speaker,
    ...debate.sections.map((section) => section.title)
  ].join(" ");
}

function debateMatchesSearch(debate, state) {
  const people = uniqueInterlocutorsForDebate(debate).map((avatar) => avatar.name);
  const selectedPeopleMatch = state.people.every((person) => people.includes(person));
  const query = normalizeSearchValue(state.query);
  const queryMatch = !query || normalizeSearchValue(debateSearchText(debate)).includes(query);

  return selectedPeopleMatch && queryMatch;
}

function searchMatchesLabel(state) {
  const query = state.query.trim();
  const terms = [...(query ? [`"${query}"`] : []), ...state.people];
  return terms.length ? terms.join(" | ") : "all debates";
}

function toggleValue(values, value) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function navigateSearch(state) {
  const next = searchUrl(state);
  if (next !== `${window.location.pathname}${window.location.search}`) {
    window.history.pushState({}, "", next);
  }
  route();
}

function renderSearch() {
  setSeo(searchSeo(debates));

  const state = searchState();
  const facets = searchFacets();
  const matches = debates.filter((debate) => debateMatchesSearch(debate, state));
  const hasFilters = Boolean(state.query.trim() || state.people.length);

  app.innerHTML = renderShell(`
    <main class="search-page">
      <section class="search-hero">
        <div>
          <p class="eyebrow">Search scorecards</p>
          <h1>Find debates</h1>
        </div>
        <p class="search-count">${matches.length} of ${debates.length} debates</p>
      </section>

      <section class="search-tool" aria-label="Search filters">
        <form class="search-form" role="search">
          <label for="search-query">Text</label>
          <div class="search-input-row">
            <input id="search-query" name="q" type="search" value="${escapeHtml(state.query)}" placeholder="speaker, claim, title">
            <button class="button primary" type="submit">Apply</button>
            ${hasFilters ? `<button class="button secondary" type="button" data-clear-search>Clear</button>` : ""}
          </div>
        </form>

        <div class="filter-section">
          <div class="filter-heading">
            <h2>Interlocutors</h2>
            <span>${state.people.length || "Any"}</span>
          </div>
          <div class="interlocutor-filter-list">
            ${facets.people.map((person) => renderPersonFilter(person, state.people.includes(person.name))).join("")}
          </div>
        </div>
      </section>

      <section class="search-results" aria-labelledby="search-results-heading">
        <div class="section-heading">
          <p class="eyebrow search-match-label">Matches: ${escapeHtml(searchMatchesLabel(state))}</p>
          <h2 id="search-results-heading">Debates</h2>
        </div>
        ${
          matches.length
            ? `<div class="search-result-list">${matches.map(renderSearchResult).join("")}</div>`
            : `<div class="empty-results"><strong>No debates matched.</strong><span>Try fewer people or a broader text search.</span></div>`
        }
      </section>
    </main>
  `);

  bindSearchControls(state);
}

function renderPersonFilter(person, selected) {
  return `
    <button class="person-filter ${selected ? "active" : ""}" type="button" data-filter-type="person" data-filter-value="${escapeHtml(person.name)}" aria-pressed="${selected}">
      <img src="${escapeHtml(person.src)}" alt="${escapeHtml(person.name)}" width="512" height="512" loading="lazy" decoding="async">
      <span>${escapeHtml(person.name)}</span>
      <strong>${person.count}</strong>
    </button>
  `;
}

function renderSearchResult(debate) {
  const people = uniqueInterlocutorsForDebate(debate);

  return `
    <article class="search-result">
      <div class="card-topline">
        <span class="card-label">${renderDebateNumber(debate)}<span>${escapeHtml(debate.label)}</span></span>
        <span>${escapeHtml(debate.duration)}</span>
      </div>
      <div class="search-result-main">
        <div>
          <h3><a class="debate-title-link search-result-title-link" href="${escapeHtml(debatePath(debate))}">${escapeHtml(debate.title)}</a></h3>
          <p class="motion">${escapeHtml(debate.motion)}</p>
          <p>${escapeHtml(debate.summary)}</p>
        </div>
        <div class="result-people" aria-label="Interlocutors">
          ${people.map(renderResultPerson).join("")}
        </div>
      </div>
      <div class="side-score-strip" aria-label="Overall scores">
        ${renderMiniScore(debate.sides.pro.name, debate.score.pro, "teal")}
        ${renderMiniScore(debate.sides.con.name, debate.score.con, "coral")}
      </div>
      <div class="card-actions">
        <a class="button primary" href="${escapeHtml(debatePath(debate))}">Open Debate Assessment</a>
        <a class="button secondary" href="${escapeHtml(debate.youtubeUrl)}" target="_blank" rel="noreferrer">YouTube Source</a>
      </div>
    </article>
  `;
}

function renderResultPerson(person) {
  return `
    <span class="result-person">
      <img src="${escapeHtml(person.src)}" alt="" width="512" height="512" loading="lazy" decoding="async">
      <span>${escapeHtml(person.name)}</span>
    </span>
  `;
}

function renderAssessment() {
  setSeo(assessmentSeo());

  app.innerHTML = renderShell(`
    <main class="assessment-page">
      <section class="assessment-hero">
        <div>
          <p class="eyebrow">Assessment</p>
          <h1>The Codex Assessment Process</h1>
          <p class="assessment-lede">Slugfester turns debate transcripts into scorecards by separating what each side actually said from how well each claim was supported, answered, and kept logically disciplined.</p>
        </div>
        <aside class="assessment-stamp" aria-label="Assessment model">
          <span>AI assessment model</span>
          <strong>${escapeHtml(assessmentModel)}</strong>
          <p>Scores are estimates, not verdicts. They summarize argument quality under conventional standards of coherence, evidence, burden of proof, and fallacy avoidance.</p>
        </aside>
      </section>

      <section class="assessment-principles" aria-labelledby="assessment-principles-heading">
        <div class="section-heading">
          <p class="eyebrow">Core test</p>
          <h2 id="assessment-principles-heading">What gets rewarded</h2>
        </div>
        <div class="principle-grid">
          ${renderAssessmentPrinciple("Coherence", "The claim has stable terms, a visible inference, and no hidden contradiction between its premises and conclusion.")}
          ${renderAssessmentPrinciple("Evidence", "The speaker gives reasons a listener can inspect: data, textual support, historical context, definitions, or a clear explanatory model.")}
          ${renderAssessmentPrinciple("Rebuttal quality", "The response engages the strongest live objection rather than changing the subject, repeating the thesis, or attacking a weaker paraphrase.")}
          ${renderAssessmentPrinciple("Burden discipline", "The side making the stronger claim carries the matching burden and does not require the opponent to disprove an unsupported possibility.")}
        </div>
      </section>

      <section class="assessment-flow" aria-labelledby="assessment-flow-heading">
        <div class="section-heading">
          <p class="eyebrow">Workflow</p>
          <h2 id="assessment-flow-heading">From transcript to scorecard</h2>
        </div>
        <ol class="process-steps">
          <li><span>01</span><strong>Capture and clean the transcript.</strong><p>The source transcript is preserved as the grounding material. Filler can be trimmed, but direct quotations are not invented.</p></li>
          <li><span>02</span><strong>Identify the live question.</strong><p>The motion or central dispute is made explicit, because a clever point can still score poorly if it does not answer the debate question.</p></li>
          <li><span>03</span><strong>Extract representative quotes.</strong><p>Each side gets short quotes that encapsulate its position. These quotes anchor the reader before the scoring begins.</p></li>
          <li><span>04</span><strong>Segment by argumentative movement.</strong><p>The debate is divided into topical sections, then opposing moves are aligned by issue rather than by every interruption.</p></li>
          <li><span>05</span><strong>Score claims and rebuttals.</strong><p>Each argument receives a numerical score based on logic, relevance, evidential support, responsiveness, and fallacy pressure.</p></li>
          <li><span>06</span><strong>Write critique popovers.</strong><p>Every ◉ opens a focused critique explaining what worked, what failed, and why the score follows from that balance.</p></li>
        </ol>
      </section>

      <section class="assessment-rubric" aria-labelledby="assessment-rubric-heading">
        <div class="section-heading">
          <p class="eyebrow">Rubric</p>
          <h2 id="assessment-rubric-heading">How the numbers read</h2>
        </div>
        <div class="score-band-list">
          ${renderScoreBand("90-100", "Exceptional", "Clear, relevant, well-supported, and resilient under the obvious rebuttals.", 96)}
          ${renderScoreBand("80-89", "Strong", "Persuasive overall, with limited gaps or uncertainties that do not threaten the main inference.", 86)}
          ${renderScoreBand("70-79", "Solid", "Coherent and relevant, but compressed, under-sourced, or only partly developed.", 76)}
          ${renderScoreBand("60-69", "Mixed", "Understandable, but dependent on weak warrants, speculative links, or incomplete replies.", 66)}
          ${renderScoreBand("50-59", "Weak", "Noticeable misframing, missing evidence, or poor engagement with the actual objection.", 56)}
          ${renderScoreBand("<50", "Defective", "Fallacious, irrelevant, self-undermining, or unsupported at the point that matters.", 42)}
        </div>
      </section>

      <section class="assessment-examples" aria-labelledby="assessment-examples-heading">
        <div class="section-heading">
          <p class="eyebrow">Examples</p>
          <h2 id="assessment-examples-heading">What changes a score</h2>
        </div>
        <div class="example-grid">
          ${renderAssessmentExample(
            "A cumulative case",
            "Example move: a speaker links cosmology, fine-tuning, moral realism, and resurrection into one case.",
            "This can score well when each strand is stated modestly and the conclusion is framed as cumulative probability. It drops when the speaker treats several individually controversial premises as if their mere accumulation removes the need to defend them."
          )}
          ${renderAssessmentExample(
            "A sharper rebuttal",
            "Example move: an opponent says the causal premise is being projected beyond observed physical contexts.",
            "That is stronger than saying, 'That is just faith,' because it names the disputed warrant. The score rises when the rebuttal explains why the premise fails and how that affects the conclusion."
          )}
          ${renderAssessmentExample(
            "A fallacy label",
            "Example move: a conclusion is smuggled into a premise, then presented as independently established.",
            "This may receive a begging-the-question tag only if the circularity is doing real argumentative work. Slugfester avoids using fallacy names as decorative insults."
          )}
          ${renderAssessmentExample(
            "A bias label",
            "Example move: a speaker highlights only examples that favor a prior worldview while ignoring nearby counterexamples.",
            "This may receive a confirmation-bias note when the pattern affects the evaluation of evidence, not merely because the speaker has a point of view."
          )}
        </div>
      </section>

      <section class="assessment-detail" aria-labelledby="assessment-detail-heading">
        <div>
          <p class="eyebrow">Limits</p>
          <h2 id="assessment-detail-heading">What the score is not</h2>
        </div>
        <div class="assessment-detail-copy">
          <p>A Slugfester score is not a measure of truth, moral worth, charisma, audience reaction, or whether the assessor personally agrees with a conclusion. It is a compact judgment about the argument as performed in the transcript.</p>
          <p>That means a side can defend a true claim poorly, or make a false claim with unusual logical discipline. The score follows the reasoning on the page: definitions, warrants, evidence, rebuttal, and the absence or presence of fallacies and cognitive-bias-shaped overreach.</p>
          <p>Named fallacies and biases link through local Slugfester reference pages first. Those pages define the concept, explain why it appears in that debate context, and then point to the deeper external LogFall or CogBias entry.</p>
        </div>
      </section>
    </main>
  `);
}

function renderAssessmentPrinciple(title, text) {
  return `
    <article class="principle-card">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(text)}</p>
    </article>
  `;
}

function renderScoreBand(range, label, text, width) {
  return `
    <article class="score-band" style="--band-width:${width}%">
      <div>
        <strong>${escapeHtml(range)}</strong>
        <span>${escapeHtml(label)}</span>
      </div>
      <p>${escapeHtml(text)}</p>
      <i aria-hidden="true"></i>
    </article>
  `;
}

function renderAssessmentExample(title, move, assessment) {
  return `
    <article class="assessment-example">
      <h3>${escapeHtml(title)}</h3>
      <p class="example-move">${escapeHtml(move)}</p>
      <p>${escapeHtml(assessment)}</p>
    </article>
  `;
}

function bindSearchControls(state) {
  const page = app.querySelector(".search-page");
  if (!page) return;

  page.querySelector(".search-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = page.querySelector("#search-query")?.value || "";
    navigateSearch({ ...state, query });
  });

  page.querySelector("[data-clear-search]")?.addEventListener("click", () => {
    navigateSearch({ query: "", people: [] });
  });

  page.querySelectorAll("[data-filter-type]").forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.filterType;
      const value = button.dataset.filterValue;
      const query = page.querySelector("#search-query")?.value || state.query;

      if (type === "person") {
        navigateSearch({ ...state, query, people: toggleValue(state.people, value) });
      }
    });
  });
}

function renderDebate(id) {
  const debate = debates.find((item) => item.id === id);

  if (!debate) {
    setSeo(notFoundSeo());
    app.innerHTML = renderShell(`
      <main class="not-found">
        <p class="eyebrow">No scorecard</p>
        <h1>Debate not found</h1>
        <a class="button primary" href="/">Back to debates</a>
      </main>
    `);
    return;
  }

  setSeo(debateSeo(debate));

  const sectionScores = debate.sections.flatMap((section) => [
    section.score.pro,
    section.score.con
  ]);

  app.innerHTML = renderShell(`
    <main class="debate-page">
      <section class="debate-hero">
        <div>
          <a class="back-link" href="/">Back to debates</a>
          <p class="eyebrow">${escapeHtml(debateNumberLabel(debate))} · ${escapeHtml(debate.label)} · Last rendered: ${escapeHtml(debate.date)}</p>
          <h1>${escapeHtml(debate.title)}</h1>
          <p class="motion large">${escapeHtml(debate.motion)}</p>
          ${debate.sourceNote ? `<p class="source-note">${escapeHtml(debate.sourceNote)}</p>` : ""}
        </div>
        <figure class="debate-gloves-panel" aria-hidden="true">
          <img src="/assets/debate-gloves.png" alt="" width="444" height="444">
        </figure>
        <aside class="scoreboard" aria-label="Debate score summary">
          <div>
            <span>Average section score</span>
            <strong>${average(sectionScores)}</strong>
          </div>
          ${renderMiniScore(debate.sides.pro.name, debate.score.pro, "teal")}
          ${renderMiniScore(debate.sides.con.name, debate.score.con, "coral")}
          <a class="button secondary" href="${escapeHtml(debate.youtubeUrl)}" target="_blank" rel="noreferrer">Open YouTube source</a>
        </aside>
      </section>

      ${renderQuoteCards(debate)}
      ${renderScoringNote(debate)}
      ${renderInteractionGuide()}

      <section class="columns-head" aria-label="Debate sides">
        ${renderSideHeading(debate.sides.pro, "teal")}
        ${renderSideHeading(debate.sides.con, "coral")}
      </section>

      ${debate.sections.map((section) => renderSection(section, debate)).join("")}
      ${renderOverall(debate)}
    </main>
  `);
}

function renderSideHeading(side, tone) {
  return `
    <div class="side-heading ${tone}">
      <span class="side-name">${escapeHtml(side.name)}</span>
      <div class="side-speaker-lockup">
        ${renderSpeakerAvatars(side.speaker)}
        <strong>${escapeHtml(side.speaker)}</strong>
      </div>
    </div>
  `;
}

function renderSpeakerAvatars(speakerText) {
  const avatars = avatarsForSpeakerText(speakerText);
  if (!avatars.length) return "";

  return `
    <span class="speaker-avatar-stack" aria-hidden="true">
      ${avatars
        .map(
          (avatar) => `
            <img
              class="speaker-avatar"
              src="${escapeHtml(avatar.src)}"
              alt=""
              width="512"
              height="512"
              loading="lazy"
              decoding="async"
            >
          `
        )
        .join("")}
    </span>
  `;
}

function renderInteractionGuide() {
  return `
    <section class="interaction-guide" aria-label="How to read critiques">
      <strong>◉ Deeper critiques</strong>
      <span>Mouse over the ◉ symbols, or focus them with the keyboard, to open a longer critique of each scored argument.</span>
    </section>
  `;
}

function renderScoringNote(debate) {
  if (!debate.scoringNote) return "";

  return `
    <section class="scoring-note" aria-label="Scoring note">
      <strong>AI-generated scorecard</strong>
      <span>${escapeHtml(debate.scoringNote)}</span>
      <span class="assessment-model">Assessments made by ${escapeHtml(assessmentModel)}.</span>
    </section>
  `;
}

function renderQuoteCards(debate) {
  if (!debate.quotes) return "";

  return `
    <section class="quote-panel" aria-label="Position quotes">
      <div class="quote-panel-head">
        <div>
          <p class="eyebrow">Representative transcript quotes</p>
          <h2>Positions in their words</h2>
        </div>
      </div>
      <div class="quote-grid">
        ${renderQuoteCard(debate.sides.pro, debate.quotes.pro, "teal")}
        ${renderQuoteCard(debate.sides.con, debate.quotes.con, "coral")}
      </div>
    </section>
  `;
}

function renderQuoteCard(side, quote, tone) {
  if (!quote) return "";

  return `
    <article class="quote-card ${tone}">
      <span class="quote-side">${escapeHtml(side.name)} · ${escapeHtml(side.speaker)}</span>
      <blockquote>"${escapeHtml(quote.text)}"</blockquote>
      <p>${escapeHtml(quote.context)}</p>
    </article>
  `;
}

function renderSection(section, debate) {
  return `
    <section class="debate-section">
      <div class="section-title-row">
        <div>
          <p class="eyebrow">${renderTimestampLink(section.timebox, debate.youtubeUrl, `Open YouTube source at ${section.timebox}`)}</p>
          <h2>${escapeHtml(section.title)}</h2>
        </div>
        <div class="section-score-pair">
          ${renderSectionScore(debate.sides.pro.name, section.score.pro)}
          ${renderSectionScore(debate.sides.con.name, section.score.con)}
        </div>
      </div>
      <div class="exchange-grid">
        ${section.exchanges
          .map(
            (exchange) => `
              ${renderArgument(exchange.pro, "teal", debate, section, "pro")}
              ${renderArgument(exchange.con, "coral", debate, section, "con")}
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderSectionScore(label, score) {
  return `
    <div class="section-score ${scoreTone(score)}">
      <span>${escapeHtml(label)}</span>
      <strong>${score}</strong>
    </div>
  `;
}

function renderArgument(argument, tone, debate, section, sideKey) {
  if (!argument) {
    return `<article class="argument empty" aria-hidden="true"></article>`;
  }

  return `
    <article class="argument ${tone}">
      <div class="argument-meta">
        <span>${renderTimestampLink(argument.time, debate.youtubeUrl, `Open YouTube source at ${argument.time}`)}</span>
        <span>${escapeHtml(argument.role)}</span>
        <strong class="${scoreTone(argument.score)}">${argument.score}</strong>
      </div>
      <p>${escapeHtml(argument.words)}</p>
      <div class="argument-footer">
        ${renderCritique(argument)}
        ${renderTags(argument.tags, debate, section, sideKey, argument)}
      </div>
    </article>
  `;
}

function renderTimestampLink(label, youtubeUrl, ariaLabel) {
  const href = timestampedYouTubeUrl(youtubeUrl, label);

  return `
    <a class="timestamp-link" href="${escapeHtml(href)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(ariaLabel)}">
      ${escapeHtml(label)}
    </a>
  `;
}

function renderCritique(argument) {
  return `
    <span class="critique">
      <button type="button" aria-label="Critique for ${escapeHtml(argument.role)}">◉</button>
      <span class="critique-popover" role="tooltip">
        <strong>${argument.score}/100 · ${escapeHtml(argument.role)}</strong>
        <span>${escapeHtml(argument.critique)}</span>
      </span>
    </span>
  `;
}

function renderTags(tags = [], debate, section, sideKey, argument) {
  if (!tags.length) {
    return `<span class="tag clean">No named fallacy</span>`;
  }

  return tags
    .map((tag) => renderTag(tag, debate, section, sideKey, argument))
    .join("");
}

function renderTag(tag, debate, section, sideKey, argument) {
  const reference = referenceFromUrl(tag.url);
  const definition = reference ? getReferenceDefinition(reference.type, reference.slug) : null;
  const category = tag.type === "fallacy" ? "Logical fallacy" : "Cognitive bias";
  const occurrenceId = referenceOccurrenceId({ debate, section, sideKey, argument, tag });
  const localHref = referenceHref(tag.url, debate.id, occurrenceId);

  return `
    <span class="tag-wrap">
      <a class="tag ${escapeHtml(tag.type)}" href="${escapeHtml(localHref)}">
        ${escapeHtml(tag.label)}
      </a>
      <span class="tag-popover" role="tooltip">
        <strong>${escapeHtml(tag.label)}</strong>
        <em>${category}</em>
        ${definition ? `<span>${escapeHtml(definition.definition)}</span>` : ""}
        <span class="tag-context">${escapeHtml(tag.context)}</span>
        <span class="tag-popover-note">Click button for more info.</span>
      </span>
    </span>
  `;
}

function referenceHref(url, debateId = "", occurrenceId = "") {
  const reference = referenceFromUrl(url);
  if (!reference) return url;

  const hash = occurrenceId ? `#${encodeURIComponent(occurrenceId)}` : "";
  return `${referencePath(reference.type, reference.slug, debateId)}${hash}`;
}

function referenceOccurrenceId({ debate, section, sideKey, argument, tag }) {
  const reference = referenceFromUrl(tag.url);
  const side = debate.sides[sideKey];
  const parts = [
    "occurrence",
    reference?.type || tag.type,
    reference?.slug || tag.label,
    debate.id,
    side?.speaker || sideKey,
    section.title,
    argument.time,
    argument.role
  ];

  return parts.map(anchorSlug).filter(Boolean).join("-");
}

function renderOverall(debate) {
  return `
    <section class="overall" aria-labelledby="overall-heading">
      <div class="section-heading">
        <p class="eyebrow">Final read</p>
        <h2 id="overall-heading">Overall commentary</h2>
      </div>
      <div class="overall-grid">
        ${renderOverallSide(debate.sides.pro, debate.overall.pro, "teal", debate.id)}
        ${renderOverallSide(debate.sides.con, debate.overall.con, "coral", debate.id)}
      </div>
    </section>
  `;
}

function renderOverallSide(side, overall, tone, debateId) {
  return `
    <article class="overall-side ${tone}">
      <div class="overall-score">
        <span>${escapeHtml(side.name)} · ${escapeHtml(side.speaker)}</span>
        <strong>${overall.score}</strong>
      </div>
      <h3>Strengths</h3>
      <ul>
        ${overall.strengths.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
      <h3>Logical blunders</h3>
      <ul>
        ${overall.blunders.map((blunder) => renderBlunder(blunder, debateId)).join("")}
      </ul>
    </article>
  `;
}

function renderBlunder(blunder, debateId) {
  const links = blunder.links
    .map(
      (link) => {
        const href = referenceHref(link.url, debateId);
        const isInternal = href.startsWith("#/");
        const target = isInternal ? "" : ' target="_blank" rel="noreferrer"';
        return `<a href="${escapeHtml(href)}"${target}>${escapeHtml(link.label)}</a>`;
      }
    )
    .join(" ");

  return `<li>${escapeHtml(blunder.text)} <span class="inline-links">${links}</span></li>`;
}

function renderReference(type, slug, sourceDebateId = "") {
  const reference = getReferenceDefinition(type, slug);

  if (!reference) {
    setSeo(notFoundSeo());
    app.innerHTML = renderShell(`
      <main class="not-found">
        <p class="eyebrow">No reference</p>
        <h1>Reference not found</h1>
        <a class="button primary" href="/">Back to debates</a>
      </main>
    `);
    return;
  }

  setSeo(referenceSeo(type, slug, reference));

  const category = type === "fallacy" ? "Logical fallacy" : "Cognitive bias";
  const source = type === "fallacy" ? "LogFall" : "CogBias";
  const appearances = collectReferenceAppearances(type, slug);
  const sourceDebate = findSourceDebate(sourceDebateId, appearances);

  app.innerHTML = renderShell(`
    <main class="reference-page">
      <nav class="reference-nav" aria-label="Reference navigation">
        <a class="back-link" href="/">Back to debates</a>
        ${sourceDebate ? `<span aria-hidden="true">|</span><a class="back-link" href="${escapeHtml(debatePath(sourceDebate))}">Back to this debate</a>` : ""}
      </nav>
      <section class="reference-card ${escapeHtml(type)}">
        <p class="eyebrow">${category}</p>
        <h1>${escapeHtml(reference.label)}</h1>
        <p>${escapeHtml(reference.definition)}</p>
        <div class="reference-actions">
          <a class="button primary" href="${escapeHtml(reference.externalUrl)}" target="_blank" rel="noreferrer">
            Read the in-depth ${source} entry
          </a>
        </div>
      </section>
      ${
        appearances.length
          ? `
            <section class="reference-contexts" aria-labelledby="reference-contexts-heading">
              <div class="section-heading">
                <p class="eyebrow">Debate context</p>
                <h2 id="reference-contexts-heading">Why this label appears here</h2>
              </div>
              <div class="reference-context-list">
                ${appearances.map(renderReferenceAppearance).join("")}
              </div>
            </section>
          `
          : ""
      }
    </main>
  `);
}

function findSourceDebate(sourceDebateId, appearances) {
  const explicitDebate = debates.find((debate) => debate.id === sourceDebateId);
  if (explicitDebate) return explicitDebate;

  const uniqueDebates = [...new Map(appearances.map((appearance) => [appearance.debate.id, appearance.debate])).values()];
  return uniqueDebates.length === 1 ? uniqueDebates[0] : null;
}

function collectReferenceAppearances(type, slug) {
  const appearances = [];

  debates.forEach((debate) => {
    debate.sections.forEach((section) => {
      section.exchanges.forEach((exchange) => {
        ["pro", "con"].forEach((sideKey) => {
          const argument = exchange[sideKey];
          if (!argument) return;

          argument.tags.forEach((tag) => {
            const reference = referenceFromUrl(tag.url);
            if (reference?.type !== type || reference.slug !== slug) return;

            appearances.push({
              debate,
              section,
              sideKey,
              side: debate.sides[sideKey],
              argument,
              tag
            });
          });
        });
      });
    });
  });

  return appearances;
}

function renderReferenceAppearance(appearance) {
  const debateHref = debatePath(appearance.debate);
  const occurrenceId = referenceOccurrenceId(appearance);

  return `
    <article class="reference-context-card" id="${escapeHtml(occurrenceId)}">
      <div class="card-topline">
        <a class="reference-debate-link" href="${escapeHtml(debateHref)}">${escapeHtml(debateNumberLabel(appearance.debate))} · ${escapeHtml(appearance.debate.label)}</a>
        <span>${renderTimestampLink(appearance.argument.time, appearance.debate.youtubeUrl, `Open YouTube source at ${appearance.argument.time}`)}</span>
      </div>
      <h3>${escapeHtml(appearance.section.title)}</h3>
      <p class="reference-speaker">${escapeHtml(appearance.side.name)} · ${escapeHtml(appearance.side.speaker)} · ${escapeHtml(appearance.argument.role)}</p>
      <blockquote>${escapeHtml(appearance.argument.words)}</blockquote>
      <p>${escapeHtml(appearance.tag.context)}</p>
      <p class="reference-debate-return">
        <a href="${escapeHtml(debateHref)}">Open debate scorecard: ${escapeHtml(debateNumberLabel(appearance.debate))} · ${escapeHtml(appearance.debate.title)}</a>
      </p>
    </article>
  `;
}

function scrollToHashTarget(hash = window.location.hash) {
  if (!hash || hash.startsWith("#/")) return false;

  let id = hash.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    return false;
  }

  const target = document.getElementById(id);
  if (!target) return false;

  target.scrollIntoView({ block: "start" });
  return true;
}

function scrollToHashTargetAfterRender() {
  window.requestAnimationFrame(() => {
    scrollToHashTarget();
  });
}

function route() {
  const hash = window.location.hash;
  const debateMatch =
    hash.match(debateHashRoutePattern) || window.location.pathname.match(debatePathRoutePattern);
  const searchMatch =
    hash.match(searchHashRoutePattern) || window.location.pathname.match(searchPathRoutePattern);
  const assessmentMatch =
    hash.match(assessmentHashRoutePattern) ||
    window.location.pathname.match(assessmentPathRoutePattern);
  const referenceMatch =
    hash.match(referenceHashRoutePattern) ||
    window.location.pathname.match(referencePathRoutePattern);

  if (debateMatch) {
    renderDebate(decodeURIComponent(debateMatch[1]));
  } else if (searchMatch) {
    renderSearch();
  } else if (assessmentMatch) {
    renderAssessment();
  } else if (referenceMatch) {
    const sourceDebateId =
      referenceMatch[3] || new URLSearchParams(window.location.search).get("debate") || "";
    renderReference(referenceMatch[1], referenceMatch[2], sourceDebateId);
  } else if (window.location.pathname !== "/") {
    setSeo(notFoundSeo());
    app.innerHTML = renderShell(`
      <main class="not-found">
        <p class="eyebrow">No page</p>
        <h1>Page not found</h1>
        <a class="button primary" href="/">Back to debates</a>
      </main>
    `);
  } else {
    renderLanding();
  }

  scrollToHashTargetAfterRender();
}

function shouldHandleInternally(link) {
  if (link.target || link.hasAttribute("download")) return false;

  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  if (
    url.hash &&
    !url.pathname.match(debatePathRoutePattern) &&
    !url.pathname.match(searchPathRoutePattern) &&
    !url.pathname.match(assessmentPathRoutePattern) &&
    !url.pathname.match(referencePathRoutePattern)
  ) {
    return false;
  }

  return (
    url.pathname === "/" ||
    debatePathRoutePattern.test(url.pathname) ||
    searchPathRoutePattern.test(url.pathname) ||
    assessmentPathRoutePattern.test(url.pathname) ||
    referencePathRoutePattern.test(url.pathname)
  );
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (!link || !shouldHandleInternally(link)) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  event.preventDefault();

  const url = new URL(link.href, window.location.href);
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.pushState({}, "", next);
  }
  route();
  window.scrollTo(0, 0);
});

window.addEventListener("hashchange", route);
window.addEventListener("popstate", route);
route();
