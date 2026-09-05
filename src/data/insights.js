// Editorial summaries of the published papers, not live catalogue statistics.
export const researchSnapshot = "September 4, 2026";
const corpusSource = "https://github.com/philstilwell/slugfester/tree/main/docs/analysis/astra-corpus-papers-2026-09-04";
export const researchInsights = [
  {
    id: "score-gap", topic: "Evidence and inference", title: "Why do the theist sides score lower?",
    finding: "The largest gap is in the support offered for claims.",
    statistic: "6.34 points", statisticLabel: "Average non-theist advantage · 187 comparisons",
    explanation: "Non-theist sides score higher in 160 of the 187 comparisons; theist sides lead in 20, with seven ties. Support for claims, consistent reasoning, and answers to objections account for about three-quarters of the overall difference. The practical question is whether the reasons offered justify the exact conclusion being drawn.",
    limitation: "These are assessments of selected debates, not a test of which worldview is true. The paper’s proposed explanation about faith and public argument remains a hypothesis, not an established cause.",
    pdf: "why-do-the-theist-sides-score-lower", figure: "p1-dimensions", width: 2186, height: 1000,
    figureTitle: "Differences across six scoring areas", figureScope: "187 classified comparisons · area scores before weighting",
    alt: "Average non-theist advantages: logic 7.11, support 8.48, replies 6.48, task 1.93, clarity 5.13, care 8.01 area-score points.",
    reading: "Dots are average differences. Lines contain the middle 95% of averages from repeated draws of whole debates. Right of zero favors the non-theist side. These are each area’s own 0–100 points, not contributions that can be added. The ranges do not cover every possible judging error.",
    links: [{ id: "jones-schmid-contingency-god-2022", label: "Jones–Schmid: the step from a foundation to God" }, { id: "hitchens-dsouza-religion-problem-2010", label: "Hitchens–D’Souza: a gap in one explanation" }]
  },
  {
    id: "topic-differences", topic: "Questions and burdens", title: "Where is the theist disadvantage largest?",
    finding: "The gaps differ by topic, but exact topic rankings are uncertain.",
    statistic: "8.27 vs 3.53", statisticLabel: "Mean gaps in score points: religion, culture and meaning vs resurrection",
    explanation: "Religion, culture and meaning has the largest observed gap across 22 debates; resurrection is closer across 17. The paper also finds weaker support in both constructive cases and replies: it is not simply a matter of who speaks first. Look for the missing step between useful religion and true religion, or between a possible explanation and a probable one.",
    limitation: "The paper groups the 187 comparisons into eight research categories, not the site’s browsing categories. Overlapping uncertainty and debatable classifications make a precise topic order fragile.",
    pdf: "where-is-the-theist-disadvantage-largest", figure: "p2-moves", width: 2173, height: 959,
    figureTitle: "Support gap by kind of assessed move", figureScope: "Eligible pairs from 187 comparisons · evidence area-score points",
    alt: "Non-theist support advantages: all moves 8.41 across 187 debates; high-importance moves 8.83 across 186; constructive moves 8.27 across 116; replies 8.17 across 186.",
    reading: "Each row requires both sides to have that kind of move. Dots show average support-score differences; lines show the middle 95% from repeated draws of eligible debates. Rows overlap and cannot be added. The 8.41 all-move figure uses this paper’s move-level averaging, rather than the weighted score reconstruction in the first paper.",
    links: [{ id: "harris-peterson-religious-narrative-morality-2018", label: "Harris–Peterson: usefulness and truth" }, { id: "licona-ehrman-historians-prove-resurrection-2008", label: "Licona–Ehrman: historical evidence" }]
  },
  {
    id: "slogans", topic: "Reasoning under criticism", title: "When does a memorable line become a slogan?",
    finding: "The clearest difference concerns claims that shut out criticism.",
    statistic: "0.56 vs 0.16", statisticLabel: "Protected-slogan uses per 10,000 words · theist vs non-theist",
    explanation: "A fresh reading of all 187 relevant transcripts identified 77 theist and 19 non-theist uses that both replace a needed reason and block criticism. The displayed rates allow for speech length and give every debate equal weight. A forceful or emotional sentence is not automatically a defective argument.",
    limitation: "144 debates had no protected slogan detected on either side. The broader unsupported-slogan difference is less secure. This single-AI-reader study does not establish why people hold religious beliefs.",
    pdf: "are-theist-arguments-more-often-slogan-like", version: "20260905-direct187-r1", figure: "p3-direct-rates", width: 1978, height: 860,
    figureTitle: "Unsupported and criticism-blocking slogans", figureScope: "187 transcripts · September 5 direct review of the September 4 archive",
    alt: "Unsupported-slogan rates per 10,000 words: theist 0.97, non-theist 0.65. Protected-slogan rates: theist 0.56, non-theist 0.16.",
    reading: "Bars show uses per 10,000 attributed words, averaged equally across debates. Protected slogans are a subset of unsupported slogans: do not add the two panels. The broader unsupported-slogan difference does not keep the same direction across repeated draws of debates.",
    source: "https://github.com/philstilwell/slugfester/tree/main/docs/analysis/direct-slogan-study-2026-09-04",
    links: [{ search: "Sye Ten Bruggencate", label: "Explore Ten Bruggencate’s debates" }, { search: "John Lennox", label: "Explore Lennox’s debates" }]
  },
  {
    id: "con-role", topic: "Alternative explanations", title: "Does the CON side have an inherent advantage?",
    finding: "The raw advantage shrinks when the comparison changes.",
    statistic: "4.70 → 0.80", statisticLabel: "Raw CON advantage vs weighted same-speaker comparison",
    explanation: "CON averages 4.70 points higher across 237 comparable debates. But role labels also track different speakers and positions. Comparing the 31 people who appear in both roles gives a smaller weighted estimate of 0.80 points, with uncertainty spanning zero. PRO does not mean theist, and CON does not mean non-theist.",
    limitation: "The same people are still discussing different questions against different opponents. Neither a large built-in CON bonus nor the complete absence of role effects has been established.",
    pdf: "does-the-con-side-have-an-inherent-advantage", figure: "p4-estimates", width: 2201, height: 958,
    figureTitle: "Four comparisons of CON and PRO scores", figureScope: "237 comparable debates; same-speaker checks use 31 people",
    alt: "CON-minus-PRO estimates: raw archive 4.70; balanced religious orientations 1.76; same speakers equally weighted 0.84; same speakers weighted 0.80 points.",
    reading: "Dots show estimates; lines show the middle 95% from repeated draws of debates or speakers. A range crossing zero allows either direction. These rows answer different questions and reuse records; do not add or average them.",
    links: [{ id: "folley-scrivener-good-without-god-2025", label: "Folley–Scrivener: skeptical position on PRO" }, { id: "oconnor-baker-hytch-evil-god-challenge-2021", label: "O’Connor–Baker-Hytch: a close PRO lead" }]
  },
  {
    id: "fallacy-count", topic: "Beyond error labels", title: "Can a debate be lost without a named fallacy?",
    finding: "A missing fallacy label is not a clean bill of health.",
    statistic: "150 of 243", statisticLabel: "Lower-scoring sides with no named-fallacy tag · 61.7%",
    explanation: "Weak evidence, incomplete replies and unsupported conclusions can accumulate without a familiar fallacy label. Among 147 comparable untagged losses, 74.8% trail in five or six scoring areas. A higher-scoring side can also commit a named fallacy; that occurs in 51 decisive assessments.",
    limitation: "The untagged-loss rate changes from 80.8% in the earlier process to 14.5% in the later one. The archive-wide majority is not a stable law of debate or a reliable description of the current process.",
    pdf: "debates-are-usually-lost-without-a-named-fallacy", figure: "p5-cohorts", width: 2175, height: 958,
    figureTitle: "Lower scores without named-fallacy tags", figureScope: "253 assessments · 243 decisive results; ten ties excluded",
    alt: "Untagged losses: whole archive 150/243, 61.7%; earlier process 139/172, 80.8%; later process 8/55, 14.5%; other formats 3/16, 18.8%.",
    reading: "Bar length is the percentage of lower-scoring sides without a named-fallacy tag. The printed fractions give each denominator. The whole-archive bar contains the other groups and is not an additional group.",
    links: [{ id: "slick-clifton-objective-morality-god-2014", label: "Slick–Clifton: stating an ought versus justifying it" }, { id: "fischer-dillahunty-axiomatic-evidence-god-2020", label: "Fischer–Dillahunty: what an axiom establishes" }]
  },
  {
    id: "same-scale", topic: "Measurement limits", title: "Are all assessments on the same scale?",
    finding: "Correct arithmetic does not guarantee comparable judgments.",
    statistic: "45 of 51", statisticLabel: "Returning speakers with lower averages in the later process",
    explanation: "The earlier group of 179 comparable debates averages 81.32 per side; the later 58 average 78.51. Score patterns and the use of reasoning-error labels also change. The paper proposes shared test debates and independent checks for the next reassessment.",
    limitation: "These are different debates, not repeated judgments of identical material. Changes in speakers, topics and assessment methods may all contribute. Adding a fixed adjustment to later scores would not be justified.",
    pdf: "are-all-slugfester-assessments-on-the-same-scale", figure: "p6-bridge", width: 1946, height: 1319,
    figureTitle: "Speaker averages across two assessment processes", figureScope: "51 people appearing in both groups · 0–100 scores, focused axes",
    alt: "Among 51 returning speakers, 45 have lower later averages, five higher, and one unchanged.",
    reading: "One dot is one person. Horizontal position is their earlier average; vertical position is their later average. Below the dashed equality line means lower later scores. Both axes enlarge scores 62–94. This comparison does not isolate judging changes from different debate performances.",
    links: [{ href: "/backend/", label: "Read the assessment method" }, { href: "/rankings/", label: "Explore current records with these limits in mind" }]
  },
  {
    id: "ranking-confidence", topic: "Reading rankings", title: "How much confidence should we place in exact ranks?",
    finding: "Broad performance patterns are more stable than exact places.",
    statistic: "0.17 points", statisticLabel: "Typical gap between neighboring averages in the research snapshot",
    explanation: "The study’s 50 ranked speakers often have overlapping plausible positions. Recalculating ranks from recorded scores gives a typical range width of 12 places; a model allowing wider score variation gives 19. Very small gaps should not be read as decisive differences in ability.",
    limitation: "These ranges describe repeated calculations within a fixed 50-person field. They are not future win probabilities, guarantees about a person’s rank, or a measure of the AI’s accuracy.",
    pdf: "do-slugfester-rankings-measure-stable-performance", figure: "p7-ranges", width: 2180, height: 1825,
    figureTitle: "Rank ranges for the snapshot’s leading speakers", figureScope: "September 4 field: 50 speakers with at least three eligible appearances",
    alt: "Snapshot leaders have overlapping rank ranges. Joseph Schmid’s observed first place overlaps the calculated ranges of nearby speakers; wider model ranges often extend substantially farther than resampled ranks.",
    reading: "Dark dots mark the September 4 rank, not a live rank. Solid teal lines reuse each person’s recorded scores; dashed rust lines also allow for variation across the wider group. Lines retain the middle 95% of calculated ranks. First place is on the left; parentheses count appearances.",
    links: [{ href: "/interlocutor/joseph-schmid/", label: "Joseph Schmid’s current record" }, { href: "/interlocutor/sean-carroll/", label: "Sean Carroll’s current record" }, { href: "/rankings/", label: "Open current rankings" }]
  }
];

