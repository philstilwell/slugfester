# Source notes: Where Is the Theist Disadvantage Largest?

Report date: 2026-09-01  
Corpus snapshot: 228 published SLUGFESTER assessments  
Relevant analysis set: 169 theist/non-theist dyadic debates  
Locked scored moves used in the rubric and move-subset diagnostics: 3,502  
Status: draft prepared for editorial approval; not yet linked from the public Backend page

## Report files

- Publication PDF: `output/pdf/where-is-the-theist-disadvantage-largest.pdf`
- Analysis: `analysis.py`
- PDF builder: `build_pdf.py`
- Complete primary-topic assignment: `topic-taxonomy.csv`
- Topic estimates and robustness checks: `topic-summary.csv`
- Topic-by-dimension decomposition: `topic-dimension-contributions.csv`
- Move-subset diagnostic table: `move-subset-gaps.csv`
- Machine-readable result bundle: `results.json`

Running `python3 analysis.py` regenerates all CSV and JSON outputs. Running `python3 build_pdf.py` regenerates the PDF. Both scripts resolve paths from the repository root and use no network source.

## Primary repository sources

1. `docs/analysis/non-theist-vs-theist-2026-09-01/taxonomy.csv`
   - Corrected side classification for the corpus-level theist/non-theist comparison.
   - Supplies the 169 included debate identifiers, public titles, theist/non-theist speakers and sides, published overall scores, and paired margins.
   - The inclusion and side taxonomy is inherited unchanged from the earlier corpus-wide report so this paper does not redefine the outcome set after inspecting topics.

2. `src/data/debates.js`
   - Canonical public assessment records and published scores used by the site.
   - The public snapshot contains 228 assessments on the report date.

3. `docs/assessment-ledgers/*.json`
   - Locked score ledgers and adapters for the assessed debates.
   - Used indirectly through the audited move-level normalization and decomposition described below.

4. `docs/analysis/theist-argument-weaknesses-2026-09-01/debate-decomposition.csv`
   - One row per relevant debate.
   - Decomposes the official non-theist-minus-theist margin into the six weighted rubric contributions, burden-completion adjustment, and rounding residual.

5. `docs/analysis/theist-argument-weaknesses-2026-09-01/results.json`
   - Supplies the already audited move-subset summaries for all moves, constructive moves, replies, and highest-importance load-bearing moves.
   - Those summaries cover 1,746 theist and 1,756 non-theist moves across the 169 relevant debates.

6. `docs/analysis/assessment-generation-comparability-2026-09-01/results.json`
   - Background for the report's assessment-generation caution.
   - The present analysis uses assessment number 195/196 as the earlier/later boundary, matching the locked-ledger production generations documented in that audit.

## Outcome definition

For debate *i*, the primary outcome is:

`margin_i = published non-theist score_i - published theist score_i`

A positive value means the non-theist side received the higher published overall score. A negative value means the theist side received the higher score. The paired margin is preferable to pooling side scores because the two sides share the same debate, source, format, topic, and assessment generation.

The 169-debate summary is:

- Mean margin: 6.3491 points
- Median margin: 6 points
- Standard deviation: 6.1849 points
- Non-theist higher: 145 debates
- Tie: 5 debates
- Theist higher: 19 debates
- Seeded 20,000-draw debate-level bootstrap 95% interval for the mean: 5.4320 to 7.2663 points

Small differences from an earlier reported bootstrap interval arise from a fresh seeded resampling stream. The point estimate and underlying 169 margins are identical.

## Primary-topic taxonomy

Each included debate receives one mutually exclusive primary-topic label. The assignment uses the published title, side labels, motion where available in the assessment record, and the central argumentative burden. The complete assignment is in `topic-taxonomy.csv`.

The eight categories and sizes are:

| Topic | n | Primary classification focus |
|---|---:|---|
| Religion, culture & meaning | 20 | Religion's social value, existential role, identity, practical effects, or comparative cultural standing |
| Scripture, revelation & doctrine | 19 | Scripture, revelation, Christian doctrine, or faith's epistemic standing |
| Mind, reason & logic | 18 | Consciousness, rationality, free will, logic, intelligibility, or the grounding of reason |
| Evil, suffering & hiddenness | 17 | Suffering, divine hiddenness, divine goodness, or the evidential problem of evil |
| Morality & ethics | 20 | Objective moral truth, moral grounding, authority, or a worldview's ethical implications |
| Cosmology, science & design | 23 | Cosmology, origins, fine-tuning, science, biological complexity, or design inference |
| General theism / naturalism | 36 | Broad worldview comparisons without one narrower burden dominating the stated motion |
| Resurrection | 16 | The historicity or explanatory adequacy of Jesus' resurrection |

The taxonomy is deliberately coarse. Many debates contain material from several categories. The chosen label identifies the stated central burden, not every subject discussed. This produces auditable groups with 16–36 debates rather than unstable small cells, but reasonable analysts may dispute some assignments. The accompanying CSV makes alternative classifications straightforward to test.

Because the topic taxonomy was developed after the corpus existed and was not preregistered, the paper treats the rank order as exploratory and descriptive. It does not present the bootstrap intervals as fully selection-adjusted confirmatory tests.

## Topic results

| Topic | n | Mean margin | 95% bootstrap interval | Non-theist higher / tie / theist higher |
|---|---:|---:|---:|---:|
| Religion, culture & meaning | 20 | 8.65 | 6.55 to 10.70 | 19 / 1 / 0 |
| Scripture, revelation & doctrine | 19 | 7.84 | 5.11 to 10.63 | 17 / 1 / 1 |
| Mind, reason & logic | 18 | 7.22 | 3.44 to 11.06 | 14 / 1 / 3 |
| Evil, suffering & hiddenness | 17 | 7.06 | 5.12 to 8.88 | 16 / 0 / 1 |
| Morality & ethics | 20 | 6.55 | 4.20 to 8.95 | 17 / 1 / 2 |
| Cosmology, science & design | 23 | 5.52 | 2.52 to 8.26 | 20 / 0 / 3 |
| General theism / naturalism | 36 | 5.11 | 3.08 to 7.11 | 30 / 0 / 6 |
| Resurrection | 16 | 3.69 | 1.75 to 5.63 | 12 / 1 / 3 |

The observed religion/culture/meaning minus resurrection contrast is 4.9625 points. A two-group bootstrap interval is 2.1125 to 7.85 points. This contrast is descriptive because the highest and lowest categories were selected from the same data.

The observed highest-topic versus all-other-debates contrast is 2.6097 points with a descriptive bootstrap interval of 0.2741 to 4.9138 points. The same post-selection caution applies.

## Global topic-range permutation check

The analysis randomly permutes the 169 observed margins into groups with the original category sizes. For each of 20,000 seeded permutations, it calculates the range between the largest and smallest group means.

- Observed range: 4.9625 points
- Two-sided-style upper-tail random-label probability for a range at least this large: 0.1900
- Central 95% of permuted ranges: 1.9555 to 6.4118 points

This exploratory check does not establish global topic heterogeneity at conventional thresholds. The paper therefore describes a report-worthy concentration and high-gap cluster without claiming that all eight categories are reliably distinct or that topic labels causally explain the margins.

## Burden-orientation check

Theist PRO:

- n = 149
- Mean margin = 6.7785
- Bootstrap 95% interval = 5.8054 to 7.7451

Theist CON:

- n = 20
- Mean margin = 3.15
- Bootstrap 95% interval = 0.35 to 5.65

The observed PRO-minus-CON contrast is 3.6285 points; the two-group bootstrap interval is 0.9034 to 6.5846 points.

PRO/CON orientation is not random. The contrast may reflect motion, speaker, opponent, format, or topic differences in addition to formal burden. It is used as a pressure-point diagnostic, not a causal estimate.

## Speaker-concentration check

The four most frequent non-theist speakers are Matt Dillahunty (26 relevant debates), Alex O'Connor (22), Christopher Hitchens (11), and Graham Oppy (9). Removing every debate featuring one of those speakers leaves 101 debates.

Selected topic means after that exclusion:

- Religion/culture/meaning: 8.67, n = 9
- Morality/ethics: 6.64, n = 11
- Evil/suffering/hiddenness: 6.09, n = 11
- Scripture/revelation/doctrine: 5.11, n = 9
- Mind/reason/logic: 4.90, n = 10
- Cosmology/science/design: 4.72, n = 18
- General theism/naturalism: 4.08, n = 25
- Resurrection: 1.50, n = 8

