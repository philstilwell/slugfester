# Source notes: *Debates Are Usually Lost Without a Named Fallacy*

## Report identity

- Report date: September 1, 2026
- Corpus snapshot: all 228 assessments published in the repository on that date
- Decisive assessments: 220
- Tied assessments excluded from winner-loser classification: 8
- Public move cards: 4,659
- Assessments with locked ledgers: 212, of which 204 are decisive
- PDF: `output/pdf/debates-are-usually-lost-without-a-named-fallacy.pdf`
- Analysis and PDF programs: `analysis.py` and `build_pdf.py` in this directory

## Question and operational definition

The paper asks whether the lower-scoring side in a decisive assessment usually receives no accepted named-fallacy tag. A side is “lower-scoring” when its published overall score is lower than its opponent's. A side “has a named fallacy” when at least one of its public move cards contains a nonempty fallacy annotation.

“Named fallacy” is intentionally narrower and more accurate than “formal fallacy.” A formal fallacy is an invalid logical form; the public inventory instead contains six mainly informal, pattern-level labels: equivocation, red herring, argument from ignorance, begging the question, appeal to authority, and special pleading. The absence of one of these labels is not evidence that every inference is valid or that the argument is otherwise strong.

Fallacy and cognitive-bias annotations are separate metadata. They are not direct point deductions and are not inputs added to the numerical score after the rubric has been evaluated.

## Data sources and reconstruction

The analysis reads the repository's public debate data and move cards through a Node extraction subprocess. It imports the cohort-normalization and locked-ledger reconstruction functions used by the earlier corpus paper so that publication cohorts and the six score dimensions are defined consistently across reports.

For each assessment, the analysis records:

- published side scores and absolute margin;
- winner, lower-scoring side, or tie;
- move counts, fallacy-tagged move counts, and fallacy-tag instances by side;
- bias-tag presence by side;
- publication/assessment cohort;
- for locked decisive assessments, each rubric dimension's importance-weighted contribution to the published winner-loser margin.

The complete 228-row debate table is `debate-outcomes.csv`. The 204 locked decisive decompositions are in `dimension-debate-decomposition.csv`.

## Primary results

Across 220 decisive assessments:

- 146 lower-scoring sides have no named fallacy: 66.36%.
- The Wilson 95% interval is 59.89% to 72.28%.
- 137 debates have no named fallacy on either side: 62.27%.
- Only the lower-scoring side is tagged in 45 debates.
- Only the higher-scoring side is tagged in 9 debates.
- Both sides are tagged in 29 debates.
- 140 lower-scoring sides have neither a fallacy tag nor a cognitive-bias tag: 63.64%.

Relative fallacy-tagged move counts point toward the lower-scoring side imperfectly:

- lower side has more tagged moves: 62 debates;
- equal tagged-move counts: 145 debates;
- lower side has fewer tagged moves: 13 debates.

The equality count is dominated by 137 zero-versus-zero cases.

## Score associations

Across 4,659 public move cards:

- 243 moves contain at least one fallacy tag, a tagged-move rate of 5.22%;
- 249 fallacy instances occur because a few moves carry more than one label;
- tagged moves average 72.81 points;
- untagged moves average 80.66 points;
- tagged minus untagged difference: -7.85 points.

At debate level:

- lower-side untagged losses have a mean margin of 6.23 and median of 6.0;
- lower-side tagged losses have a mean margin of 8.39 and median of 7.5;
- tagged minus untagged mean-margin difference: 2.17 points;
- the 20,000-draw seeded debate-level bootstrap 95% interval for that difference is 0.66 to 3.69 points.

These are descriptive associations, not isolated causal effects. The same argumentative weakness can both lower a rubric score and justify a fallacy label.

## Annotation-cohort sensitivity

Three annotation environments coexist:

| Cohort | Debates | Decisive | Public moves | Tagged moves | Tagged-move rate | Fallacy-free lower sides |
|---|---:|---:|---:|---:|---:|---:|
| Earlier closed-findings | 179 | 172 | 3,423 | 65 | 1.90% | 139/172 = 80.81% |
| Later standalone | 33 | 32 | 1,026 | 136 | 13.26% | 4/32 = 12.50% |
| Published without locked ledger | 16 | 16 | 210 | 42 | 20.00% | 3/16 = 18.75% |

The corresponding Wilson 95% intervals for the fallacy-free lower-side share are:

- earlier closed-findings: 74.28% to 86.00%;
- later standalone: 4.97% to 28.07%;
- public without locked ledger: 6.59% to 43.01%.

Equal-weighting the earlier and later locked generations produces a fallacy-free-loss share of 46.66%. This is not offered as a superior corpus estimate, because cohort size and selection differ. It is a sensitivity test showing that the aggregate word “usually” depends on the current cohort mixture and annotation density. The robust conclusion is structural: a named fallacy is not required for the rubric to produce a decisive loss.

Within each cohort, tagged moves still score lower on average:

- earlier closed-findings: 72.46 tagged versus 81.09 untagged, a difference of -8.63;
- later standalone: 72.85 versus 78.57, a difference of -5.73;
- public without locked ledger: 73.21 versus 82.97, a difference of -9.76.

Side-level score/fallacy-rate correlations are negative in all three cohorts: -0.273, -0.441, and -0.650, respectively.

## Named-fallacy inventory

| Label | Instances | Debates | Mean tagged-move score |
|---|---:|---:|---:|
| Equivocation | 64 | 48 | 72.44 |
| Red herring | 55 | 30 | 71.60 |
| Argument from ignorance | 43 | 31 | 74.21 |
| Begging the question | 38 | 28 | 73.45 |
| Appeal to authority | 27 | 17 | 73.67 |
| Special pleading | 22 | 18 | 69.59 |