function escape(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function insightLink(link) {
  return link.href || (link.id ? `/debate/${link.id}/` : `/search/?q=${encodeURIComponent(link.search)}`);
}

export function renderInsightsContent() {
  return `<section class="insights-intro">
    <p class="eyebrow">Research made readable</p>
    <h1>Insights from the debates</h1>
    <p class="large">What makes an argument persuasive—and what can the scores really tell us?</p>
    <p>Seven short introductions to the published research, with figures, limitations and paths back to the debates.</p>
    <p class="insights-snapshot"><strong>Research snapshot: ${researchSnapshot} · 253 assessments.</strong> These findings stay fixed as new debates are added. The slogan study uses a September 5 direct review of that archive. This curated sample is not representative of all public debate, and scores assess reasoning, not a worldview’s truth.</p>
    <nav class="insights-index" aria-label="Research questions">${researchInsights.map((item, i) => `<a href="#${item.id}"><span>${i + 1}.</span> ${escape(item.title)}</a>`).join("")}</nav>
  </section>
  <div class="insights-stories">${researchInsights.map((item, i) => `<article class="insight-story" id="${item.id}" aria-labelledby="${item.id}-heading">
    <div class="insight-copy">
      <p class="eyebrow">${i + 1} / 7 · ${escape(item.topic)}</p>
      <h2 id="${item.id}-heading">${escape(item.title)}</h2>
      <p class="insight-finding">${escape(item.finding)}</p>
      <p class="insight-stat"><strong>${escape(item.statistic)}</strong><span>${escape(item.statisticLabel)}</span></p>
      <p>${escape(item.explanation)}</p>
      <p class="insight-limitation"><strong>What this cannot establish.</strong> ${escape(item.limitation)}</p>
      <a class="button primary" href="/output/pdf/${item.pdf}.pdf?v=${item.version || "20260904-astra253-r2"}" type="application/pdf" target="_blank" rel="noopener">Read the full paper <span class="sr-only">— ${escape(item.title)} (PDF, new tab)</span></a>
      <ul class="insight-links">${item.links.map((link) => `<li><a href="${escape(insightLink(link))}">${escape(link.label)}</a></li>`).join("")}</ul>
    </div>
    <figure class="insight-figure">
      <h3>${escape(item.figureTitle)}</h3>
      <p>${escape(item.figureScope)}</p>
      <a href="/assets/insights/${item.figure}.png" target="_blank" rel="noopener" aria-label="Enlarge figure: ${escape(item.figureTitle)} (new tab)"><img src="/assets/insights/${item.figure}.png" alt="${escape(item.alt)}" width="${item.width}" height="${item.height}" loading="lazy" decoding="async"></a>
      <figcaption><p><strong>Reading the figure.</strong> ${escape(item.reading)}</p><a href="${item.source || corpusSource}" target="_blank" rel="noopener">Inspect the study’s data and methods</a></figcaption>
    </figure>
  </article>`).join("")}</div>`;
}