The highest observed category is nearly unchanged. Other high-gap categories fall materially, demonstrating that speaker mix explains part—but not all—of the topic pattern.

Repeated-speaker means are not controlled ability estimates. They combine speaker selection, opponent strength, topic, debate format, era, and assessment generation.

## Assessment-generation check

The earlier-generation restriction retains assessment numbers 195 and below. It yields the following topic means:

- Religion/culture/meaning: 7.80, n = 15
- Evil/suffering/hiddenness: 7.64, n = 14
- Scripture/revelation/doctrine: 7.47, n = 17
- Mind/reason/logic: 7.12, n = 17
- General theism/naturalism: 5.79, n = 29
- Morality/ethics: 5.83, n = 18
- Cosmology/science/design: 5.67, n = 21
- Resurrection: 3.93, n = 15

Later-generation cells contain only one to seven debates and are therefore reported only as sensitivity checks. The high-gap cluster exists in the earlier generation and is not created by the later production route.

## Rubric decomposition

For each debate, the six dimension contributions are computed as the non-theist-minus-theist difference in the debate-side importance-weighted dimension mean multiplied by the rubric weight. Burden-completion adjustment differences and rounding residuals are stored separately.

In religion/culture/meaning debates, the mean contributions are:

- Logical coherence: 2.48 score points
- Evidence and warrant: 2.24
- Responsiveness: 1.83
- Calibration and charity: 0.89
- Precision and clarity: 0.71
- Relevance and burden: 0.41

The row sum differs slightly from the official 8.65-point mean because burden adjustment and rounding residual are not included in the displayed heatmap.

## Move-subset diagnostics

The move-level results compare raw dimension means rather than official paired debate margins. They use the already normalized and audited 3,502-move dataset.

| Subset | Evidence/warrant gap | Logic gap | Responsiveness gap | Calibration/charity gap |
|---|---:|---:|---:|---:|
| All scored moves | 8.53 | 7.15 | 6.35 | 8.00 |
| Constructive moves | 8.16 | 7.23 | 2.32 | 7.92 |
| Replies | 8.45 | 6.86 | 7.55 | 7.51 |
| Load-bearing moves | 9.25 | 7.87 | 6.58 | 8.95 |

The highest evidential and calibration gaps occur among moves with the highest importance value. The reply-only responsiveness gap is more than three times the constructive-only gap. These are the main empirical grounds for locating the weakness in load-bearing substantiation and later burden contact.

## Uncertainty method

Bootstrap confidence intervals use 20,000 seeded resamples with replacement. The unit is the debate margin, so the paired side comparison remains intact. Difference intervals independently resample the two descriptive groups before subtracting their bootstrap means. The random seed is `20260901` plus fixed offsets recorded in `analysis.py`.

Method background: Bradley Efron and Robert J. Tibshirani, *An Introduction to the Bootstrap* (Chapman & Hall/CRC, 1993). The implementation is explicit in the repository script and does not depend on a statistics package.

## Claims deliberately not made

- The analysis does not show that topic causes the score difference.
- It does not show that faith, emotion, or theism necessarily produces weak arguments.
- It does not treat every debate in a category as equivalent.
- It does not convert descriptive repeated-speaker means into intrinsic skill rankings.
- It does not claim that AI-generated scores are objective ground truth.
- It does not claim that the eight topic means are all statistically distinct.

The strongest supported conclusion is conditional and diagnostic: in this snapshot, the theist disadvantage is largest where an affirmative case must translate cultural, existential, revelatory, or transcendental considerations into publicly discriminating support; the numerical weakness is concentrated in load-bearing evidence, logic, calibration, and reply responsiveness.

## PDF verification

- Format: US Letter
- Page count: 16
- Figures: 8, drawn as vector graphics
- Fonts: Arial Regular, Bold, Italic, and Bold Italic embedded as TrueType subsets
- PDF metadata: title, author, subject, creator, and creation/modification date set
- Visual review: all 16 pages rendered to raster images and checked for clipping, overlap, illegible labels, and accidental blank pages

