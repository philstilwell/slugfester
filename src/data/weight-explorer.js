import { weightExplorerSnapshot as snapshot } from "./weight-explorer-snapshot.js?v=c742718d4ab2ae9f";
import { weightDimensions, defaultWeights, weightPresets, findWeightPreset, redistributeWeights, evaluateWeights } from "./weight-explorer-model.js?v=c742718d4ab2ae9f";

const escape = (text = "") => String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const number = n => n.toFixed(2);
const signed = n => `${n > 0 ? "+" : n < 0 ? "−" : ""}${number(Math.abs(n))}`;
const lead = gap => gap === 0 ? "Tied" : gap > 0 ? "Con-God ahead" : "Pro-God ahead";
const cohortLabels = { all: "Both assessment procedures", earlier: "Earlier procedure", later: "Later procedure" };

function renderResults(result, isDefault) {
  const gapChange = result.gap - result.baselineGap;
  return `<p class="weight-result-state">${isDefault ? "Current site weights" : "Your hypothetical weights"} · ${result.count} debates · equal weight per debate</p>
    <div class="weight-score-cards">
      <div class="weight-score-card pro-god"><h3>Pro-God side</h3><strong data-weight-score="pro">${number(result.proGod)}</strong><span>Average score / 100</span><small>Current weights: ${number(result.baselineProGod)} · change ${signed(result.proGod - result.baselineProGod)}</small></div>
      <div class="weight-score-card con-god"><h3>Con-God side</h3><strong data-weight-score="con">${number(result.conGod)}</strong><span>Average score / 100</span><small>Current weights: ${number(result.baselineConGod)} · change ${signed(result.conGod - result.baselineConGod)}</small></div>
    </div>
    <div class="weight-comparison" role="group" aria-label="Average scores on a zero to one hundred scale">
      ${[["Pro-God", "pro-god", result.proGod, result.baselineProGod], ["Con-God", "con-god", result.conGod, result.baselineConGod]].map(([label, cls, value, baseline]) => `<div class="weight-bar-row"><span>${label}</span><div class="weight-bar-track ${cls}" aria-hidden="true"><span class="weight-bar-fill" style="width:${value}%"></span><span class="weight-baseline-mark" style="left:${baseline}%"></span></div><strong>${number(value)}</strong></div>`).join("")}
      <div class="weight-axis" aria-hidden="true"><span>0</span><span>50</span><span>100</span></div><p class="weight-chart-key">Black marks show the averages with the current site weights.</p>
    </div>
    <div class="weight-gap"><p>${result.gap === 0 ? "The two sides have the same average." : `${lead(result.gap)} by <strong data-weight-gap>${number(Math.abs(result.gap))} points</strong> on average.`}</p><span>${Math.abs(gapChange) < 1e-10 ? "The gap is unchanged." : `${number(Math.abs(gapChange))} points ${gapChange > 0 ? "toward the con-God side" : "toward the pro-God side"} compared with the current weights.`}</span></div>
    <ul class="weight-outcomes" aria-label="Individual debate results"><li><strong>${result.proGodAhead}</strong> Pro-God ahead</li><li><strong>${result.conGodAhead}</strong> Con-God ahead</li><li><strong>${result.ties}</strong> Tied</li></ul>
    <p class="weight-changes"><strong>${result.changed} of ${result.count}</strong> debates change which side leads or whether the scores are tied.</p>`;
}

function renderDebates(result) {
  const rows = [...result.rows].sort((a, b) => Number(b.changed) - Number(a.changed) || a.number - b.number);
  return `<p>Changed results appear first. Each score cell shows <strong>current weights → your weights</strong>. These are score comparisons, not judgments about whether God exists.</p>
    <div class="weight-table-scroll" tabindex="0" role="region" aria-label="Individual debate score comparisons"><table><caption>${result.count} debates in the selected assessment group</caption><thead><tr><th scope="col">Debate</th><th scope="col">Pro-God score</th><th scope="col">Con-God score</th><th scope="col">Lead / tie status</th></tr></thead><tbody>${rows.map(r => `<tr${r.changed ? ' class="weight-row-changed"' : ""}><th scope="row"><a href="/debate/${escape(r.id)}/">${r.number}. ${escape(r.title)}</a><span>${escape(r.speakers[0])} (pro-God) · ${escape(r.speakers[1])} (con-God)</span></th><td>${r.published[0]} → <strong>${r.proGod}</strong></td><td>${r.published[1]} → <strong>${r.conGod}</strong></td><td>${r.changed ? `${lead(r.baselineGap)} → <strong>${lead(r.gap)}</strong>` : `${lead(r.gap)}<span>Unchanged</span>`}</td></tr>`).join("")}</tbody></table></div>`;
}

