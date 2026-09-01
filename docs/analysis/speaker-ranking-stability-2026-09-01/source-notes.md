# Source notes: *Do Slugfester Rankings Measure Stable Performance?*

## Report identity

- Report date: September 1, 2026
- Corpus snapshot: all 228 assessments published in the repository on that date
- Ranking-eligible one-on-one assessments: 212
- Speaker appearances in those assessments: 424
- Unique recognized speakers: 157
- Public default threshold: at least 3 appearances
- Speakers meeting the default threshold: 42
- Appearances belonging to those 42 speakers: 277
- PDF: `output/pdf/do-slugfester-rankings-measure-stable-performance.pdf`
- Reproduction programs: `analysis.py` and `build_pdf.py` in this directory

## Reporting question

The paper asks whether Slugfester's public speaker rankings measure stable argumentative performance. It separates three claims that the word “stable” can obscure:

1. **Persistent speaker signal:** do observed speakers differ beyond debate-to-debate fluctuation?
2. **Mean reliability:** does averaging more appearances yield a more dependable score estimate?
3. **Rank stability:** would the exact ordinal position remain the same under another reasonable sample or specification?

The main answer is deliberately two-part. The data contain a strong repeatable speaker component, especially among broadly sampled speakers. Exact rank positions remain much less stable because the field is densely packed, samples are often small, and context and metric choice can reorder nearby speakers.

## Public ranking definition reproduced

The analysis reproduces the site's ranking rules rather than creating a parallel eligibility scheme:

- one avatar-recognized speaker must appear on each side;
- scorecards explicitly marked ineligible are excluded;
- multi-speaker and panel approximations are excluded from individual rankings;
- the public default field requires at least three ranking-eligible appearances;
- a speaker's published ranking value is the arithmetic mean of the overall side scores from all matching eligible debates;
- raw ranking ties are resolved by appearance count and then name for display, while statistical correlations use average ranks for exact numeric ties.

The public average does not silently adjust for opponent, topic, side, debate year, or assessment generation. Those are analyzed as context and sensitivity checks.

## Data sources and reconstruction

`analysis.py` calls Node to read the public debate objects and the same avatar-alias resolver used by the site. Each eligible side becomes one appearance row containing:

- debate number and identifier;
- title, label, and motion;
- speaker and opponent;
- pro or con side;
- published score and opponent score;
- within-debate score margin;
- locked assessment generation, reconstructed using the normalization functions from the assessment-scale comparability paper.

The resulting 424-row audit table is `appearances.csv`. The 42-row default ranking with every uncertainty and sensitivity result is `speaker-rankings.csv`. Rankings at minimums 3, 5, and 10 are in `threshold-rankings.csv`.

## Coverage and selection

Appearance counts across the 157 observed speakers are:

| Appearances | Speakers |
|---:|---:|
| 1 | 83 |
| 2 | 32 |
| 3 | 14 |
| 4 | 6 |
| 5 | 3 |
| 6 | 9 |
| 7 | 2 |
| 9 | 1 |
| 10 | 2 |
| 11 | 2 |
| 24 | 1 |
| 26 | 1 |
| 27 | 1 |

Threshold sensitivity:

- at least 1 appearance: 157 speakers;
- at least 3: 42;
- at least 5: 22;
- at least 10: 7.

The default threshold excludes 115 of 157 observed speakers, 73.25%. Fourteen of the 42 ranked speakers, one third of the field, sit exactly at the three-appearance threshold.

## Observed within-speaker variation

Among the 42 currently ranked speakers:

- median within-speaker sample SD: 3.07 score points;
- mean within-speaker sample SD: 3.00;
- pooled within-speaker SD from the one-way decomposition: 3.13;
- median observed minimum-to-maximum range: 7 points;
- speakers with a range of at least 10 points: 12;
- speakers with a range of at least 15 points: 1.

Observed ranges mix real contextual performance differences, opponent and topic selection, assessment-generation effects, and judgment error. They should not be described as pure measurement error.

## One-way random-effects decomposition

The variance model uses the 277 appearances belonging to the 42 default-ranked speakers. For speaker *i* and appearance *j*:

`score_ij = grand_mean + speaker_effect_i + appearance_residual_ij`

The unequal-group one-way analysis gives:

- grand mean: 81.5343;
- effective group size: 6.4723;
- estimated between-speaker variance: 14.6731;
- estimated within-speaker variance: 9.7870;
- between-speaker SD: 3.8305;
- pooled within-speaker SD: 3.1284;
- single-appearance intraclass correlation: 0.5999.

The reliability of a mean based on *n* exchangeable appearances is calculated as:

`between_variance / (between_variance + within_variance / n)`

This yields:

- 3 appearances: 0.8181;
- 5 appearances: 0.8823;
- 10 appearances: 0.9375.

The model treats the catalogue appearances as exchangeable draws around speaker means. That assumption is an approximation because opponents, topics, burdens, and assessment generation were not randomly assigned.

## Split-half reproducibility

