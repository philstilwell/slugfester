import { researchEdition, researchInsights, researchPdfLink, researchSnapshotNote, escapeResearch as escape } from "./insights.js?v=20261009-three-new-studies";

export function renderResearchLibrary() {
  const groups = [
    ["Part one", "Theist and non-theist performance", [0, 1, 2]],
    ["Part two", "Roles and the limits of labels", [3, 4]],
    ["Part three", "Comparability and ranking confidence", [5, 6]],
    ["Part four", "Arguments, replies and opponents", [7, 8, 9]]
  ];
  return `<section class="backend-report" aria-labelledby="backend-report-heading">
    <div class="backend-report-panel">
      <header class="backend-report-header"><p class="eyebrow">Research library · ${researchEdition.date}</p>
        <h2 id="backend-report-heading">Corpus-level analysis papers</h2>
        <p>${researchInsights.length} papers with explained findings, readable figures and inspectable evidence. Three new studies examine replies, the steps from a creator to a personal God, and opponent context.</p>
        <p><a class="button primary" href="/insights/">Explore the findings on Insights</a></p>
      </header>
      <div class="backend-objectivity-content backend-report-content">
        <div class="backend-report-copy"><h3>Follow the findings back to the evidence</h3>
          <p>${researchSnapshotNote()}</p>
          <p>The source catalogue contains ${researchEdition.counts.unique_video_urls} unique video links. Assessments 13 and 125 share one video under different formats; only one enters the comparable one-on-one analyses. Earlier scores and biographies were not changed by this research refresh.</p>
          <p><a href="/insights/data-and-methods/">Inspect the classifications, calculations, source fingerprints and limitations.</a></p>
        </div>
        <div class="backend-report-library" aria-label="Corpus-level analysis papers">
          ${groups.map(([label, title, indexes], group) => `<section class="backend-report-group" aria-labelledby="research-group-${group}">
            <div class="backend-report-group-heading"><span>${label}</span><h3 id="research-group-${group}">${title}</h3></div>
            <div class="backend-report-grid">${indexes.map(index => {
              const item = researchInsights[index];
              return `<article class="backend-report-card"><span>Paper ${index + 1} · ${escape(item.topic)}</span>
                <h4>${escape(item.title)}</h4><p>${escape(item.explanation)}</p><p>${escape(item.detail)}</p>
                <dl><div><dt>${escape(item.statisticLabel)}</dt><dd>${escape(item.statistic)}</dd></div><div><dt>Length and figures</dt><dd>${item.pages} pages · ${item.figures} ${item.figures === 1 ? "figure" : "figures"}</dd></div></dl>
                <a class="button primary backend-report-link" href="${researchPdfLink(item)}" type="application/pdf" target="_blank" rel="noopener">Read “${escape(item.title)}”</a>
                <small>${escape(item.limitation)}</small>
              </article>`;
            }).join("")}</div>
          </section>`).join("")}
        </div>
      </div>
    </div>
  </section>`;
}