export function renderWeightExplorer() {
  const baseline = evaluateWeights(snapshot.debates);
  return `<section id="scoring-weights" class="weight-explorer" aria-labelledby="weight-explorer-heading">
    <header><p class="eyebrow">Try the scoring weights</p><h2 id="weight-explorer-heading">Would different weights change the score gap?</h2><p>Decide how much each scoring area should count, then see what happens to the pro-God and con-God sides. The sliders start at Slugfester’s current weights. This experiment changes the calculation—not the underlying assessments or published scorecards.</p></header>
    <p class="weight-scope"><strong>${snapshot.counts.debates} reviewed debates · ${snapshot.date} research snapshot.</strong> “Pro-God” means the side defending God, a creator or a religious claim; “con-God” means the side challenging it. This includes debates about religion, not only God’s existence. The labels follow the position argued, not the speaker’s personal beliefs or the scorecard’s PRO/CON order.</p>
    <div class="weight-explorer-layout">
      <div class="weight-controls">
        <fieldset disabled data-weight-controls><legend>Choose what counts</legend>
          <div class="weight-presets"><p id="weight-preset-label">Start with a preset</p><div class="weight-preset-buttons" role="group" aria-labelledby="weight-preset-label" aria-describedby="weight-preset-help">${weightPresets.map(preset => `<button type="button" data-weight-preset="${preset.id}" aria-pressed="${preset.id === "current"}">${preset.label}</button>`).join("")}</div><p id="weight-preset-help">The focused presets are examples, not recommended rubrics. You can adjust any slider afterward.</p><p class="weight-preset-state" data-weight-preset-state>${weightPresets[0].description}</p></div>
          <p id="weight-slider-help">Changing one slider redistributes the remaining weight across the others. The total always stays at 100%.</p>
          ${weightDimensions.map((d, i) => `<div class="weight-slider"><div><label for="weight-${d.key}">${d.label}</label><output for="weight-${d.key}" data-weight-output="${i}">${d.weight}%</output></div><input id="weight-${d.key}" type="range" min="0" max="100" step="1" value="${d.weight}" data-weight-index="${i}" aria-describedby="weight-${d.key}-description weight-slider-help"><p id="weight-${d.key}-description">${d.description}</p></div>`).join("")}
          <div class="weight-actions"><button type="button" class="button primary" data-weight-reset>Reset to current weights</button><span data-weight-total>Total: 100%</span></div>
          <label class="weight-cohort-label" for="weight-cohort">Compare assessment procedures</label><select id="weight-cohort" data-weight-cohort>${Object.entries(cohortLabels).map(([key, label]) => `<option value="${key}">${label}${key === "all" ? "" : ` (${snapshot.debates.filter(d => d.cohort === key).length} debates)`}</option>`).join("")}</select>
          <p class="weight-procedure-note">Earlier and later assessments used different judging procedures. Compare them separately to check whether a pattern holds in both.</p>
        </fieldset>
        <p data-weight-nojs>The default results are shown below. Enable JavaScript to adjust the sliders.</p>
      </div>
      <div class="weight-results" data-weight-results>${renderResults(baseline, true)}</div>
    </div>
    <p class="weight-limit">This tests how the recorded scores respond to different weights. It does not ask the AI to judge the arguments again, establish which worldview is true, or prove the judgments are unbiased.</p>
    <p class="sr-only" data-weight-announcement role="status" aria-live="polite" aria-atomic="true"></p>
    <details class="weight-debate-details" data-weight-debates hidden><summary>See individual debate results</summary><div data-weight-table></div></details>
    <details class="weight-methods"><summary>How this calculation works</summary><p>Each argument or reply keeps its six recorded dimension scores. Your weights produce a new whole-number move score. We then apply the original argument-importance weights, round each section score, apply the original section weights and final burden-completion adjustment, and round the debate-side score. Scores stay between 0 and 100. Each debate contributes equally to the averages above.</p><p>The default calculation reproduces every published side score in this set. A changed result means a switch between pro-God ahead, con-God ahead and tied. Small slider changes may leave a score unchanged because the original calculation rounds at several steps. Even a 100% setting retains the original argument weights, section weights and final adjustments; it is an extreme scenario, not a recommended rubric.</p><p>The comparison uses the same reviewed religious-versus-skeptical set as the first Insights study, excluding team debates and cases without a clear contrasting position. New assessments are not added automatically until their inclusion and side labels have been reviewed for a research update.</p><p><a href="/insights/data-and-methods/#score-gap">Research scope and methods</a> · <a href="/${snapshot.source}/debates.json">Debate data and inclusion decisions</a> · <a href="/${snapshot.source}/moves.json">Recorded dimension scores</a></p></details>
  </section>`;
}

