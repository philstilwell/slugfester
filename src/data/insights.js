import { researchEdition, researchInsights } from "./research-edition.js?v=20261009-corpus308-charts-reference";
export { researchEdition, researchInsights };
export const researchSnapshot = researchEdition.date;
export const escapeResearch = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const escape = escapeResearch;
export function insightLink(link) {
  return link.href || (link.id ? `/debate/${link.id}/` : `/search/?q=${encodeURIComponent(link.search)}`);
}
export function researchPdfLink(item) {
  return `/output/pdf/${item.pdf}.pdf?v=${item.version}`;
}
export function renderResearchCompanion(item) {
  const source = item.companion;
  if (!source) return "";
  return `<aside class="insight-companion" aria-label="Related reading from Charts">
    <p class="insight-companion-label">${escape(source.label)}</p>
    <p class="insight-companion-title"><strong><a href="${escape(source.href)}" type="application/pdf">${escape(source.title)}</a></strong></p>
    ${source.paragraphs.map(text => `<p>${escape(text)}</p>`).join("")}
    <p class="insight-companion-scope">${escape(source.scope)}</p>
  </aside>`;
}
export function researchSnapshotNote() {
  const r = researchEdition;
  return `<strong>Research snapshot: ${r.date} · ${r.counts.published} assessments.</strong> This edition adds ${r.newAssessments} assessments and recalculates the score studies. The direct slogan evidence remains the September 5 review of 187 transcripts; no newer transcripts were coded for that study. This curated sample is not representative of all public debate, and performance scores do not establish worldview truth.`;
}
export function renderInsightsContent() {
  return `<section class="insights-intro">
    <p class="eyebrow">Research made readable</p>
    <h1>Insights from the debates</h1>
    <p class="large">A larger archive changes the numbers—and sharpens the questions.</p>
    <p>Seven rewritten research papers explain where score differences arise, what labels leave out, and how much confidence to place in rankings. Read the findings here, inspect the evidence, or download the complete papers.</p>
    <p class="insights-snapshot">${researchSnapshotNote()}</p>
    <p><strong>What changed:</strong> the average position gap is smaller, the weighted same-speaker CON association is now clearer, and the ranked research field has grown to ${researchEdition.ranked} people. Earlier scores were not changed by this research refresh.</p>
    <nav class="insights-index" aria-label="Research questions">${researchInsights.map((item, i) => `<a href="#${item.id}"><span>${i + 1}.</span> ${escape(item.title)}</a>`).join("")}</nav>
  </section>
  <div class="insights-stories">${researchInsights.map((item, i) => `<article class="insight-story" id="${item.id}" aria-labelledby="${item.id}-heading">
    <div class="insight-copy">
      <p class="eyebrow">${i + 1} / 7 · ${escape(item.topic)}</p>
      <h2 id="${item.id}-heading">${escape(item.title)}</h2>
      <p class="insight-finding">${escape(item.finding)}</p>
      <p class="insight-stat"><strong>${escape(item.statistic)}</strong><span>${escape(item.statisticLabel)}</span></p>
      <p>${escape(item.explanation)}</p><p>${escape(item.detail)}</p>${renderResearchCompanion(item)}
      <p class="insight-limitation"><strong>What this cannot establish.</strong> ${escape(item.limitation)}</p>
      <a class="button primary" href="${researchPdfLink(item)}" type="application/pdf" target="_blank" rel="noopener" aria-label="Read the full paper: ${escape(item.title)} (PDF, new tab)">Read the full paper</a>
      <p>${item.pages} pages · ${item.figures} figures · October 2026 edition</p>
      <ul class="insight-links">${item.links.map((link) => `<li><a href="${escape(insightLink(link))}">${escape(link.label)}</a></li>`).join("")}</ul>
    </div>
    <figure class="insight-figure">
      <h3>${escape(item.figureTitle)}</h3><p>${escape(item.figureScope)}</p>
      <a href="/assets/insights/${item.figure}.png?v=${item.version}" target="_blank" rel="noopener" aria-label="Enlarge figure: ${escape(item.figureTitle)} (new tab)"><img src="/assets/insights/${item.figure}.png?v=${item.version}" alt="${escape(item.alt)}" width="${item.width}" height="${item.height}" loading="lazy" decoding="async"></a>
      <figcaption><p><strong>Reading the figure.</strong> ${escape(item.reading)}</p><a href="/insights/data-and-methods/#${item.id}">Explore this study’s data and methods</a></figcaption>
    </figure>
  </article>`).join("")}</div>`;
}
