import { researchInsights, insightLink } from "./insights.js";

// Editorial descriptions checked against the frozen README, manuscripts and
// direct slogan study's protocol-light.md. These are not live catalogue totals.
const corpus = "/docs/analysis/astra-corpus-papers-2026-09-04/";
const slogans = "/docs/analysis/direct-slogan-study-2026-09-04/";
const methods = {
  "score-gap": {
    evidence: "187 classified religious-versus-skeptical comparisons drawn from the 253-assessment archive. Classification follows the position actually argued, not a speaker’s identity or the PRO/CON label. The broader set includes religious meaning, scripture and doctrine as well as God-existence questions.",
    calculation: "Reconstruct each side’s official score with its section and move-importance weights. Subtract the theist score from the non-theist score within each debate, then average those differences with one vote per debate. Break the weighted difference into scoring areas to see where it arises. Repeat the calculation on 20,000 samples drawn with replacement from whole debates to examine stability.",
    caution: "The scoring areas help define the final score, so this breakdown is not independent validation of the judging criteria. Repeated speakers and opponents, selection of debates and possible judging bias are not fully captured by the displayed ranges.",
    rows: [["Comparisons", "187"], ["Non-theist leads / theist leads / ties", "160 / 20 / 7"], ["Average non-theist advantage", "6.34 score points"]],
    files: [["classification.csv", "Debate inclusion, position and topic table (CSV)"], ["debates.json", "Comparable debate records (JSON)"], ["results.json", "Calculated results (JSON)"], ["analyze.py", "Analysis program (Python)"]]
  },
  "topic-differences": {
    evidence: "The same 187 classified comparisons, grouped into eight exploratory research topics. These categories differ from the website’s browsing topics. The classification table records inclusion decisions and membership in a narrower topic set.",
    calculation: "Calculate the paired score gap separately within each topic. For move comparisons, first calculate the relevant average within each side, then average the paired differences across debates where both sides have that kind of move. Draw whole debates repeatedly to examine how the topic order and differences vary.",
    caution: "Topics were not specified before inspecting the evidence. Classification choices and overlapping uncertainty make exact topic order fragile. The narrower truth-claim set has 146 debates; this is a different set from the 146 used in the retired slogan-risk analysis. The move-level averages here do not use the first study’s full score-weighting procedure.",
    rows: [["Research topics", "8"], ["Religion, culture and meaning", "22 debates · 8.27-point mean gap"], ["Resurrection", "17 debates · 3.53-point mean gap"], ["All / high-importance / constructive / reply pairs", "187 / 186 / 116 / 186"]],
    files: [["classification.csv", "Topic assignments and inclusion decisions (CSV)"], ["moves.json", "Assessed move records (JSON)"], ["results.json", "Topic and move results (JSON)"], ["analyze.py", "Analysis program (Python)"]]
  },
  slogans: {
    evidence: "A September 5 direct review of all 187 retained religious-versus-skeptical transcripts from the September 4 archive. Each received one fresh GPT-6 Astra reading at low reasoning effort, without the old scores, critiques or expected results. Five earlier two-reader pilot pairs were excluded. This replaces the former score-based slogan-risk study.",
    calculation: "An unsupported slogan must both present a compact conclusion as settled and substitute for a needed reason. A protected slogan must also contain positive evidence of blocking criticism. Count distinct uses in context; immediate repetition counts once, while renewed use after a reply can count again. Divide each side’s count by its attributed substantive caption words, multiply by 10,000, and then average with equal weight per debate. Protected slogans are included within unsupported slogans. Whole-debate resampling examines stability; supplementary checks examine uncertain cases and alternative subsets.",
    caution: "This was one AI reading per transcript, not independent double coding. Caption errors, missed examples and systematic reader bias remain possible. File fingerprints and quotation checks verify traceability, not the accuracy of every caption or judgment. Emotional language does not establish motives or audience effects.",
    rows: [["Transcripts reviewed", "187"], ["Detected protected uses: theist / non-theist", "77 / 19"], ["Mean protected uses per 10,000 words", "0.56 / 0.16"], ["Debates with no detected protected use on either side", "144"]],
    base: slogans,
    files: [["protocol-light.md", "Definitions, counting rules and review procedure (text)"], ["light-debates.csv", "Counts and speech denominators by debate (CSV)"], ["light-incidents.json", "Source-linked detected uses and explanations (JSON)"], ["light-results.json", "Final results (JSON)"], ["supplementary-results.json", "Alternative checks (JSON)"], ["editorial-corrections.json", "Recorded editorial corrections (JSON)"], ["analyze_light.py", "Analysis program (Python)"], ["supplementary.py", "Supplementary calculations (Python)"]]
  },
  "con-role": {
    evidence: "237 comparable debates, with 474 assessed sides. A smaller comparison follows 31 speakers who appear in both PRO and CON roles. Position classifications distinguish those roles from the religious or skeptical position defended.",
    calculation: "First average the CON-minus-PRO difference within whole debates. Then compare role differences with religious orientations balanced, and compare each returning speaker’s mean CON and PRO scores. Show both equally weighted and weighted same-speaker summaries. Resample debates for debate comparisons and shared speakers for speaker comparisons.",
    caution: "These comparisons answer different questions and reuse observations. Even within one speaker, topics and opponents differ. The smaller estimate cannot establish that the role has no effect, and the raw gap cannot establish a built-in scoring bonus.",
    rows: [["Raw CON advantage", "4.70 points"], ["Balanced religious orientations", "1.76 points"], ["Same speakers: equal / weighted", "0.84 / 0.80 points"], ["Speakers in both roles", "31"]],
    files: [["debates.json", "Debate scores and roles (JSON)"], ["classification.csv", "Substantive positions (CSV)"], ["results.json", "Role comparison results (JSON)"], ["analyze.py", "Analysis program (Python)"]]
  },
  "fallacy-count": {
    evidence: "All 253 public assessments, with ten ties excluded when identifying lower-scoring sides. The study uses accepted public named-fallacy tags, then separately examines comparable records and the earlier and later assessment processes.",
    calculation: "Count decisive assessments whose lower-scoring side has no named-fallacy tag, divide by the number of decisive assessments, and repeat within each process group. For comparable untagged losses, compare how many of the six scoring areas trail the other side.",
    caution: "A tag is an accepted annotation, not an exhaustive or independent census of reasoning errors. Only six named fallacy labels occur in this snapshot. Different tagging practices across processes strongly affect the result; the archive-wide majority should not be treated as a stable law.",
    rows: [["Whole archive: untagged losses", "150 / 243 · 61.7%"], ["Earlier process", "139 / 172 · 80.8%"], ["Later process", "8 / 55 · 14.5%"], ["Other formats", "3 / 16 · 18.8%"]],
    files: [["losses.json", "Loss and annotation records (JSON)"], ["results.json", "Counts and comparisons (JSON)"], ["analyze.py", "Analysis program (Python)"]]
  },
  "same-scale": {
    evidence: "237 comparable debates: 179 from the earlier detailed-findings process and 58 from the later standalone process. Fifty-one speakers appear in both groups. These are different debate performances, not identical transcripts assessed twice.",
    calculation: "Compare score averages and patterns across the six scoring areas, annotation frequencies and the earlier-versus-later averages of returning speakers. Check repeated exact score values separately. The paper proposes shared test debates and independent checks for a future reassessment.",
    caution: "Changes in speakers, questions, opponents and assessment procedures can all contribute. Score arithmetic can be correct while judgments remain imperfectly comparable. Subtracting each process’s mean is an exploratory check, not a justified correction to public scores.",
    rows: [["Earlier / later comparable debates", "179 / 58"], ["Earlier / later average side score", "81.32 / 78.51"], ["Returning speakers: lower / higher / unchanged", "45 / 5 / 1"]],
    files: [["debates.json", "Comparable scores and process groups (JSON)"], ["results.json", "Process and speaker comparisons (JSON)"], ["revision-checks.json", "Exact-score frequency checks (JSON)"], ["analyze.py", "Analysis program (Python)"]]
  },
  "ranking-confidence": {
    evidence: "A fixed September 4 field of 50 speakers with at least three eligible appearances each, totaling 334 appearances. These are the paper’s saved rankings, not the current live table.",
    calculation: "Recalculate ranks by repeatedly drawing from each person’s recorded scores. Compare this with a model that allows score variation estimated across the wider group, and with a check that changes debate weights together for both speakers. Report the middle 95% of calculated positions. The different methods make different assumptions and their ranges are not interchangeable.",
    caution: "The model holds its fitted variation estimates and the 50-person field fixed. Unequal appearance counts, opponents and assessment processes limit interpretation. Model probabilities are not calibrated future-win probabilities. The paper’s five-speaker teaching diagram is invented and clearly labeled; it is not research evidence.",
    rows: [["Ranked speakers / appearances", "50 / 334"], ["Minimum appearances per speaker", "3"], ["Typical neighboring mean-score gap", "0.17 points"], ["Typical rank-range width: resampled / model", "12 / 19 places"]],
    files: [["ranking.csv", "All 50 speakers, appearances and rank ranges (CSV)"], ["results.json", "Ranking calculations (JSON)"], ["revision-checks.json", "Rank-correlation teaching checks (JSON)"], ["analyze.py", "Analysis program (Python)"]]
  }
};
const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const download = (base, [file, label]) => `<li><a href="${base}${file}" download>${escape(label)}</a></li>`;

