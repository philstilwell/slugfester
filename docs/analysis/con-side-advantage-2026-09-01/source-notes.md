# Source and methods notes

## Reporting job

- Question: Does the raw CON-side score advantage in Slugfester represent an inherent advantage of opposing a motion?
- Audience: Technical readers and methodologically interested site readers.
- Decision supported: Whether PRO/CON labels should be interpreted as a scoring bias or formal-role effect, and what follow-up design could identify such an effect.
- Snapshot: September 1, 2026.
- Primary cohort: 213 one-on-one assessments with locked ledgers, 426 speaker appearances, and 4,497 scored moves.
- Comparison basis: Within-debate CON minus PRO score, where positive values favor CON.

## Sources

1. `src/data/debates.js` for public titles, motions, labels, sides, and scores.
2. `docs/assessment-ledgers/*.json` for the 213 locked one-on-one assessment ledgers.
3. `docs/analysis/assessment-generation-comparability-2026-09-01/analysis.py` for the locked-ledger normalization adapter and six-dimension definitions.
4. `docs/analysis/theist-argument-weaknesses-2026-09-01/debate-decomposition.csv` for the previously established 169-debate theist/non-theist subset and theist-side orientation. This classification predates the present role test.

## Metric definitions

- Raw CON advantage: mean of `(CON overall score - PRO overall score)` across debates.
- Direction count: number of debates with CON higher, PRO higher, or tied.
- Crossover speaker estimate: for each speaker observed on both sides, mean CON score minus mean PRO score; the primary bridge weights each speaker equally.
- Weighted speaker fixed effect: within-speaker regression coefficient for CON after removing each speaker's average score. Only crossover speakers identify the coefficient.
- Generation-adjusted score: an appearance score centered to remove the mean difference between the earlier closed-findings and later standalone generations. This is a sensitivity check, not a full calibration model.
- Dimension gap: mean within-debate difference between CON and PRO move-level dimension averages.
- Confidence intervals: 20,000 nonparametric bootstrap draws at the stated unit. Debate estimates resample debates; equal-speaker bridge estimates resample crossover speakers.
- Sign test: exact two-sided binomial test among non-tied units. It is descriptive evidence against a 50/50 direction split, not evidence of a causal role effect.

## Report structure mapping

1. Title and answer-first subtitle.
2. Technical summary.
3. Key findings with visual evidence: raw gap, outcome directions, assessment generations, proposition alignment, speaker bridge, dimension profile, sensitivity estimates, and counterexamples.
4. Scope, data, and metric definitions.
5. Methodology and identification logic.
6. Limitations, uncertainty, and robustness checks.
7. Recommended next steps.
8. Further questions and strong conclusion.

## Chart map

| Report segment | Analytical question | Family / form | Fields | Supported claim | Palette policy |
|---|---|---|---|---|---|
| Raw result | How large is the published side gap? | Comparison / paired bars | PRO mean, CON mean | CON is 4.69 points higher in the raw corpus | Hard two-root cap |
| Direction count | How often does each side score higher? | Composition / 100% stacked bar | CON higher, PRO higher, ties | CON is higher in 159 of 213 debates | Hard two-root cap |
| Generation check | Does the gap exist in both assessment generations? | Uncertainty / dot and interval | Cohort estimates and 95% intervals | The raw gap persists in both generations | Single-root preferred |
| Position alignment | Does the effect follow formal role or substantive position? | Uncertainty / diverging dot and interval | Theist-PRO, theist-CON, outside-set estimates | The nominal CON effect reverses when theist claims move to CON | Hard two-root cap |
| Corpus composition | How asymmetrically is the theist position assigned? | Composition / stacked bar | 149 PRO, 20 CON | 88.2% of classified theist sides occupy PRO | Hard two-root cap |
| Crossover speakers | What happens within stable speaker identity? | Uncertainty / ordered dot plot | 29 speaker role differences | The equal-speaker gap shrinks to 1.00 | Single-root preferred |
| Dimension profile | Where does the raw side gap appear in the rubric? | Comparison / horizontal interval bars | Six paired dimension gaps | Raw CON differences are broad, not a single rubric switch | Single-root preferred |
| Identification ladder | How estimates change under controls | Uncertainty / forest plot | Raw, subset, reweighting, speaker estimates | Stronger controls sharply reduce the role estimate | Hard two-root cap |
| Counterexamples | Are substantial PRO wins present outside the main confound? | Comparison / diverging bars | Largest outside-set margins | Formal role is not destiny | Hard two-root cap |

## Visual QA contract

- Static ReportLab PDF is the single delivery surface requested for this paper series.
- Every figure has a neutral descriptive title, sample or unit context, a source note, and adjacent explanatory prose.
- Absolute-score bars start at zero; diverging gaps use a visible zero line.
- Blue denotes CON-favoring estimates, rust denotes PRO-favoring estimates, and gold is reserved for composition or uncertainty emphasis. Labels and signs carry meaning without relying on color alone.
- Figures are full-width when labels or intervals require space. All figures are inspected after final PDF rendering.

## Main interpretation

The raw CON-side advantage is an accurate description of this corpus. It is not, by itself, an estimate of what formal role would do if the same speaker and proposition were randomly assigned to PRO or CON. The role-only explanation loses force because the sign reverses when the theist position occupies CON, the estimate becomes small and uncertain outside the prior 169-debate classification, and the within-speaker bridge is also small and uncertain. The best-supported current interpretation is compositional: motions and speakers are not symmetrically assigned to nominal sides.

## Decisive follow-up

Pre-register a blinded polarity-reversal experiment. Select balanced motions from several topics, create logically equivalent affirmative and negative phrasings, randomize speaker or transcript versions to PRO and CON labels, score both versions under one locked model/rubric generation, and test whether a residual side coefficient remains after proposition and speaker identity are held constant. A persistent CON coefficient in that design would support an inherent role or scoring-label effect; a near-zero coefficient would support the present compositional account.
