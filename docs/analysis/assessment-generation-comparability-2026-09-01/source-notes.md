# Source and report notes

## Reporting job

- Question: Do the 228 published SLUGFESTER debate assessments behave as though their absolute scores, dimension values, and rhetorical annotations were produced on one comparable scale?
- Audience: technical readers and general SLUGFESTER readers who need to know which corpus comparisons are defensible.
- Decision-useful answer: retain within-debate paired comparisons, but stratify or calibrate absolute scores, dimension distributions, speaker averages, and rhetorical-tag rates by assessment generation.
- Source snapshot: repository commit `75784aa6947e6798b71ab3117817217dace630ba`, reviewed September 1, 2026.
- Scope: 228 published assessments; 212 with locked ledgers; 4,449 locked moves; 4,659 public move cards.
- Comparison: the 179 earlier closed-findings ledgers (assessment numbers 1-195) versus the 33 later standalone ledgers (196-228).
- Success criterion: the report must distinguish evidence of non-comparability from causal identification of a protocol effect.

## Required technical-report structure mapping

1. Title -> cover page.
2. Technical summary -> page 2.
3. Key findings with visual evidence -> pages 5-11: overall score level, assessment-number blocks, repeated-speaker bridge, dimension means, correlation structure, and tag coverage.
4. Scope, data, and metric definitions -> pages 3-4.
5. Methodology -> page 15 and the reproducible analysis files.
6. Limitations, uncertainty, and robustness checks -> pages 8 and 13.
7. Recommended next steps -> page 14, including the roughly twice-yearly reassessment cycle.
8. Further questions -> page 14, under “Questions the next bridge must answer.”

No required role is omitted. The final page states the strong practical conclusion after the evidence and limitations have been presented.

## Metric and cohort definitions

- Overall side score: the published calculated score for one side of one locked-ledger debate.
- Earlier generation: a ledger adapter containing `scoringJudgment` and closed precision, calibration, charity, and response findings.
- Later generation: an adapter pointing to a standalone final ledger with two isolated judgments and resolved final dimensions.
- Mean side score: the arithmetic mean across pro and con side scores in the selected generation.
- Repeated-speaker bridge: for each named speaker present in both generations, later-generation mean side score minus earlier-generation mean side score.
- Tagged-move rate: public move cards with at least one rhetorical tag divided by all current public move cards in the cohort.
- Principal-component share: proportion of standardized six-dimension variance explained by the first principal component.

## Chart map

1. Mean overall side score by assessment generation
   - Question: Is there a global score-level difference?
   - Family: absolute category comparison; zero-based bars.
   - Data: two cohort means and full cohort denominators.
   - Takeaway: later assessments average 3.16 points lower.
   - Palette: blue for earlier, gold for later; exact labels.

2. Mean side scores across assessment-number blocks
   - Question: Is the shift gradual or concentrated at the generation boundary?
   - Family: ordered discrete-period comparison; focused-scale bars rather than an underpowered trend line.
   - Data: twelve assessment-number blocks, each with debate count.
   - Takeaway: the largest break occurs between 176-195 and 196-205.
   - Honesty cue: visible 74-84 focused scale and direct values.

3. Repeated-speaker bridge
   - Question: Does the difference survive partial control for speaker identity?
   - Family: signed horizontal difference bars.
   - Data: all 31 speakers present in both generations.
   - Takeaway: 26 of 31 shift lower; mean -2.81 points.
   - Palette: rust for negative, teal for positive; zero line and signed labels.

4. Move-level dimension means
   - Question: Is the level shift confined to one rubric dimension?
   - Family: paired dot-and-interval comparison.
   - Data: six dimension means in each generation.
   - Takeaway: every later-generation mean is lower.
   - Honesty cue: visible focused 64-90 scale and exact labels.

5. Correlation of relevance/burden with other dimensions
   - Question: Does the internal meaning of the six-number profile change?
   - Family: paired correlation dumbbells.
   - Data: five Pearson correlations per generation; self-correlation omitted.
   - Takeaway: later relevance/burden scores are much more tightly coupled to every other dimension.

6. Rhetorical-tag coverage
   - Question: Are tag frequencies directly comparable across publication generations?
   - Family: zero-based categorical bars.
   - Data: all 4,659 current public move cards in three ledger-coverage cohorts.
   - Takeaway: later locked-ledger cards are tagged at 7.2 times the earlier rate; public-only cards are higher still.

All figures are vector drawings embedded directly in the PDF. Titles are neutral; the adjacent paragraphs carry interpretation and limitations.

## Data quality and validation

- All 212 ledger adapters have unique debate numbers and map to a published assessment.
- Cohort counts reproduce 179 earlier and 33 later locked ledgers.
- Every locked ledger identifies model `5.6 Sol` and rubric `Slugfester Reassessment Rubric v2`.
- The normalized move population contains 4,449 moves, with no missing dimension values and no duplicated move ID within a debate.
- The public rendering contains 4,659 move cards across 228 assessments.
- The analysis preserves both sides of a debate during the 20,000-sample bootstrap by resampling debate-level means.
- Speaker alias normalization is limited to `Joshua Rasmussen` -> `Josh Rasmussen`, the only observed cross-generation naming mismatch needed for the bridge.
- PDF visual review covered all 16 rendered pages; key chart, table, cover, and conclusion pages were inspected at full resolution.
- PDF fonts are embedded and subsetted: Arial regular, bold, italic, and bold italic.

## Causal boundary

Assessment generation is perfectly confounded with assessment number: earlier ledgers end at 195 and standalone ledgers begin at 196. Debate selection, motion, speaker role, format, and inventory procedure can therefore differ with generation. The report supports “direct cross-generation comparability is doubtful” but not “the standalone production route alone caused the difference.”

The repeated-speaker bridge weakens a pure speaker-composition explanation but is not an identical-performance rescore. The decisive follow-up is to score the same frozen transcripts and move inventories under both systems, then compare the result with blinded expert-human judgments.

## Reassessment policy

The report explicitly records the intended roughly twice-yearly reassessment cycle, conditional on meaningful AI-model improvements. “More objective” is defined operationally: stronger evidence constraints, explicit rules, repeatability, isolated judgments, disagreement adjudication, and public version-to-version calibration. Each rerun should archive rather than overwrite prior vintages.

## Reproducibility

- `analysis.py` loads and validates the ledger and public-rendering sources, writes `results.json`, and exports six audit CSV files.
- `build_pdf.py` reads only `results.json` for numerical claims and produces the vector PDF.
- `results.json` records the exact repository commit and all reported statistics.
- The final PDF is written to `output/pdf/are-all-slugfester-assessments-on-the-same-scale.pdf`.
