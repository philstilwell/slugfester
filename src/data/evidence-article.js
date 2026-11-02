// Fixed, reproducible summary of the October 8 revision 2 chart snapshot.
export const evidenceArticlePath = "/insights/debate-evidence/";
export const evidenceArticleTitle = "What Slugfester’s debate assessments reveal about evidence";
export const evidenceArticleDescription = "Explore the evidence gap in Slugfester’s public-debate assessments, how the scores are calculated, and what they can and cannot establish.";
export const evidenceArticleData = {
  date: "2026-10-08", revision: 2, debates: 226, moves: 5405,
  evidenceMeans: [66.45159337934712, 74.18664418647175],
  below70: [60.56034306994129, 25.785374467050683]
};

export function renderEvidenceArticle() {
  const d = evidenceArticleData;
  return `<article class="evidence-article" aria-labelledby="evidence-article-title">
    <header>
      <p class="eyebrow"><a href="/insights/">Slugfester Insights</a> · Evidence and public argument</p>
      <h1 id="evidence-article-title">${evidenceArticleTitle}</h1>
      <p class="large">Public claims require public support. Slugfester makes that support—and the gaps in it—available for inspection.</p>
      <p class="evidence-byline">By Slugfester · Published November 2, 2026 · Prepared with AI assistance</p>
    </header>

    <p>A confident delivery can make a weak argument sound settled. A cautious objection can sound unimpressive even when it identifies the exact premise that has not been established. Slugfester examines public debates by separating those impressions from the reasoning presented: what was claimed, what supported it, and whether the reply addressed the objection.</p>
    <p>The recorded results contain a substantial evidence-score gap between moves supporting religious claims and moves challenging them. That gap deserves a clear account. It should neither be dismissed because it is uncomfortable nor treated as proof that the assessment system is impartial.</p>

    <aside class="evidence-source-note"><strong>A fixed edition, not a live tally.</strong> The figures below describe ${d.debates} included debates and ${d.moves.toLocaleString("en-US")} assessed moves in the October 8, 2026 chart snapshot, revision ${d.revision}. The catalogue contained 300 debates at capture; 74 were outside this chart’s included set. The website has since added debates. This article retains the saved edition so its calculations remain reproducible.</aside>

    <h2>What the evidence scores show</h2>
    <p>The equal-debate mean evidence score is <strong>${d.evidenceMeans[0].toFixed(1)} for supporting moves and ${d.evidenceMeans[1].toFixed(1)} for challenging moves</strong>, on the recorded 0–100 scale. Evidence is the lowest mean dimension for both positions in this snapshot. These are evidence-dimension summaries, not overall debate scores or probabilities that either worldview is true.</p>
    <figure class="evidence-comparison" aria-labelledby="evidence-comparison-title">
      <h3 id="evidence-comparison-title">How often did evidence scores fall below 70?</h3>
      <p>Average percentage of assessed moves, giving each included debate equal weight.</p>
      ${["Supporting the religious claim", "Challenging the religious claim"].map((label, i) => `<div class="evidence-bar-row"><div class="evidence-bar-label"><span>${label}</span><strong>${d.below70[i].toFixed(1)}%</strong></div><div class="evidence-bar-track" aria-hidden="true"><span class="evidence-bar-fill evidence-bar-${i}"></span></div></div>`).join("")}
      <div class="evidence-bar-axis" aria-hidden="true"><span>0%</span><span>50%</span><span>100%</span></div>
      <figcaption>A score of exactly 70 is not counted. The percentages describe this selected archive and the saved AI assessments. They do not estimate how all Christians or all skeptics reason.</figcaption>
    </figure>
    <p>“Supporting” and “Challenging” identify the position toward the religious claim in that debate. They do not describe a person’s entire identity, and they do not always match the original PRO and CON columns. The archive includes non-Christian religious claims. A Christianity-only conclusion would require a separately defined and reviewed subset.</p>

    <h2>How Slugfester assesses a public debate</h2>
    <p>The published process identifies claims and replies from the source material, assigns them to the exchange they address, obtains separate initial AI reviews, and resolves disagreements through AI adjudication. Fixed calculations turn the recorded judgments into scores. The reviewers and adjudicator are AI agents; separate reviews do not imply independent human validation or freedom from shared model errors.</p>
    <p>Six dimensions distinguish different kinds of strength: logical coherence, evidence and support, responsiveness, relevance and burden, precision and clarity, and calibration and charity. A move can be clear and relevant while relying on an unsupported premise. An opponent can identify that weakness while making a poorly supported counterclaim of their own. The <a href="/backend/">assessment method and interactive charts</a> explain these distinctions in more detail.</p>
    <p>The evidence dimension asks whether the offered support is adequate for the conclusion. This is not a citation-counting exercise. Historical testimony, textual analysis, mathematical reasoning and philosophical argument can all provide relevant support. Naming an authority does not establish everything attributed to it; omitting an inline citation does not automatically make a sound conceptual argument weak.</p>

    <h2>The same obligation, with attention to the claim</h2>
    <p>Both sides must supply publicly assessable reasons for the public claims they make. Personal certainty, religious experience or an assertion of self-authenticating knowledge does not create an exemption. An experience can be offered as testimony, but its reliability and relevance remain open to scrutiny.</p>
    <p>Equal standards do not mean that every claim carries an identical burden. Showing that an argument has not established God’s existence is narrower than establishing that no God exists. The critic incurs the stronger burden if the critic makes the stronger claim. Likewise, a possible explanation may answer an impossibility claim without showing that the explanation is probable or historically true.</p>
    <p>These distinctions matter to both positions. They also prevent a misleading defense of the gap: different debate roles could contribute to it, but that possibility does not excuse evidential work left undone.</p>

    <h2>When “evidence neglect” is the appropriate criticism</h2>
    <p>Evidence neglect occurs when an argument leaves a necessary evidential check undone—for example, asserting a probability without defending the probability assumptions, generalizing beyond the cited evidence, or failing to address a relevant counterexample. The criticism identifies missing work. It does not require a diagnosis of deliberate evasion.</p>
    <p>A concrete example appears in the saved assessment of <a href="/debate/craig-oconnor-god-debate-2026/">William Lane Craig’s debate with Alex O’Connor</a>. For the fine-tuning claim at 94:39, the critique questions the missing probability measure, selection effects and comparison with alternatives. The recorded evidence score is 61. A reader can challenge that judgment by locating the missing justification in the exchange; an appeal to private certainty would supply none of it. The <a href="/assets/charts/evidence-faith-and-fair-assessment-2026-10-08.pdf" type="application/pdf">full evidence-gap explanation</a> discusses this and other examples.</p>

    <h2>Could faith diminish the standard of evidence?</h2>
    <p>Yes. Where retaining a conclusion despite unresolved objections is rewarded, while revising it is treated as disloyalty, faith can weaken the incentive to test the conclusion. Arguments may then serve primarily to protect a commitment rather than expose it to possible correction. This is a plausible mechanism for evidence neglect.</p>
    <p><strong>Our epistemic position is moderate, provisional credence that this mechanism contributes to some of the documented shortcomings.</strong> That is an interpretive judgment, not a measured percentage or a causal result established by the charts. The data do not show how much of the gap it explains. “Faith” also has different meanings, and the mechanism should not be attributed to every Christian or every religious argument.</p>
    <p>Other possible contributors include the selection of debates, repeated speakers, differences in the claims undertaken, debate incentives, and errors in the judging system. Ideological commitment can also protect secular beliefs. Naming these possibilities does not erase the observed omissions; it keeps the explanation answerable to evidence.</p>

    <h2>What would make the assessment more credible?</h2>
    <p>Traceability and consistent calculations make criticism possible. They do not prove that the judgments are correct. The included assessment records identify the same model, so agreement can reflect shared assumptions. The debates were selected for the site rather than sampled at random, and repeated appearances by the same people are not independent observations.</p>
    <p>A useful bias challenge identifies a missed argument, a misapplied burden, a source error, or a difference in how comparable claims were treated. Further validation could compare blinded judgments across models and independent human reviewers. Such checks would test the assessment; forcing equal scores would not.</p>
    <p>Readers can start with one debate, follow the source, and inspect the critique against what was actually said. <a href="/corrections/">Send a correction</a> when the record does not support the judgment. The same demand for adequate evidence applies to Slugfester’s assessments themselves.</p>

    <details class="evidence-calculation"><summary>How the percentages are calculated</summary>
      <p>Within each debate and position, count the selected moves with evidence scores strictly below 70 and divide by that position’s selected moves. Average those percentages equally across the included debates. For example, rates of 1 out of 2 and 1 out of 10 produce (50% + 10%) / 2 = 30%, not the pooled rate of 2 out of 12.</p>
      <p>This article counts each included move once. The Backend chart’s argument-family rows use their own subsets; families can overlap and the two positions can have different denominators. Its threshold control changes the view of saved scores, without reassessing debates.</p>
    </details>
    <footer class="evidence-sources"><h2>Inspect the evidence</h2><ul>
      <li><a href="/backend/#charts">Explore the interactive argument charts</a></li>
      <li><a href="/docs/charts/evidence-explanation-2026-10-08/analysis.json">Download the calculations for this edition (JSON)</a></li>
      <li><a href="/docs/charts/snapshots/2026-10-08-r2.json">Download the saved chart data (JSON)</a></li>
      <li><a href="/assets/charts/evidence-faith-and-fair-assessment-2026-10-08.pdf" type="application/pdf">Read Evidence, faith, and fair assessment (PDF)</a></li>
      <li><a href="/insights/">Explore the research papers and their limitations</a></li>
    </ul></footer>
  </article>`;
}