export function initializeWeightExplorer(root) {
  if (!root || root.dataset.initialized) return;
  root.dataset.initialized = "true";
  const controls = root.querySelector("[data-weight-controls]");
  controls.disabled = false;
  root.querySelector("[data-weight-nojs]").hidden = true;
  const details = root.querySelector("[data-weight-debates]");
  details.hidden = false;
  const sliders = [...root.querySelectorAll("[data-weight-index]")];
  const selector = root.querySelector("[data-weight-cohort]");
  const presetButtons = [...root.querySelectorAll("[data-weight-preset]")];
  let weights = [...defaultWeights];
  let result = evaluateWeights(snapshot.debates);
  // Hold the other proportions fixed for an entire drag/key sequence so repeated
  // one-point rounding does not drain a dimension accidentally.
  let dragStart;
  function announce() {
    root.querySelector("[data-weight-announcement]").textContent = `${findWeightPreset(weights)?.label || "Custom weights"}. ${cohortLabels[selector.value]}. ${result.count} debates. Pro-God average ${number(result.proGod)}. Con-God average ${number(result.conGod)}. ${lead(result.gap)}${result.gap ? ` by ${number(Math.abs(result.gap))} points` : ""}. ${result.changed} debate results changed.`;
  }
  function update() {
    const preset = findWeightPreset(weights);
    presetButtons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.weightPreset === preset?.id)));
    root.querySelector("[data-weight-preset-state]").textContent = preset ? `${preset.label}: ${preset.description}` : "Custom weights: your sliders no longer match a preset.";
    sliders.forEach((slider, i) => {
      slider.value = weights[i];
      slider.setAttribute("aria-valuetext", `${weights[i]} percent`);
      root.querySelector(`[data-weight-output="${i}"]`).value = `${weights[i]}%`;
    });
    result = evaluateWeights(snapshot.debates, weights, selector.value);
    const isDefault = weights.every((w, i) => w === defaultWeights[i]);
    root.querySelector("[data-weight-results]").innerHTML = renderResults(result, isDefault);
    if (details.open) root.querySelector("[data-weight-table]").innerHTML = renderDebates(result);
  }
  for (const [index, slider] of sliders.entries()) {
    slider.addEventListener("pointerdown", () => { dragStart = [...weights]; });
    slider.addEventListener("keydown", () => { dragStart ||= [...weights]; });
    slider.addEventListener("input", () => { weights = redistributeWeights(dragStart || weights, index, Number(slider.value)); update(); });
    slider.addEventListener("change", () => { dragStart = undefined; announce(); });
    slider.addEventListener("blur", () => { dragStart = undefined; });
  }
  selector.addEventListener("change", () => { update(); announce(); });
  for (const button of presetButtons) button.addEventListener("click", () => {
    weights = [...weightPresets.find(preset => preset.id === button.dataset.weightPreset).weights];
    dragStart = undefined; update(); announce();
  });
  root.querySelector("[data-weight-reset]").addEventListener("click", () => {
    weights = [...defaultWeights]; dragStart = undefined; update(); announce();
  });
  details.addEventListener("toggle", () => { if (details.open) root.querySelector("[data-weight-table]").innerHTML = renderDebates(result); });
}
