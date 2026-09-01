# Source and report notes

## Reporting job

- Question: Do the theist sides in the corrected SLUGFESTER comparison use more rhetorical, non-falsifiable slogans than the non-theist sides?
- Audience: technical-but-readable SLUGFESTER readers who want the result and enough method detail to audit it.
- Decision-useful answer: determine whether a side difference exists under a transparent proxy, show which component defects produce it, distinguish direct evidence from causal interpretation, and specify a stronger literal-slogan/falsifiability test.
- Source snapshot: the corrected 169-debate position taxonomy plus the locked assessment ledgers at the commit recorded in `results.json`, analyzed September 1, 2026.
- Primary comparison cohort: 2,800 scored moves in 146 debates that expose closed evidence, calibration, and precision findings.
- Full-corpus context: 3,502 moves in all 169 relevant debates retain the fixed evidence/warrant dimension.
- Secondary tag cohort: 1,412 moves in 59 relevant debates with at least one published fallacy or bias tag.
- Primary unit: scored argumentative move; sensitivity checks resample whole debates and also weight speakers equally.

## Required technical-report structure mapping

1. Title -> visible report title and PDF cover.
2. Technical summary -> direct verdict, magnitude, definition, and claim boundary.
3. Key findings with visual evidence -> headline side comparison, component rates, robustness intervals, and tag corroboration.
4. Scope, data, and metric definitions -> separate operational-definition and population sections before interpretive claims.
5. Methodology -> ledger normalization, side mapping, composite rule, paired-debate bootstrap, speaker weighting, and tag restriction.
6. Limitations, uncertainty, and robustness -> role reversal, repeated speakers, selected corpus, partial tag coverage, and construct validity.
7. Recommended next steps -> blinded human coding of slogan form and falsification conditions.
8. Further questions -> topic, tradition, speaker, and cross-worldview tests.

No required role is omitted. The final conclusion returns to the exact hypothesis and separates what is supported from what is inferred.

## Operational definition

The primary measure is deliberately called the **strict slogan-risk proxy**, not a literal slogan detector. A move is flagged only when all three conditions hold:

1. Evidence/warrant is below 70. Under the rubric, assertion, anecdote, authority, selective examples, or speculation carries substantial weight at this level.
2. The closed calibration judgment is `materially-overstated` or `radically-overstated`, meaning the stated force substantially exceeds the supplied support.
3. At least one compression defect is present: unstable terms, unstable scope, or a missing/materially misleading qualification.

This intersection targets the argumentative function of a slogan: a compressed, forceful conclusion doing more work than its warrant. It does not prove that the source wording is a catchphrase, that the proposition is strictly Popperian-unfalsifiable, or that the speaker intended an emotional effect.

## Chart map

1. **Primary side comparison**
   - Question: How often does the strict slogan-risk proxy appear on each side?
   - Form: two direct-labeled bars from zero.
   - Claim: 28.6% of theist moves versus 7.9% of non-theist moves; risk ratio 3.62.
   - Coverage: 2,800 moves, 146 debates.

2. **Component diagnostics**
   - Question: Which component defects create the composite difference?
   - Form: grouped horizontal bars for low warrant, material overclaim, compression deficit, missing qualification, and the strict intersection.
   - Claim: every component is more common on the theist side; the intersection is not driven by one permissive threshold.
   - Coverage: 2,800 moves, 146 debates.

3. **Robustness intervals**
   - Question: Does the side difference survive role, importance, orientation, and speaker checks?
   - Form: dot-and-interval plot in percentage points with a visible zero line.
   - Claim: the difference is positive in every cut. The all-move, constructive, reply, load-bearing, and top-speaker-excluded intervals remain above zero; the 15-debate role-reversal interval crosses zero.

4. **Fallacy/bias corroboration**
   - Question: In the tag-bearing cohort, are epistemic-insulation tags more common on the theist side?
   - Form: grouped bars for any tagged move and the narrower insulation cluster.
   - Claim: theist moves are tagged more often overall (23.5% versus 7.4%) and for the insulation cluster (8.2% versus 1.0%).
   - Coverage: 1,412 moves in 59 tag-bearing debates; explicitly secondary.

5. **Pooled versus speaker-equal weighting**
   - Question: Is the result produced by a few frequent speakers?
   - Form: paired bars for pooled move rates and equal-speaker means.
   - Claim: the theist rate remains much higher after each speaker receives equal weight (28.3% versus 9.2%).

Palette policy: a hard two-root comparison (rust for theist, blue for non-theist) plus neutrals. All bars start at zero; interval plots include a zero reference. Every figure uses direct labels and remains interpretable without color.

## Data quality and validation

- All 169 classified debates map to locked ledger adapters.
- The full corpus contains 3,502 scored moves: 1,746 theist and 1,756 non-theist.
- The closed-findings cohort contains 2,800 moves in 146 debates: 1,393 theist and 1,407 non-theist.
- Required evidence, calibration, precision, side, speaker, move-kind, and importance fields are complete in the primary cohort.
- The primary pooled result is exactly reproducible from `move-diagnostics.csv`: 398/1,393 theist moves and 111/1,407 non-theist moves.
- The paired estimate averages the within-debate theist-minus-non-theist rate difference; its interval uses 20,000 deterministic resamples of whole debates.
- Speaker-equal weighting averages each person's move-level flag rate before comparing the two speaker groups.
- Tag corroboration is restricted to debates with at least one published tag. It is not treated as full-corpus evidence.
- Overall validation assessment: **Share with caveats**.

## Interpretation boundary

The analysis directly establishes a large side difference in a transparent low-warrant/high-force/compression composite. It also shows more fallacy/bias tags associated with epistemic insulation in the partial tag cohort. These findings support the empirical core of the hypothesis: theist-side performances more often contain moves that function like slogans by asserting a broad conclusion more strongly and compactly than their public support permits.

Two further claims remain inferential:

- **Literal non-falsifiability:** the ledgers do not systematically record whether each move states a possible disconfirmation condition or can absorb every outcome without revision.
- **Emotional enforcement:** the assessments do not measure persuasion psychology, audience emotion, social enforcement, or the speaker's private belief-forming process.

The report may defend emotional affirmation as a plausible mechanism, especially where personal experience, hope, identity, or moralized unbelief closes the route to counterevidence, but it must not describe that mechanism as directly measured.

## Reproducibility

- `analysis.py` performs the complete extraction, side mapping, metric construction, whole-debate bootstrap, speaker weighting, tag restriction, and CSV/JSON export.
- `analysis.ipynb` is a standards-compliant, reader-facing notebook companion that mirrors the executed `analysis.py` workflow. The host does not provide Jupyter or `nbformat`, so the notebook has no saved kernel outputs; its code cells were instead validated sequentially with the bundled Python runtime.
- `move-diagnostics.csv` contains every primary-cohort move and its component flags.
- `debate-rates.csv` contains one paired slogan-risk rate difference per debate.
- `tag-diagnostics.csv` contains the secondary tag-cohort denominators and flagged-move counts.
- `artifact.json` is the canonical portable-report input; `report.html` is generated from it.
- `build_pdf.py` creates the final embedded-font PDF from `results.json` using the established SLUGFESTER report style.
