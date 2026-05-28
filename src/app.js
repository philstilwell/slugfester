import { debates } from "./data/debates.js";

const app = document.querySelector("#app");
const routePattern = /^#\/debate\/([a-z0-9-]+)$/;

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const scoreTone = (score) => {
  if (score >= 80) return "strong";
  if (score >= 65) return "mixed";
  return "weak";
};

const average = (values) =>
  Math.round(values.reduce((total, value) => total + value, 0) / values.length);

function renderShell(content) {
  return `
    <header class="site-header">
      <a class="brand" href="#" aria-label="Slugfester home">
        <img class="brand-logo" src="./assets/debate-gloves.png" alt="" width="444" height="444">
        <span class="brand-name">Slugfester</span>
      </a>
      <nav aria-label="Primary">
        <a href="#">Debates</a>
        <a href="https://logfall.com/" target="_blank" rel="noreferrer">LogFall</a>
        <a href="https://cogbias.site/" target="_blank" rel="noreferrer">CogBias</a>
      </nav>
    </header>
    ${content}
  `;
}

function renderLanding() {
  const debateCards = debates.map(renderDebateCard).join("");

  app.innerHTML = renderShell(`
    <main class="landing">
      <section class="landing-panel">
        <div class="intro-copy">
          <p class="eyebrow">Video debate transcript scorecards</p>
          <h1>Slugfester</h1>
          <p class="lede">Turn video debate transcripts into side-by-side argument maps: each side's words stay visible, each claim and rebuttal gets a numerical strength score, and every ◉ opens a deeper critique of the reasoning.</p>
        </div>
        <figure class="logo-showcase">
          <img
            src="./assets/slugfester-logo.jpg"
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
        <span>${escapeHtml(debate.label)}</span>
        <span>${escapeHtml(debate.duration)}</span>
      </div>
      <h3>${escapeHtml(debate.title)}</h3>
      <p class="motion">${escapeHtml(debate.motion)}</p>
      <p>${escapeHtml(debate.summary)}</p>
      <div class="side-score-strip" aria-label="Overall scores">
        ${renderMiniScore(debate.sides.pro.name, debate.score.pro, "teal")}
        ${renderMiniScore(debate.sides.con.name, debate.score.con, "coral")}
      </div>
      <div class="card-actions">
        <a class="button primary" href="#/debate/${encodeURIComponent(debate.id)}">Open Debate Assessment</a>
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

function renderDebate(id) {
  const debate = debates.find((item) => item.id === id);

  if (!debate) {
    app.innerHTML = renderShell(`
      <main class="not-found">
        <p class="eyebrow">No scorecard</p>
        <h1>Debate not found</h1>
        <a class="button primary" href="#">Back to debates</a>
      </main>
    `);
    return;
  }

  const sectionScores = debate.sections.flatMap((section) => [
    section.score.pro,
    section.score.con
  ]);

  app.innerHTML = renderShell(`
    <main class="debate-page">
      <section class="debate-hero">
        <div>
          <a class="back-link" href="#">Back to debates</a>
          <p class="eyebrow">${escapeHtml(debate.label)} · Last rendered: ${escapeHtml(debate.date)}</p>
          <h1>${escapeHtml(debate.title)}</h1>
          <p class="motion large">${escapeHtml(debate.motion)}</p>
          ${debate.sourceNote ? `<p class="source-note">${escapeHtml(debate.sourceNote)}</p>` : ""}
        </div>
        <figure class="debate-gloves-panel" aria-hidden="true">
          <img src="./assets/debate-gloves.png" alt="" width="444" height="444">
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
        <div class="side-heading teal">
          <span>${escapeHtml(debate.sides.pro.name)}</span>
          <strong>${escapeHtml(debate.sides.pro.speaker)}</strong>
        </div>
        <div class="side-heading coral">
          <span>${escapeHtml(debate.sides.con.name)}</span>
          <strong>${escapeHtml(debate.sides.con.speaker)}</strong>
        </div>
      </section>

      ${debate.sections.map((section) => renderSection(section, debate)).join("")}
      ${renderOverall(debate)}
    </main>
  `);
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
          <p class="eyebrow">${escapeHtml(section.timebox)}</p>
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
              ${renderArgument(exchange.pro, "teal")}
              ${renderArgument(exchange.con, "coral")}
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

function renderArgument(argument, tone) {
  if (!argument) {
    return `<article class="argument empty" aria-hidden="true"></article>`;
  }

  return `
    <article class="argument ${tone}">
      <div class="argument-meta">
        <span>${escapeHtml(argument.time)}</span>
        <span>${escapeHtml(argument.role)}</span>
        <strong class="${scoreTone(argument.score)}">${argument.score}</strong>
      </div>
      <p>${escapeHtml(argument.words)}</p>
      <div class="argument-footer">
        ${renderCritique(argument)}
        ${renderTags(argument.tags)}
      </div>
    </article>
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

function renderTags(tags = []) {
  if (!tags.length) {
    return `<span class="tag clean">No named fallacy</span>`;
  }

  return tags
    .map(
      (tag) => `
        <a class="tag ${escapeHtml(tag.type)}" href="${escapeHtml(tag.url)}" target="_blank" rel="noreferrer">
          ${escapeHtml(tag.label)}
        </a>
      `
    )
    .join("");
}

function renderOverall(debate) {
  return `
    <section class="overall" aria-labelledby="overall-heading">
      <div class="section-heading">
        <p class="eyebrow">Final read</p>
        <h2 id="overall-heading">Overall commentary</h2>
      </div>
      <div class="overall-grid">
        ${renderOverallSide(debate.sides.pro, debate.overall.pro, "teal")}
        ${renderOverallSide(debate.sides.con, debate.overall.con, "coral")}
      </div>
    </section>
  `;
}

function renderOverallSide(side, overall, tone) {
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
        ${overall.blunders.map(renderBlunder).join("")}
      </ul>
    </article>
  `;
}

function renderBlunder(blunder) {
  const links = blunder.links
    .map(
      (link) =>
        `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`
    )
    .join(" ");

  return `<li>${escapeHtml(blunder.text)} <span class="inline-links">${links}</span></li>`;
}

function route() {
  const match = window.location.hash.match(routePattern);
  if (match) {
    renderDebate(decodeURIComponent(match[1]));
  } else {
    renderLanding();
  }
}

window.addEventListener("hashchange", route);
route();
