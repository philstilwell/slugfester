// Shared by the interactive route and its complete, readable static page.
const escape = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const mean = (values) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const count = (values) => new Set(values).size;
const fmt = (value) => value === null ? "—" : Number(value.toFixed(1)).toLocaleString("en-US");
const positions = ["Supporting", "Challenging"];
const shortDimensions = ["Coherence", "Evidence", "Response", "Relevance", "Precision", "Calibration"];
export function chartSnapshotName(snapshot) {
  return `${snapshot.date}${snapshot.revision > 1 ? `-r${snapshot.revision}` : ""}`;
}
export function chartThreshold(value) {
  const threshold = Number(value);
  return Number.isInteger(threshold) && threshold >= 50 && threshold <= 100 && threshold % 5 === 0 ? threshold : 70;
}
export function chartQuantile(values, probability) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), index = (sorted.length - 1) * probability;
  return sorted[Math.floor(index)] + (sorted[Math.ceil(index)] - sorted[Math.floor(index)]) * (index % 1);
}
export function chartState(search = "", snapshot) {
  const params = new URLSearchParams(search);
  return {
    scope: snapshot.scopes.some(([id]) => id === params.get("scope")) ? params.get("scope") : "god",
    family: snapshot.families.some(({ id }) => id === params.get("family")) ? params.get("family") : "all",
    page: Math.max(1, Number.parseInt(params.get("page"), 10) || 1),
    threshold: chartThreshold(params.get("threshold"))
  };
}
export function chartUrl(state, changes = {}, anchor = "") {
  const next = { ...state, ...changes }, params = new URLSearchParams();
  for (const key of ["scope", "family", "page"]) if (next[key] && !(key === "page" && next[key] === 1)) params.set(key, next[key]);
  if (chartThreshold(next.threshold) !== 70) params.set("threshold", chartThreshold(next.threshold));
  return `/charts/?${params}${anchor ? `#${anchor}` : ""}`;
}
function debateMeans(moves, accessor) {
  const groups = new Map();
  for (const m of moves) { if (!groups.has(m.d)) groups.set(m.d, []); groups.get(m.d).push(accessor(m)); }
  return [...groups.values()].map(mean);
}
export function analyzeCharts(snapshot, state) {
  const threshold = chartThreshold(state.threshold);
  const cohort = snapshot.debates.map((d, i) => ({ ...d, index: i })).filter((d) => (state.scope === "all" || d.scope === state.scope));
  const ids = new Set(cohort.map((d) => d.index));
  const moves = snapshot.moves.filter((m) => ids.has(m.d) && (state.family === "all" || m.f.includes(state.family)));
  const families = snapshot.families.filter((f) => state.family === "all" || f.id === state.family).map((f) => {
    const rows = moves.filter((m) => m.f.includes(f.id));
    return { ...f, debates: count(rows.map((m) => m.d)), sides: positions.map((_, p) => {
      const side = rows.filter((m) => m.p === p), values = debateMeans(side, (m) => m.v);
      const roles = ["constructive", "reply"].map((kind) => { const selected = side.filter((m) => m.k === kind); return { score: mean(debateMeans(selected, (m) => m.v)), moves: selected.length, debates: count(selected.map((m) => m.d)) }; });
      return { moves: side.length, debates: values.length, speakers: count(side.map((m) => m.speaker)), prevalence: cohort.length ? values.length / cohort.length * 100 : null, median: chartQuantile(values, .5), q1: chartQuantile(values, .25), q3: chartQuantile(values, .75), roles,
        dimensions: snapshot.dimensions.map((_, i) => ({ rate: mean(debateMeans(side, (m) => m.x[i] < threshold ? 100 : 0)), flagged: side.filter((m) => m.x[i] < threshold).length })) };
    }) };
  }).sort((a, b) => Number(a.id === "general") - Number(b.id === "general") || b.debates - a.debates || a.label.localeCompare(b.label));
  return { cohort, moves, families, represented: count(moves.map((m) => m.d)), speakers: count(moves.map((m) => m.speaker)) };
}
const small = (n) => n > 0 && n < 5 ? '<span class="chart-small-sample">Small sample</span>' : "";
const panel = (id, number, title, description, content, note) => `<section class="chart-panel" id="${id}" aria-labelledby="${id}-title"><header><span class="chart-index">${number}</span><div><h2 id="${id}-title">${title}</h2><p>${description}</p></div></header>${content}<p class="chart-footnote">${note}</p></section>`;
const axis = (label) => `<div class="chart-axis" aria-hidden="true"><span>${label}</span><div><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div></div>`;
function bar(value, p, label) {
  return value === null ? '<span class="chart-missing">No observations</span>' : `<div class="chart-bar-track" aria-hidden="true"><span class="chart-bar chart-position-${p}" style="width:${value}%"></span></div><span class="chart-value">${label}</span>`;
}
function familyLink(f, state) { return state.interactive === false ? escape(f.label) : `<a href="${escape(chartUrl(state, { family: f.id, page: 1 }, "chart-evidence"))}">${escape(f.label)}</a>`; }
function frequency(analysis, state) {
  return axis("Share of selected debates (%)") + `<div class="chart-family-list">${analysis.families.map((f) => `<div class="chart-family-row"><h3>${familyLink(f, state)}</h3>${f.sides.map((s, p) => `<div class="chart-series"><span class="chart-series-name chart-text-${p}">${positions[p]}</span>${bar(s.prevalence, p, `${fmt(s.prevalence)}%`)}<small>${s.debates} of ${analysis.cohort.length} debates</small></div>`).join("")}</div>`).join("")}</div>`;
}
function distributions(analysis, state) {
  return axis("Assessment score / 100") + `<div class="chart-family-list">${analysis.families.map((f) => `<div class="chart-family-row"><h3>${familyLink(f, state)}</h3>${f.sides.map((s, p) => `<div class="chart-distribution"><span class="chart-series-name chart-text-${p}">${positions[p]}</span>${s.median === null ? '<span class="chart-missing">No observations</span>' : `<svg viewBox="0 0 100 10" preserveAspectRatio="none" role="img" aria-label="${positions[p]}: median ${fmt(s.median)}, middle half ${fmt(s.q1)} to ${fmt(s.q3)} out of 100"><line x1="0" x2="100" y1="5" y2="5" class="chart-guide"/><rect x="${s.q1}" y="2" width="${Math.max(.15, s.q3 - s.q1)}" height="6" class="chart-range chart-position-${p}"/><line x1="${s.median}" x2="${s.median}" y1="0" y2="10" class="chart-median"/></svg><strong>${fmt(s.median)}</strong>`}<small>Middle half ${fmt(s.q1)}–${fmt(s.q3)} · ${s.debates} debates · ${s.speakers} speakers ${small(s.debates)}</small></div>`).join("")}</div>`).join("")}</div>`;
}
function roles(analysis, state) {
  return `<div class="chart-role-head" aria-hidden="true"><span>Argument family / position</span><span>Making a case</span><span>Answering objections</span></div>${analysis.families.map((f) => `<div class="chart-role-family"><h3>${familyLink(f, state)}</h3>${f.sides.map((s, p) => `<div class="chart-role-row"><span class="chart-series-name chart-text-${p}">${positions[p]}</span>${s.roles.map((r, i) => `<div class="chart-role-cell" role="group" aria-label="${positions[p]}: ${i ? "Answering objections" : "Making a case"}"><span class="chart-mobile-label">${i ? "Answering objections" : "Making a case"}</span>${bar(r.score, p, r.score === null ? "" : `${fmt(r.score)}/100`)}<small>${r.debates} debates · ${r.moves} moves ${small(r.debates)}</small></div>`).join("")}</div>`).join("")}</div>`).join("")}`;
}
function thresholdControl(state) {
  if (state.interactive === false) return "";
  return `<div class="chart-threshold-control"><div class="chart-threshold-heading"><label for="chart-threshold">Score threshold</label><output id="chart-threshold-value" for="chart-threshold">${state.threshold}</output></div><input id="chart-threshold" type="range" min="50" max="100" step="5" value="${state.threshold}" aria-describedby="chart-threshold-help"><div class="chart-threshold-ticks" aria-hidden="true">${Array.from({ length: 11 }, (_, i) => `<span>${50 + i * 5}</span>`).join("")}</div><p id="chart-threshold-help">Count scores strictly below this value. Default: 70.</p></div>`;
}
export function bindChartThreshold(snapshot, root) {
  const slider = root.querySelector("#chart-threshold");
  if (!slider) return;
  slider.addEventListener("input", () => {
    const state = chartState(window.location.search, snapshot);
    state.threshold = chartThreshold(slider.value);
    const results = root.querySelector("#chart-dimension-results");
    const scrollLeft = results.querySelector(".chart-table-scroll")?.scrollLeft || 0;
    results.innerHTML = dimensionGrid(analyzeCharts(snapshot, state), snapshot, state);
    results.querySelector(".chart-table-scroll").scrollLeft = scrollLeft;
    root.querySelector("#chart-threshold-value").value = state.threshold;
    root.querySelectorAll("[data-chart-threshold]").forEach((label) => { label.textContent = state.threshold; });
    root.querySelector('#chart-filters input[name="threshold"]').value = state.threshold;
    window.history.replaceState({}, "", chartUrl(state) + window.location.hash);
    // Keep the chosen threshold when following a family or evidence-page link.
    root.querySelectorAll('a[href^="/charts/?"]').forEach((link) => {
      const url = new URL(link.getAttribute("href"), window.location.href);
      if (state.threshold === 70) url.searchParams.delete("threshold");
      else url.searchParams.set("threshold", state.threshold);
      link.setAttribute("href", `${url.pathname}${url.search}${url.hash}`);
    });
  });
}
function dimensionGrid(analysis, snapshot, state) {
  return `<div class="chart-table-scroll" role="region" aria-label="Reasoning dimensions; scroll horizontally on small screens" tabindex="0"><table class="chart-heatmap"><caption>Average share of assessed moves with a dimension score below ${chartThreshold(state.threshold)}, giving each debate equal weight</caption><thead><tr><th scope="col">Family / position</th>${snapshot.dimensions.map(([_, label], i) => `<th scope="col"><abbr title="${escape(label)}">${shortDimensions[i]}</abbr></th>`).join("")}</tr></thead><tbody>${analysis.families.map((f) => f.sides.map((s, p) => `<tr><th scope="row">${familyLink(f, state)}<span class="chart-text-${p}">${positions[p]} · ${s.debates} debates ${small(s.debates)}</span></th>${s.dimensions.map((d, i) => `<td style="--heat:${d.rate === null ? 0 : d.rate / 100}" aria-label="${escape(f.label)}, ${positions[p]}, ${escape(snapshot.dimensions[i][1])}: ${d.rate === null ? "no observations" : `${fmt(d.rate)} percent; ${d.flagged} of ${s.moves} moves below ${chartThreshold(state.threshold)} before debate balancing`}">${d.rate === null ? "—" : `${fmt(d.rate)}%`}</td>`).join("")}</tr>`).join("")).join("")}</tbody></table></div><div class="chart-heat-key"><span>Lighter: fewer below ${chartThreshold(state.threshold)}</span><i aria-hidden="true"></i><span>Darker: more below ${chartThreshold(state.threshold)}</span></div>`;
}
function evidence(analysis, snapshot, state) {
  const pages = Math.max(1, Math.ceil(analysis.moves.length / 20)), page = Math.min(state.page, pages);
  const start = (page - 1) * 20, selected = analysis.moves.slice(start, start + 20);
  return `<section class="chart-evidence" id="chart-evidence" aria-labelledby="chart-evidence-title"><header><p class="eyebrow">Follow the evidence</p><h2 id="chart-evidence-title">The arguments behind the charts</h2><p>${analysis.moves.length.toLocaleString("en-US")} unique assessed moves in this selection. Select an argument family above to narrow the list. Entries follow debate order.</p></header><div class="chart-evidence-list">${selected.map((m) => { const d = snapshot.debates[m.d]; return `<article><div class="chart-evidence-meta"><span class="chart-text-${m.p}">${positions[m.p]}</span><span>${m.k === "constructive" ? "Making a case" : m.k === "reply" ? "Answering an objection" : "Concession"}</span><strong>${m.v}/100</strong></div><h3><a href="/debate/${escape(d.id)}/#assessed-section-${m.s + 1}">Debate ${escape(d.number)} · ${escape(m.speaker)}</a></h3><p>${escape(m.q)}</p><small>${escape(d.sections[m.s])} · ${escape(m.t)} · ${m.f.map((id) => escape(snapshot.families.find((f) => f.id === id).label)).join(" / ")}</small></article>`; }).join("") || '<p>No assessed arguments match these filters. Choose a different scope or argument family.</p>'}</div><nav class="chart-pagination" aria-label="Argument evidence pages">${state.interactive !== false && page > 1 ? `<a class="button secondary" href="${escape(chartUrl(state, { page: page - 1 }, "chart-evidence"))}">Previous</a>` : ""}<span>${selected.length ? `${start + 1}–${start + selected.length} of ${analysis.moves.length}` : "0 results"} · Page ${page} of ${pages}</span>${state.interactive !== false && page < pages ? `<a class="button secondary" href="${escape(chartUrl(state, { page: page + 1 }, "chart-evidence"))}">Next</a>` : ""}</nav></section>`;
}
function methods(snapshot) {
  const pending = snapshot.exclusions.filter((item) => item.status === "pending-review" || (!item.status && /awaits review/i.test(item.reason))).length;
  const reviewSummary = pending ? `${pending} ${pending === 1 ? "case awaits" : "cases await"} classification review and ${snapshot.exclusions.length - pending} exclusions have recorded decisions.` : `No cases awaiting review. All ${snapshot.exclusions.length} exclusions have recorded decisions.`;
  return `<section class="chart-methods" id="chart-methods"><p class="eyebrow">Read the chart correctly</p><h2>What this snapshot measures</h2><div class="chart-method-grid"><div><h3>Positions, not personal identities</h3><p>Supporting and challenging refer to the religious claim at issue in each debate. They are assigned from the published positions, not from the stored PRO/CON columns or a speaker’s personal beliefs. Challenging a claim need not assert that no God exists. A creator-only argument does not establish a personal, intervening God.</p></div><div><h3>Descriptive argument families</h3><p>Families use explicit word and phrase rules applied to the assessed move and its identifier, with the section title as a fallback. A move can appear in several families; percentages therefore need not add to 100. These are browsing labels, not a fresh philosophical assessment. “Other / general” retains unmatched material.</p></div><div><h3>Each debate gets equal weight</h3><p>Score charts first average the unique assessed moves within each debate, position, family, and selected role. The score-range chart shows the median and middle half of those debate averages, not confidence intervals. The dimension grid averages each debate’s share below the selected score threshold (70 by default). Repeated speakers can still influence the sample; these figures do not establish statistical significance.</p></div><div><h3>Saved assessments, limited sample</h3><p>The snapshot includes ${snapshot.debates.length} of ${snapshot.catalogueCount} published debates available when it was built. It describes selected assessed moves, not every utterance or all public debates. Unclear position pairs, team approximations, and legacy panels without compatible argument-level records are excluded. Small samples are marked below five debates. Scores assess the reasoning presented, not whether God exists.</p></div></div><details><summary>Classifications and exclusions</summary><p class="chart-review-status">${reviewSummary}</p><p>Constructive and reply groups can contain different debates. Their comparison does not measure an argument’s change after rebuttal. Concessions remain in the other charts but are omitted from the case/reply comparison.</p><p>Position assignments use the corrected September 1 research taxonomy where available, plus explicit reviews of previously omitted panels and later debates. Legacy grouped scores without compatible argument-level records remain excluded. Scope follows the main debate topic, with explicit editorial corrections. Individual arguments can address related questions within that debate.</p><p>Calibration concerns whether the strength of a claim matches its support; charity concerns fair representation of an opponent. Relevance and burden concerns contact with the question a side needs to establish.</p><ul>${snapshot.exclusions.map((d) => `<li><a href="/debate/${escape(d.id)}/">Debate ${escape(d.number)}</a>: ${escape(d.reason)}</li>`).join("")}</ul><p><a href="/docs/charts/snapshots/${chartSnapshotName(snapshot)}.json" download>Download the complete dated snapshot (JSON)</a> · <a href="/insights/data-and-methods/">Research methods</a> · <a href="/corrections/">Report a classification issue</a></p></details><p class="chart-footnote">This page changes only when a new snapshot is deliberately published. Adding or reassessing a debate does not refresh these charts. Source excerpts and scores here remain frozen; linked debate pages may receive later corrections.</p></section>`;
}
export function renderChartsContent(snapshot, search = "", interactive = true) {
  const state = chartState(search, snapshot), analysis = analyzeCharts(snapshot, state);
  state.interactive = interactive;
  const options = (items, selected) => items.map(([id, label]) => `<option value="${escape(id)}"${id === selected ? " selected" : ""}>${escape(label)}</option>`).join("");
  const dateLabel = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "America/New_York" }).format(new Date(`${snapshot.date}T12:00:00Z`));
  return `<header class="charts-hero"><p class="eyebrow">Patterns across the debates</p><h1>Charts</h1><p class="charts-intro">What gets argued. How it scores.<br>Where the reasoning is tested.</p><p>Explore arguments supporting and challenging theism and religious claims, using the saved SLUGFESTER assessments.</p><div class="charts-snapshot-line"><span class="charts-date">Snapshot · ${dateLabel}${snapshot.revision > 1 ? ` · revision ${snapshot.revision}` : ""}</span><span>${snapshot.debates.length} included / ${snapshot.catalogueCount} published debates at capture</span><a href="#chart-methods">How to read these charts</a></div></header>
    ${interactive ? `<form class="chart-filters" id="chart-filters" action="/charts/" method="get" aria-label="Chart filters"><label>Question in the debate<select name="scope">${options(snapshot.scopes, state.scope)}</select></label><input type="hidden" name="threshold" value="${state.threshold}"><label>Argument family<select name="family">${options([["all", "All families"], ...snapshot.families.map((f) => [f.id, f.label])], state.family)}</select></label><button class="button primary" type="submit">Apply filters</button><a class="chart-reset" href="/charts/">Reset</a></form>` : `<p class="chart-position-note">Showing the saved God &amp; theism view at threshold 70. Filters, the threshold slider, and further evidence pages require JavaScript. <a href="/docs/charts/snapshots/${chartSnapshotName(snapshot)}.json" download>Download all snapshot data</a>.</p>`}
    <div class="chart-selection-summary" aria-live="polite"><strong>${analysis.cohort.length} debates in scope</strong><span>${analysis.moves.length.toLocaleString("en-US")} assessed moves shown</span><span>${analysis.speakers} speakers represented</span><a href="#chart-evidence">Inspect the arguments ↓</a></div>
    <p class="chart-position-note"><span class="chart-text-0">Supporting</span> and <span class="chart-text-1">Challenging</span> describe the positions argued on the selected religious question. They do not mean that every supporting move proves God, or that every challenge denies God.</p>
    <div class="charts-overview">${panel("chart-frequency", "01", "Which arguments recur?", "Share of debates containing at least one assessed move in each family, by position.", frequency(analysis, state), "Each debate counts once per family and position. Families overlap. Counts cover assessed material, not every spoken argument.")}
    ${panel("chart-scores", "02", "How do argument families score?", "Median score and middle half of debate averages, on a 0–100 scale.", distributions(analysis, state), "The vertical mark is the median; the shaded span contains the middle 50% of debate averages. This is observed spread, not a confidence interval.")}</div>
    ${panel("chart-roles", "03", "Making a case. Answering objections.", "Average scores for constructive arguments and replies, with equal weight for each represented debate.", roles(analysis, state), "Both bars use a 0–100 scale. The two roles can include different debates and arguments. A score difference is not evidence that a rebuttal caused a change.")}
    ${panel("chart-dimensions", "04", "Where does reasoning need more support?", `Share of moves scoring below <span data-chart-threshold>${state.threshold}</span> on each recorded dimension, averaged equally across debates.`, `${thresholdControl(state)}<div id="chart-dimension-results">${dimensionGrid(analysis, snapshot, state)}</div>`, `All cells use a 0–100% scale. Zero means no recorded scores below <span data-chart-threshold>${state.threshold}</span>; a dash means no observations. Higher percentages identify more below-threshold scores, not a cause of those scores.`)}
    ${evidence(analysis, snapshot, state)}${methods(snapshot)}`;
}