export function renderInsightsMethodsContent() {
  return `<section class="insights-intro">
    <p class="eyebrow"><a href="/insights/">Insights</a> / Research evidence</p>
    <h1>Data and methods</h1>
    <p class="large">Follow each finding back to its evidence.</p>
    <p>See which debates were included, how the calculations work and where the conclusions stop. Download the supporting tables and analysis files directly from SLUGFESTER.</p>
    <p class="insights-snapshot"><strong>Fixed research edition: September 4, 2026 · 253 assessments.</strong> The slogan paper uses a September 5 direct transcript review of that same archive. These studies do not update automatically when new debates arrive. The source assessments were not freshly reassessed by Astra for the six score-based papers.</p>
    <nav class="insights-index" aria-label="Study methods">${researchInsights.map((item, i) => `<a href="#${item.id}"><span>${i + 1}.</span> ${escape(item.title)}</a>`).join("")}</nav>
  </section>
  <section class="methods-shared" aria-labelledby="shared-heading">
    <h2 id="shared-heading">What the studies share</h2>
    <p>This is a selected archive, not a representative sample of all public debates. A score assesses reasoning under SLUGFESTER’s criteria; it does not measure the truth of a worldview. Different questions require different subsets, so the number of observations changes between studies.</p>
    <div class="methods-table-wrap"><table><caption>Which records answer which questions</caption><thead><tr><th scope="col">Evidence set</th><th scope="col">Size and use</th></tr></thead><tbody>
    <tr><th scope="row">Full public archive</th><td>253 assessments · 5,492 assessed moves; public annotation counts</td></tr>
    <tr><th scope="row">Comparable locked records</th><td>237 debates · 474 sides · 5,282 moves; reconstructed score comparisons</td></tr>
    <tr><th scope="row">Religious-versus-skeptical comparisons</th><td>187 debates; position and topic studies, plus the direct slogan review</td></tr>
    <tr><th scope="row">Decisive public results</th><td>243 assessments; ten ties excluded from loss counts</td></tr>
    <tr><th scope="row">Ranked field</th><td>50 speakers · 334 appearances; at least three appearances each</td></tr>
    </tbody></table></div>
    <p><strong>Reading uncertainty ranges.</strong> Resampling means repeatedly drawing observations from the saved records, allowing a record to be drawn more than once. The score studies use 20,000 draws. These ranges show how calculations change within this archive; they do not include every caption error, judging bias or effect of repeated speakers.</p>
  </section>
  ${researchInsights.map((item, i) => {
    const method = methods[item.id];
    return `<article class="methods-study" id="${item.id}" aria-labelledby="${item.id}-heading">
      <p class="eyebrow">Study ${i + 1} / 7 · ${escape(item.topic)}</p><h2 id="${item.id}-heading">${escape(item.title)}</h2>
      <h3>Evidence used</h3><p>${escape(method.evidence)}</p>
      <h3>How the result was calculated</h3><p>${escape(method.calculation)}</p>
      <div class="methods-table-wrap"><table><caption>Key counts and comparisons for study ${i + 1}</caption><thead><tr><th scope="col">Measure</th><th scope="col">Research snapshot</th></tr></thead><tbody>${method.rows.map(([label, value]) => `<tr><th scope="row">${escape(label)}</th><td>${escape(value)}</td></tr>`).join("")}</tbody></table></div>
      <h3>Limitations</h3><p>${escape(method.caution)}</p><p class="insight-limitation">${escape(item.limitation)}</p>
      <h3>Supporting files</h3><p>CSV tables open in spreadsheet software. JSON files contain structured records; Python files contain the calculation instructions. Downloads are saved research files, not live results.</p>
      <ul class="insight-links">${method.files.map((file) => download(method.base || corpus, file)).join("")}</ul>
      <h3>Follow the evidence</h3><ul class="insight-links">${item.links.map((link) => `<li><a href="${escape(insightLink(link))}">${escape(link.label)}</a></li>`).join("")}</ul>
      <p><a class="button primary" href="/output/pdf/${item.pdf}.pdf?v=${item.version || "20260904-astra253-r2"}">Read the full paper (PDF)</a></p>
      <p><a href="/insights/#${item.id}">Back to this finding and its figure</a> · <a href="#shared-heading">Shared evidence and uncertainty</a></p>
    </article>`;
  }).join("")}
  <section class="methods-shared" aria-labelledby="trace-heading"><h2 id="trace-heading">Trace and reproduce the research</h2>
    <p>The saved source revision is <code>76d006b37</code>. The source manifest lists file fingerprints for checking that the evidence has not changed. Reproducing the score analysis requires that frozen input revision, or matching source files; running it against newer assessments is not an update to this edition.</p>
    <p>The numerical audit notebooks show calculation checks. Figure records preserve chart inputs and reading keys. The direct slogan study has its own source-linked incident records and review instructions; its results replace the older slogan proxy in the shared package.</p>
    <ul class="insight-links">${[["README.md", "Score-study reproduction instructions (text)"], ["source-manifest.json", "Frozen source records and fingerprints (JSON)"], ["audit.ipynb", "Numerical audit notebook"], ["chart-contracts.json", "Figure definitions and plotted inputs (JSON)"], ["figure-reading-keys.json", "Figure reading guides (JSON)"], ["casebook.json", "Score-study examples and original source links (JSON)"]].map((file) => download(corpus, file)).join("")}${[["light-instructions.md", "Direct slogan review instructions (text)"], ["light-manifest.json", "Direct slogan source and review manifest (JSON)"], ["audit.ipynb", "Direct slogan numerical audit notebook"]].map((file) => download(slogans, file)).join("")}</ul>
    <p><a href="/insights/">Back to Insights</a> · <a href="/backend/">Read the assessment method</a></p>
  </section>`;
}
