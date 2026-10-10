import { researchEdition as r, researchInsights, insightLink, researchPdfLink, researchSnapshotNote, renderResearchCompanion, escapeResearch as escape } from "./insights.js?v=20261009-three-new-studies";
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
  "editorial-corrections.json": "Recorded direct-review corrections (JSON)",
  "reply-links.json": "All recorded replies and their targets (JSON)",
  "reply-edges.json": "Complete reply-to-target link audit (JSON)",
  "selected-evidence.json": "Selected source excerpts, timestamps and original assessments (JSON)",
  "case-analysis.json": "Case interpretations and remaining questions (JSON)",
  "opponent-appearances.json": "All comparable appearances and outside-pair opponent averages (JSON)",
  "repeated-pairs.json": "Every repeated pair and its scores (JSON)",
  "same-process-repeats.json": "Repeated matchups within one assessment procedure (JSON)"
};
const fileLinks = (files, base) => files.map(file => `<li><a href="${base}${file}" download>${escape(labels[file] || file)}</a></li>`).join("");
export function renderInsightsMethodsContent() {
  return `<section class="insights-intro">
    <p class="eyebrow"><a href="/insights/">Insights</a> / Research evidence</p><h1>Data and methods</h1>
    <p class="large">Follow each finding back to its evidence.</p>
    <p>See which debates each study includes, how its numbers were calculated, and what its results do and do not show. The records are available to download. Tables and summaries remain readable without JavaScript.</p>
    <p class="insights-snapshot">${researchSnapshotNote()}</p>
    <nav class="insights-index" aria-label="Study methods">${researchInsights.map((item,i)=>`<a href="#${item.id}"><span>${i+1}.</span> ${escape(item.title)}</a>`).join("")}</nav>
  </section>
  <section class="methods-shared" aria-labelledby="shared-heading"><h2 id="shared-heading">What the studies share</h2>
    <p>The site selects its debates; it does not sample them at random. Each study includes only the records suitable for its question, as listed below. Religious and skeptical positions are assigned from the claim argued in that debate, not from a speaker’s personal religion. The topic study keeps the same eight groups used in September so the editions can be compared; these are not the site’s current browsing categories.</p>
    <div class="methods-table-wrap"><table><caption>Evidence sets in the October 9 edition</caption><thead><tr><th scope="col">Evidence set</th><th scope="col">Size and use</th></tr></thead><tbody>
      <tr><th scope="row">Public archive</th><td>${r.counts.published} assessments · ${r.counts.public_moves.toLocaleString("en-US")} moves · ${r.counts.unique_video_urls} unique video links</td></tr>
      <tr><th scope="row">Comparable scoring records</th><td>${r.counts.locked} one-on-one debates · ${r.counts.locked*2} sides · ${r.counts.locked_moves.toLocaleString("en-US")} verified move scores</td></tr>
      <tr><th scope="row">Religious-versus-skeptical set</th><td>${r.counts.religious} comparisons · ${r.counts.religious_moves.toLocaleString("en-US")} moves</td></tr>
      <tr><th scope="row">Direct slogan evidence</th><td>187 transcripts reviewed on September 5. No newer transcripts reviewed for slogans.</td></tr>
      <tr><th scope="row">Assessments with unequal scores</th><td>${r.decisive} assessments · ${r.ties} ties excluded</td></tr>
      <tr><th scope="row">People in the research ranking</th><td>${r.ranked} people · ${r.appearances} assessed debate appearances · at least three per person</td></tr>
    </tbody></table></div>
    <p><strong>One video, two assessments:</strong> assessments 13 and 125 use the same video under different formats. Both count in the full archive, but only one enters the comparable one-on-one studies. No video link repeats within those studies. Some speakers appear many times, so the records do not represent entirely separate groups of people.</p>
    <p><strong>How the uncertainty ranges work:</strong> most score comparisons are repeated on 20,000 samples drawn from the saved records, allowing the same record to appear more than once. This is called resampling. The lines on the charts cover the middle 95% of the resulting estimates. They show how much the answer changes with the selected records; they do not include every transcription error, AI judging bias or effect of repeated speakers. The ranking study also uses 3,000 split-half comparisons, explained below. The calculations keep the same starting number for random draws as September (20260904) so they can be reproduced.</p>
  </section>
  <section class="methods-shared"><h2>The three new argument and opponent studies</h2>
    <p>Studies 8 and 9 use deliberately selected source passages to explain differences in reasoning; they do not estimate how often each kind occurs throughout the catalogue. Study 8 also checks every stored response link in the 112 later-process comparable debates. The interpretations are AI-assisted editorial readings of saved caption excerpts, not a new independent judging panel or a fresh full-video review.</p>
    <p>Study 10 compares recorded scores and repeated opponents. Its eight model checks are descriptive associations, not causal effects. It does not use resampling or report confidence intervals, and the spread between those checks is not an uncertainty interval. Its full calculations and evidence are in a <a href="/docs/analysis/argument-structure-studies-2026-10-09/README.md">separate reproducible source package</a>. All three use the same October 9 snapshot without changing any scores.</p>
  </section>
  ${researchInsights.map((item,i)=>`<article class="methods-study" id="${item.id}" aria-labelledby="${item.id}-heading">
    <p class="eyebrow">Study ${i+1} / ${researchInsights.length} · ${escape(item.topic)}</p><h2 id="${item.id}-heading">${escape(item.title)}</h2>
    <h3>What the evidence says</h3><p>${escape(item.explanation)}</p><p>${escape(item.detail)}</p>
    ${renderResearchCompanion(item)}
    <h3>How the result was calculated</h3><p>${escape(item.method)}</p>
    <div class="methods-table-wrap"><table><caption>Key counts and comparisons for study ${i+1}</caption><thead><tr><th scope="col">Measure</th><th scope="col">Research snapshot</th></tr></thead><tbody>${item.rows.map(([label,value])=>`<tr><th scope="row">${escape(label)}</th><td>${escape(value)}</td></tr>`).join("")}</tbody></table></div>
    <h3>Limitations</h3><p class="insight-limitation">${escape(item.limitation)}</p>
    <h3>Supporting files</h3><p>CSV tables open in spreadsheet software. JSON files contain saved records; Python files contain the calculation instructions. These are dated research downloads, not live results.</p>
    <ul class="insight-links">${fileLinks(item.files,item.directory || r.directory)}</ul>
    ${item.historicalFiles ? `<h3>Historical direct-study records</h3><ul class="insight-links">${fileLinks(item.historicalFiles,historical)}</ul>` : ""}
    <h3>Follow the evidence</h3><ul class="insight-links">${item.links.map(link=>`<li><a href="${escape(insightLink(link))}">${escape(link.label)}</a></li>`).join("")}</ul>
    <p><a class="button primary" href="${researchPdfLink(item)}">Read the full paper (PDF)</a> · ${item.pages} pages · ${item.figures} ${item.figures === 1 ? "figure" : "figures"}</p>
    <p><a href="/insights/#${item.id}">Back to this finding and its figure</a> · <a href="#shared-heading">Shared evidence and uncertainty</a></p>
  </article>`).join("")}
  <section class="methods-shared"><h2>Trace and reproduce this edition</h2>
    <p>The calculations use a saved version of the catalogue, identified by <code>${r.sourceCommit}</code>. To reproduce them, use that version or files with matching digital fingerprints. Running the analysis on a newer catalogue would be a different study and would also require reviewing the conclusions. This edition neither reassessed debates nor added new transcript reviews for slogans.</p>
    <ul class="insight-links">${fileLinks(["README.md","source-manifest.json","publication-manifest.json","chart-contracts.json","figure-reading-keys.json","validation.md"],r.directory)}</ul>
    <p>Earlier analyses are preserved under their September dates. The current source package records reviewed exclusions, chart inputs, checks and PDF fingerprints.</p><p><a href="/insights/">Back to Insights</a> · <a href="/backend/">Assessment method and research library</a></p>
  </section>`.replace(/^ +$/gm, "");
}
