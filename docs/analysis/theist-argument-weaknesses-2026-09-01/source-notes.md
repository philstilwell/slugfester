# Source and report notes

## Reporting job

- Question: Are the theistic sides scoring lower because their arguments are incompletely or sloppily substantiated, and where do the weaknesses occur?
- Audience: product stakeholders / general SLUGFESTER readers.
- Decision-useful answer: identify the rubric dimensions and recurring move-level defects that produce the score gap, while separating that diagnosis from a causal theory about faith.
- Source snapshot: the corrected 169-debate position taxonomy plus the locked assessment ledgers at commit `32c4176bc913bcbf0879f468f529525057f5e146`, reviewed September 1, 2026.
- Unit: the primary decomposition uses one section- and importance-weighted dimension mean per debate side; move-level rates are descriptive supporting evidence.
- Comparison: non-theistic/skeptical side minus theistic/religious side.

## Required executive-report structure mapping

1. Title → report title block.
2. Executive Summary → visible `Executive Summary` block directly after the title.
3. Key findings with visual evidence → dimension-contribution chart, evidence-band comparison, response and calibration findings, and concrete examples.
4. Recommended next steps → blind premise-source coding and a matched causal audit.
5. Further questions → topic, speaker, premise source, and human-rater questions.
6. Caveats and assumptions → visible final caveat block.

No required role is omitted. Definitions appear before the first quantitative finding.

## Chart contract

- Report segment: “Where the 6.35-point gap comes from.”
- Analytical question: How much does each fixed rubric dimension contribute to the paired overall score gap?
- Takeaway: logical coherence and evidence/warrant account for 1.81 and 1.71 points respectively, followed by responsiveness at 1.30.
- Family and variant: additive driver comparison; horizontal categorical bar.
- Data sufficiency: six exhaustive fixed-weight dimensions, one mean paired contribution per dimension, 169 debates.
- Artifact chart: native `bar`, dimension on the category axis, score-point contribution on the quantitative axis, direct value labels enabled.
- Palette: single-root blue; no redundant legend.
- Non-color distinction: direct dimension labels and exact contribution labels.
- Final surface: self-contained portable HTML report; QA in packaged desktop and narrow browser verification.

The chart is a decomposition, not six independent correlations. The six bars plus the −0.06 rounding residual reproduce the 6.35-point mean official gap; the burden-completion adjustment is zero in all 338 side records.

## Data quality and validation

- All 169 classified debates have a public adapter ledger.
- The analysis covers 3,502 scored moves: 1,746 theist-side moves and 1,756 non-theist-side moves.
- It checks all 3,502 move scores, 1,778 side-section scores, and 338 side-overall scores against their deterministic ledger outputs.
- Section weights sum to 100 in every debate, all calculated move IDs match the judgment inventory, and no dimension values are missing.
- The six contribution means, zero adjustment gap, and rounding residual reconcile exactly to the corrected 6.349112426-point mean official margin.
- The earlier position taxonomy had debate 191 oriented incorrectly; the intelligent-design side is the theist side. Correcting it changes the outcome count from 144–5–20 to 145–5–19 and the mean margin from 6.3373 to 6.3491.
- Ledger presentation varies: 146 debates expose closed calibration, response-class, precision, and charity findings; 23 later standalone ledgers expose the same six final dimensions but not those closed subfields. Subfield rates therefore use the 146-debate cohort and are labeled accordingly.
- Overall validation assessment: **Share with caveats**.

## Diagnostic interpretation

- A score below 70 in evidence/warrant has a defined rubric meaning: assertion, anecdote, authority, selective examples, or speculation carries substantial weight; below 50 means a fact-dependent conclusion is effectively unsupported or contradicted in the source.
- A calibration finding of `slightly-overstated`, `materially-overstated`, or `radically-overstated` means the asserted force exceeds the supplied warrant by the corresponding amount.
- Strong reply contact combines `full-answer`, `diagnostic-defeat`, and `justified-reframe`; the complement consists of partial answers and relevant or complete nonanswers.
- Defects are not double-counted. The rubric gives each weakness one primary home unless a separate transcript-grounded consequence exists.

## Causal boundary

The data diagnose what was weak in the scored transcript performances. They do not measure faith commitment, private epistemic standards, preparation, topic difficulty, or how the same speaker would argue under a different worldview. Therefore they support “substantiation, inference, response, and calibration weaknesses are concentrated on the theist side in this corpus,” but not “faith caused those weaknesses.”

A direct causal test would blind-code premise source and evidential standard before revealing side, match claims by topic and burden, and model whether faith-sourced premises predict lower warrant after controlling for speaker, role, and debate.

## Reproducibility

- `analysis.py` loads the corrected taxonomy and every relevant locked ledger, derives or reads the six final dimension values, validates the deterministic score path, and writes `results.json`, `dimension-contributions.csv`, `debate-decomposition.csv`, and `move-diagnostics.csv`.
- `analysis.ipynb` is the reader-facing notebook companion.
- The host does not include a native Jupyter execution stack. The notebook's code cells mirror the companion script, and each displayed result is copied from a successful sequential execution of that script and checked against `results.json`.

