import { researchEdition as r, researchInsights, insightLink, researchPdfLink, researchSnapshotNote, escapeResearch as escape } from "./insights.js?v=20261009-corpus308";
const historical = "/docs/analysis/direct-slogan-study-2026-09-04/";
const labels = {
  "classification.csv": "Inclusion decisions and research topics (CSV)",
  "debates.json": "Saved debate-level records (JSON)",
  "moves.json": "Scored moves and dimension records (JSON)",
  "results.json": "Calculated results and historical-study checks (JSON)",
  "analyze.py": "Reproducible calculation instructions (Python)",
  "ranking.csv": "Complete fixed ranking field and uncertainty ranges (CSV)",
  "losses.json": "Lower-scoring sides and accepted annotations (JSON)",
  "casebook.json": "Source-linked move descriptions and critiques (JSON)",
  "revision-checks.json": "Exact score-frequency checks (JSON)",
  "source-manifest.json": "Source files and fingerprints (JSON)",
  "light-debates.csv": "Historical direct counts and speech denominators (CSV)",
  "light-results.json": "Historical direct-review results (JSON)",
  "light-incidents.json": "Source-linked direct-review incidents (JSON)",
  "supplementary-results.json": "Historical alternative-selection checks (JSON)",
  "protocol-light.md": "Direct-review definitions and counting rules (text)",
  "editorial-corrections.json": "Recorded direct-review corrections (JSON)"
};
const fileLinks = (files, base) => files.map(file => `<li><a href="${base}${file}" download>${escape(labels[file] || file)}</a></li>`).join("");
export function renderInsightsMethodsContent() {
  return `<section class="insights-intro">
    <p class="eyebrow"><a href="/insights/">Insights</a> / Research evidence</p><h1>Data and methods</h1>
    <p class="large">Follow each finding back to its evidence.</p>
    <p>Inspect the population, calculations, limitations and downloadable records behind the October research edition. Tables and summaries remain available without JavaScript.</p>
    <p class="insights-snapshot">${researchSnapshotNote()}</p>
    <nav class="insights-index" aria-label="Study methods">${researchInsights.map((item,i)=>`<a href="#${item.id}"><span>${i+1}.</span> ${escape(item.title)}</a>`).join("")}</nav>
  </section>
  <section class="methods-shared" aria-labelledby="shared-heading"><h2 id="shared-heading">What the studies share</h2>
    <p>This is a curated archive, not a random sample. Different questions require different subsets. Positions follow the claim argued, not a speaker’s religious identity. The eight research topic groups remain stable for comparison with September; they differ from the site’s current browsing categories.</p>
    <div class="methods-table-wrap"><table><caption>Evidence sets in the October 9 edition</caption><thead><tr><th scope="col">Evidence set</th><th scope="col">Size and use</th></tr></thead><tbody>
      <tr><th scope="row">Public archive</th><td>${r.counts.published} assessments · ${r.counts.public_moves.toLocaleString("en-US")} moves · ${r.counts.unique_video_urls} unique video links</td></tr>
      <tr><th scope="row">Comparable scoring records</th><td>${r.counts.locked} one-on-one debates · ${r.counts.locked*2} sides · ${r.counts.locked_moves.toLocaleString("en-US")} verified move scores</td></tr>
      <tr><th scope="row">Religious-versus-skeptical set</th><td>${r.counts.religious} comparisons · ${r.counts.religious_moves.toLocaleString("en-US")} moves</td></tr>
      <tr><th scope="row">Direct slogan evidence</th><td>187 historically reviewed transcripts; September 5 review. No new direct coding.</td></tr>
      <tr><th scope="row">Decisive public results</th><td>${r.decisive} assessments · ${r.ties} ties excluded</td></tr>
      <tr><th scope="row">Fixed ranked field</th><td>${r.ranked} people · ${r.appearances} appearances · minimum three per person</td></tr>
    </tbody></table></div>
    <p><strong>Shared source:</strong> assessments 13 and 125 use the same video under different formats. Both count in the full assessment-level inventory, but only one enters the comparable one-on-one set. No video link repeats within that comparable set. Recurring speakers remain a separate dependence issue.</p>
    <p><strong>Reading uncertainty:</strong> resampling draws existing observations again, allowing repeats. The score studies use 20,000 draws with baseline seed 20260904 for edition comparability. Ranges show sensitivity to recorded observations—not every caption error, judging bias, repeated-speaker effect or selection decision. The earlier debate scores are unchanged.</p>
  </section>
  ${researchInsights.map((item,i)=>`<article class="methods-study" id="${item.id}" aria-labelledby="${item.id}-heading">
    <p class="eyebrow">Study ${i+1} / 7 · ${escape(item.topic)}</p><h2 id="${item.id}-heading">${escape(item.title)}</h2>
    <h3>What the evidence says</h3><p>${escape(item.explanation)}</p><p>${escape(item.detail)}</p>
    <h3>How the result was calculated</h3><p>${escape(item.method)}</p>
    <div class="methods-table-wrap"><table><caption>Key counts and comparisons for study ${i+1}</caption><thead><tr><th scope="col">Measure</th><th scope="col">Research snapshot</th></tr></thead><tbody>${item.rows.map(([label,value])=>`<tr><th scope="row">${escape(label)}</th><td>${escape(value)}</td></tr>`).join("")}</tbody></table></div>
    <h3>Limitations</h3><p class="insight-limitation">${escape(item.limitation)}</p>
    <h3>Supporting files</h3><p>CSV tables open in spreadsheet software. JSON files contain saved records; Python files contain the calculation instructions. These are dated research downloads, not live results.</p>
    <ul class="insight-links">${fileLinks(item.files,r.directory)}</ul>
    ${item.historicalFiles ? `<h3>Historical direct-study records</h3><ul class="insight-links">${fileLinks(item.historicalFiles,historical)}</ul>` : ""}
    <h3>Follow the evidence</h3><ul class="insight-links">${item.links.map(link=>`<li><a href="${escape(insightLink(link))}">${escape(link.label)}</a></li>`).join("")}</ul>
    <p><a class="button primary" href="${researchPdfLink(item)}">Read the full paper (PDF)</a> · ${item.pages} pages · ${item.figures} figures</p>
    <p><a href="/insights/#${item.id}">Back to this finding and its figure</a> · <a href="#shared-heading">Shared evidence and uncertainty</a></p>
  </article>`).join("")}
  <section class="methods-shared"><h2>Trace and reproduce this edition</h2>
    <p>The frozen input revision is <code>${r.sourceCommit}</code>. Reproduction requires that revision or matching source-file fingerprints; running the analysis against a changed catalogue is not an update to this edition. No new debate scores or direct slogan annotations were commissioned.</p>
    <ul class="insight-links">${fileLinks(["README.md","source-manifest.json","publication-manifest.json","chart-contracts.json","figure-reading-keys.json","validation.md"],r.directory)}</ul>
    <p>Earlier analyses are preserved under their September dates. The current source package records reviewed exclusions, chart inputs, checks and PDF fingerprints.</p><p><a href="/insights/">Back to Insights</a> · <a href="/backend/">Assessment method and research library</a></p>
  </section>`.replace(/^ +$/gm, "");
}