The split-half test includes the 19 speakers with at least six appearances, ensuring that both halves contain at least three observed scores. In each of 20,000 seeded iterations, the program independently shuffles every included speaker's observed scores and divides them as evenly as possible into two halves.

For each iteration it computes:

- the Spearman correlation between the two half-sample ranking vectors;
- the overlap between the top five speakers in the two halves.

Results:

- median Spearman correlation: 0.8328;
- mean Spearman correlation: 0.8294;
- central 95% interval: 0.7361 to 0.9059;
- mean top-five overlap: 4.514 of 5;
- probability that all five top speakers match: 54.40%.

This is a reproducibility check within the observed score sets, not a chronological career-stability test and not a prospective forecast.

## Dense rank ordering

At the three-debate minimum, the current top ten are:

| Rank | Speaker | Appearances | Mean score | Mean margin |
|---:|---|---:|---:|---:|
| 1 | Joseph Schmid | 3 | 88.33 | 4.00 |
| 2 | Scott Clifton | 3 | 88.00 | 11.00 |
| 3 | Alex Malpass | 6 | 87.17 | 8.00 |
| 4 | Joe Folley | 4 | 86.50 | 9.00 |
| 5 | Matt Dillahunty | 27 | 86.07 | 11.48 |
| 6 | Bart Ehrman | 11 | 86.00 | 3.91 |
| 7 | Sean Carroll | 3 | 86.00 | 1.33 |
| 8 | Lance Bush | 3 | 85.67 | 3.67 |
| 9 | Alex O'Connor | 26 | 85.54 | 8.04 |
| 10 | Graham Oppy | 10 | 84.80 | 4.30 |

Ordering-density diagnostics:

- rank 1 minus rank 10 mean-score difference: 3.53 points;
- median adjacent mean-score gap across all 42 ranks: 0.327 points;
- adjacent gaps below one point: 38 of 41;
- current top-ten speakers with exactly three appearances: 4.

The calculation of one-decimal averages is arithmetically exact, but the dense ordering means that tiny estimate changes can produce visible ordinal changes.

## Empirical bootstrap rank uncertainty

The empirical bootstrap makes 20,000 seeded draws. Within every speaker, it resamples the observed scores with replacement, recomputes all 42 means, and reranks the full field.

Results:

- median 95% rank-interval width: 11.5 places;
- speakers with width at least 10: 25 of 42;
- distinct top-ten membership sets: 338;
- probability of the modal complete top-ten set: 38.12%.

This bootstrap is conditional on the observed score values. With only three appearances, it can understate uncertainty about unobserved opponents and topics, especially when the three observed scores are narrowly grouped.

## Hierarchical rank uncertainty

The report therefore emphasizes a one-way hierarchical uncertainty model. It uses the pooled within-speaker variance and between-speaker variance above.

For each speaker:

- the small-sample mean is shrunk toward the ranked-field grand mean by the reliability weight;
- posterior variance is `1 / (1 / between_variance + 1 / observation_variance)`, where `observation_variance = within_variance / n`;
- 20,000 seeded draws are made from each speaker's normal latent-mean posterior;
- all 42 latent means are reranked on every draw.

Results:

- median 95% latent-rank interval width: 17.5 places;
- speakers with width at least 10: 35 of 42;
- distinct top-ten membership sets: 1,340;
- probability of the modal complete top-ten set: 21.74%.

Six current top-ten speakers have at least a 90% modeled top-ten probability:

- Joseph Schmid: 97.3%;
- Scott Clifton: 96.0%;
- Alex Malpass: 98.3%;
- Matt Dillahunty: 99.7%;
- Bart Ehrman: 96.5%;
- Alex O'Connor: 97.4%.

Other current top-ten membership probabilities are Joe Folley 89.8%, Sean Carroll 77.5%, Lance Bush 72.0%, and Graham Oppy 73.6%.

The model is a transparent sensitivity framework, not a uniquely correct population model. The normal random-effects and exchangeability assumptions are explicit limitations.

## Sample size and rank uncertainty

Appearance count has a Spearman association of -0.589 with hierarchical rank-interval width.

| Appearance band | Speakers | Median width | Mean width |
|---|---:|---:|---:|
| 3-4 | 20 | 21.5 | 18.85 |
| 5-9 | 15 | 18.0 | 15.53 |
| 10+ | 7 | 10.0 | 10.00 |

Larger samples reduce arithmetic uncertainty but do not guarantee representative opponent or topic coverage.

## Leave-one-debate-out sensitivity

For each speaker, the program removes one observed score at a time, recomputes only that speaker's mean, and reranks it against the other 41 fixed raw means. The field is retained for diagnosis even when removing one of a three-appearance speaker's debates would make that speaker publicly ineligible.

Results:

- median best-to-worst leave-one-out rank span: 4 places;
- speakers with a span of at least 5: 19 of 42;
- largest span: Ross Douthat, 24 places;
- other large spans include Ben Watkins 21, Lawrence Krauss 17, David Wood 14, and Michael Shermer and Richard Carrier 11 each.

