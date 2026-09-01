# Source and report notes

## Reporting job

- Question: Do the published debate assessments evidence consistently stronger non-theistic arguments than theistic arguments?
- Audience: product stakeholders / general SLUGFESTER readers.
- Decision-useful answer: distinguish a real corpus pattern from claims about worldview truth or a representative population.
- Source snapshot: `src/data/debates.js` at commit `179605addbb65ebf36e61f84ef35017eded7c783`, reviewed September 1, 2026.
- Unit: one current-method dyadic debate. Section comparisons are nested corroboration.
- Comparison: non-theistic/skeptical side score minus theistic/religious side score.

## Required executive-report structure mapping

1. Title → report title block.
2. Executive Summary → visible `Executive Summary` block directly after the title.
3. Key findings with visual evidence → outcome chart, interpretation, and robustness table.
4. Recommended next steps → orientation-blind audit and structured stance metadata.
5. Further questions → burden, selection, repeated-speaker, and human-rater questions.
6. Caveats and assumptions → visible final caveat block.

No required role is omitted. Definitions are merged into the first findings section so they appear before the chart and table evidence.

## Chart contract

- Report segment: “The gap is large at both debate and section level.”
- Analytical question: How often does each side receive the higher overall debate score?
- Takeaway: The non-theistic side scores higher in 144 of 169 classified debates.
- Family and variant: comparison and ranking; horizontal categorical bar.
- Data sufficiency: 3 mutually exclusive outcome categories covering all 169 debates; exact counts and shares retained.
- Artifact chart: native `bar`, nominal outcome on x, debate count on y, horizontal orientation, value labels enabled.
- Palette: single-root blue plus neutrals; no color field or redundant legend.
- Non-color distinction: direct category labels and exact value labels.
- Final surface: self-contained portable HTML report; QA in the packaged desktop and narrow browser verifier.

The chart has only three categories because they exhaust the exact win/tie/loss comparison. A trend or scatter would be misleading; the report uses a table for the more technical sensitivity estimates.

## Data quality and validation

- 226 published debates found; 210 current-method dyads and 16 team/panel assessments.
- The 16 team/panel debates are excluded because their published method treats the score as an approximate combined side result.
- Of 210 dyads, 169 meet the position-level comparison definition; all 41 exclusions and all 169 orientations are listed in `taxonomy.csv`.
- No duplicate debate IDs or numbers; no missing overall scores or section sets; all checked scores are within 0–100.
- Primary debate arithmetic was recomputed independently in JavaScript before the Python artifact was written.
- The Python analysis asserts all corpus counts and recomputes debate, section, orientation, pair, and speaker sensitivities from source.
- Overall validation assessment: **Share with caveats**.

## Omitted or bounded analyses

- No causal claim: side orientation and argumentative burden are not randomized.
- No population p-value in the reader-facing report: the catalogue is selected rather than sampled randomly. The exact sign-test result is retained in `results.json` only as a catalogue-stability diagnostic.
- No topic-by-topic chart: a defensible topic taxonomy would require a second manual classification layer and would add more judgment than the user’s question needs.
- No multi-speaker results: the different approximation method would mix incompatible grains.

## Reproducibility

- `analysis.py` loads the JavaScript source through Node.js and writes `results.json` and `taxonomy.csv`.
- `analysis.ipynb` is the reader-facing notebook companion.
- The current host has no Jupyter kernel packages installed. The notebook’s companion script was executed successfully and its displayed outputs were checked against `results.json`; native top-to-bottom notebook execution would require `nbformat`, `nbclient`, and `ipykernel`, then:

  `python -m jupyter nbconvert --execute --to notebook --inplace docs/analysis/non-theist-vs-theist-2026-09-01/analysis.ipynb`
