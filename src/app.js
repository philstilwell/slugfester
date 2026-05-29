import { debates } from "./data/debates.js";
import { getReferenceDefinition, referenceFromUrl } from "./data/references.js";

const app = document.querySelector("#app");
const debateRoutePattern = /^#\/debate\/([a-z0-9-]+)$/;
const referenceRoutePattern = /^#\/reference\/(fallacy|bias)\/([a-z0-9-]+)(?:\?debate=([a-z0-9-]+))?$/;

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
  const debateCards = debates.map(renderDebateCard).join("");
  const topicList = [...new Set(debates.map((debate) => debate.label))]
    .map(escapeHtml)
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
              ${renderArgument(exchange.pro, "teal", debate.id)}
              ${renderArgument(exchange.con, "coral", debate.id)}
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

function renderArgument(argument, tone, debateId) {
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
        ${renderTags(argument.tags, debateId)}
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

function renderTags(tags = [], debateId = "") {
  if (!tags.length) {
    return `<span class="tag clean">No named fallacy</span>`;
  }

  return tags
    .map((tag) => renderTag(tag, debateId))
    .join("");
}

function renderTag(tag, debateId) {
  const reference = referenceFromUrl(tag.url);
  const definition = reference ? getReferenceDefinition(reference.type, reference.slug) : null;
  const category = tag.type === "fallacy" ? "Logical fallacy" : "Cognitive bias";
  const localHref = referenceHref(tag.url, debateId);

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

function referenceHref(url, debateId = "") {
  const reference = referenceFromUrl(url);
  if (!reference) return url;

  const source = debateId ? `?debate=${encodeURIComponent(debateId)}` : "";
  return `#/reference/${reference.type}/${reference.slug}${source}`;
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
    app.innerHTML = renderShell(`
      <main class="not-found">
        <p class="eyebrow">No reference</p>
        <h1>Reference not found</h1>
        <a class="button primary" href="#">Back to debates</a>
      </main>
    `);
    return;
  }

  const category = type === "fallacy" ? "Logical fallacy" : "Cognitive bias";
  const source = type === "fallacy" ? "LogFall" : "CogBias";
  const appearances = collectReferenceAppearances(type, slug);
  const sourceDebate = findSourceDebate(sourceDebateId, appearances);

  app.innerHTML = renderShell(`
    <main class="reference-page">
      <nav class="reference-nav" aria-label="Reference navigation">
        <a class="back-link" href="#">Back to debates</a>
        ${sourceDebate ? `<span aria-hidden="true">|</span><a class="back-link" href="#/debate/${escapeHtml(sourceDebate.id)}">Back to this debate</a>` : ""}
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
  const debateHref = `#/debate/${encodeURIComponent(appearance.debate.id)}`;

  return `
    <article class="reference-context-card">
      <div class="card-topline">
        <a class="reference-debate-link" href="${escapeHtml(debateHref)}">${escapeHtml(appearance.debate.label)}</a>
        <span>${escapeHtml(appearance.argument.time)}</span>
      </div>
      <h3>${escapeHtml(appearance.section.title)}</h3>
      <p class="reference-speaker">${escapeHtml(appearance.side.name)} · ${escapeHtml(appearance.side.speaker)} · ${escapeHtml(appearance.argument.role)}</p>
      <blockquote>${escapeHtml(appearance.argument.words)}</blockquote>
      <p>${escapeHtml(appearance.tag.context)}</p>
      <p class="reference-debate-return">
        <a href="${escapeHtml(debateHref)}">Open debate scorecard: ${escapeHtml(appearance.debate.title)}</a>
      </p>
    </article>
  `;
}

function route() {
  const debateMatch = window.location.hash.match(debateRoutePattern);
  const referenceMatch = window.location.hash.match(referenceRoutePattern);

  if (debateMatch) {
    renderDebate(decodeURIComponent(debateMatch[1]));
  } else if (referenceMatch) {
    renderReference(referenceMatch[1], referenceMatch[2], referenceMatch[3] || "");
  } else {
    renderLanding();
  }
}

window.addEventListener("hashchange", route);
route();