This check is deterministic and conditioned on the observed debates. It is a minimum influence warning rather than a complete uncertainty model.

## Context and metric sensitivity

### Within-debate margin

Mean margin ranks each speaker by `speaker score - opponent score` rather than by absolute score. It asks a different reasonable question: relative performance inside the same assessed debate.

- Spearman correlation with raw ranking: 0.8787.
- Current top-ten overlap: 7 of 10.
- Sean Carroll moves from raw rank 7 to margin rank 21.
- Michael Shermer moves from 19 to 6.
- Richard Dawkins moves from 18 to 8.
- Joseph Schmid moves from 1 to 10.

Neither raw score nor margin is declared uniquely correct. The disagreement shows that ordinal rankings depend partly on which performance construct is chosen.

### Assessment-generation centering

The 358 earlier-generation appearances average 81.3240. The 66 later-generation appearances average 78.1667. Each appearance is centered on its generation mean and restored to the all-appearance mean before speaker averages are recomputed.

- Spearman correlation with raw ranking: 0.9855.
- Current top-ten overlap: 10 of 10.
- Largest observed movement: Richard Dawkins, rank 18 to 12.

### Random-effects shrinkage

Each raw speaker mean is shrunk toward the 42-speaker grand mean using the sample-size-specific reliability weight.

- Spearman correlation with raw ranking: 0.9981.
- Current top-ten overlap: 10 of 10.
- Largest observed movement: 2 places.

These two measurement-focused adjustments preserve the broad raw ranking. The larger sensitivity is to the substantive distinction between absolute score and relative within-debate margin.

## Claims not made

The paper does not claim that:

- rank reflects philosophical truth, subject expertise, persuasion, intelligence, or personal worth;
- the selected catalogue is a random sample of speakers or debates;
- within-speaker score variation is pure model error;
- a high intraclass correlation proves the exact ordering is correct;
- hierarchical intervals are assumption-free confidence intervals for all future debates;
- random split halves test career development or chronological stability;
- the margin ranking should silently replace the public raw-score ranking.

## Figure map and chart rationale

The 16-page PDF contains 11 vector figures:

1. **Eligibility thresholds:** horizontal bars for the number of speakers retained at minimums 1, 3, 5, and 10.
2. **Observed score ranges:** interval-and-dot plot for selected repeated speakers spanning sample sizes and variability.
3. **Reliability by sample size:** zero-based horizontal bars for one score and means of 3, 5, and 10.
4. **Split-half reproducibility:** point and interval for rank correlation with a directly labeled top-five-overlap result.
5. **Current top-ten means:** focused-scale dot plot because the analytical question is separation among tightly clustered values; the focused scale is stated in subtitle and caption.
6. **Top-fifteen rank intervals:** horizontal interval plot with current raw rank marked directly.
7. **Appearances versus rank uncertainty:** 42-observation scatter, with top-ten status encoded by fill and prolific speakers labeled.
8. **Top-ten membership probability:** zero-based horizontal bars for the current top fifteen.
9. **Leave-one-out spans:** horizontal best-to-worst rank intervals with current raw rank marked.
10. **Raw versus margin rank:** dumbbell plot for the 12 largest specification shifts.
11. **Alternative-metric agreement:** focused-scale dot plot of rank correlations, with top-ten overlap printed beside every point.

The report uses a single blue-root palette for simple magnitude and interval charts, with rust as the single comparator or focal state. All charts include direct labels or non-color encodings. Standard magnitude bars begin at zero. Focused scales are used only for dense score or high-correlation comparisons and are disclosed visibly.

## Required technical-report structure

- Title: page 1.
- Technical summary: page 2.
- Definitions and interpretive boundary: page 3.
- Key findings with visual evidence: pages 4-14.
- Scope, data, and metric definitions: pages 3-4.
- Methodology: pages 6-7, 9, and 15.
- Limitations, uncertainty, and robustness checks: pages 4, 7, 9-15.
- Recommended next steps: pages 15-16.
- Further question: prospective prediction after the next corpus reassessment, stated on pages 15-16.

## PDF quality assurance

- Final length: 16 US Letter pages.
- Figures: 11, all vector ReportLab drawings.
- Fonts: Arial regular, bold, italic, and bold italic; all are embedded, subset, and Unicode-mapped.
- Visual review: every page rendered to PNG and inspected in a 4-by-4 montage; chart-heavy pages and the conclusion were reviewed at original resolution.
- Integrity: Ghostscript null-device parsing and Poppler text extraction are required to pass before handoff.
- Reproduction: `analysis.py` and `build_pdf.py` compile and regenerate the CSV files, JSON results, and PDF from repository data.

## Recommended next test

Keep the raw average as an auditable descriptive measure, but pair exact place numbers with uncertainty bands or sample-qualified tiers. After the planned roughly twice-yearly full-corpus reassessment, rerun the complete analysis under the updated scoring protocol. Then freeze the resulting bands and test them prospectively against scores from newly added debates. That prospective stage is the strongest test of whether the present speaker signal predicts performance outside the cases used to construct it.