These label means are an inventory, not a severity ranking; speaker, topic, role, cohort, and move importance are not controlled.

## Rubric decomposition

The 204 decisive locked ledgers permit a complete reconstruction of how the six rubric dimensions contribute to the official margin.

Among 143 locked losses in which the lower side has no named fallacy, the mean margin is 6.31 points. Mean contributions to the higher-minus-lower margin are:

- logical coherence: 1.77 points, favoring the higher side in 137 debates;
- evidence and warrant: 1.59, favoring it in 135;
- responsiveness: 1.38, favoring it in 129;
- calibration and charity: 0.84, favoring it in 123;
- precision and clarity: 0.58, favoring it in 118;
- relevance and burden: 0.14, favoring it in 89.

Among 61 locked losses in which the lower side is tagged, the mean margin is 8.41. Corresponding contributions are 2.56, 2.20, 1.54, 1.07, 0.67, and 0.42 points.

The cumulative shape is the paper's central explanatory result:

- 108 of 143 fallacy-free lower sides, 75.52%, trail on at least five of six dimensions;
- 60 of 143, 41.96%, trail on all six;
- positive-dimension count distribution: two dimensions in 1 case, three in 7, four in 27, five in 48, and six in 60.

This shows how an argument can lose without a categorical defect: several modest shortfalls in warrant, coherence, responsiveness, calibration, precision, and burden completion add up under the weighted scoring system.

## Illustrative cases

The report charts the ten largest decisive margins in which neither side has a named-fallacy tag. The top cases include:

- Slick-Clifton, objective morality, 70-89: prescriptions are stated rather than justified; secular alternatives and the is-ought bridge are not fully answered.
- Fischer-Dillahunty, evidence for God, 68-86: conceivability is asked to establish necessity; testimonial evidence is admitted without completing reliability or attribution burdens.
- Jones-Dillahunty, quantum idealism, 69-86.
- Dyer-Malpass, transcendental argument, 74-91.
- Howitt-Dillahunty, Christianity true, 71-88.
- Bush-McAllister, moral realism, 76-90: epistemic access is blurred with a standard's truth-maker; convergence and collapse claims remain under-documented.
- Atkins-Fox, God and science, 70-85: scientific skepticism becomes categorical overreach; religion is treated too uniformly and the evidential scope is overstated.

The Atkins-Fox case has the non-theist side lower by 15 points, demonstrating that the mechanism is not tied to one worldview.

## Statistical choices

- Proportions use Wilson 95% intervals.
- Means and mean differences use 20,000 seeded bootstrap draws resampling whole debates within the relevant group.
- The bootstrap seed is fixed in `analysis.py` for deterministic reproduction.
- Cohorts are always shown separately when annotation density could affect interpretation.
- Dimension contributions reproduce the public weighted score structure from locked ledgers; tiny rounding residuals are reported rather than silently redistributed.

## Claims not made

The paper does not claim that:

- the 146 untagged lower-side arguments are logically valid;
- the six-label inventory exhausts weak or invalid reasoning;
- tags cause score differences independently;
- the aggregate 66.4% is a uniform-protocol population estimate;
- the selected debate corpus generalizes automatically to all public argument;
- one public move card always isolates one sentence-level inference.

## Figure map and design rationale

The 16-page PDF contains 11 vector figures:

1. Central 146-of-220 fallacy-free-loss share.
2. Cohort contrast between debate-level absence and move-level tag density.
3. Mutually exclusive tag-presence patterns by side.
4. Tagged versus untagged move means within each cohort.
5. Mean loss margins with bootstrap intervals.
6. Fallacy-free share by score-margin band.
7. Counts of the six named labels.
8. Relative lower-side tagged-move counts by cohort.
9. Mean rubric-dimension contributions by lower-side tag status.
10. Number of dimensions favoring the higher-scoring side in fallacy-free losses.
11. Ten largest losses with no named fallacy on either side.

Bars are used for counts and proportions from a shared zero baseline. Dumbbell plots are used when the analytical task is to compare two values on one scale. Point-interval plots display uncertainty without implying distributions the data do not establish. Exact values and sample sizes appear directly beside marks where practical.

## Required report structure

- Title and scope: pages 1 and 4.
- Technical summary: page 2.
- Definitions and conceptual boundary: page 3.
- Primary evidence and robustness: pages 5-13.
- Concrete cases: page 14.
- Methods, uncertainty, limitations, and next test: page 15.
- Strong conclusion and recommended practice: page 16.

## PDF quality assurance

- Final length: 16 US Letter pages.
- Figures: 11, all generated as vector ReportLab drawings.
- Fonts: Arial regular, bold, italic, and bold italic; all are embedded, subset, and Unicode-mapped.
- Rendering: every page rendered to PNG and reviewed in a 4-by-4 montage; chart-heavy and concluding pages were also reviewed at original resolution.
- Integrity: Ghostscript completed a null-device parse without errors; `pdftotext` recovered the central counts, qualifications, date, and conclusion.
- Reproduction: `analysis.py` and `build_pdf.py` compile successfully and regenerate the tables and PDF from the repository data.

## Next test and further questions

The strongest next test is a full-corpus reassessment under one locked fallacy inventory and one annotation protocol, with independent repeated judgments and an explicit audit of no-tag decisions. Subsequent work should ask whether the same cumulative-loss pattern holds after every debate is reviewed at the later annotation density; whether particular rubric dimensions predict tag assignment after controlling for cohort; and whether speaker-level repeated measures change the estimated margin association.
