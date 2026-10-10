# October 9, 2026 research edition

Frozen input: `e65bc3c0b6` (debate 308). This edition refreshes all seven core
Insights papers, their website summaries, the methods page, and the Backend
library. It does not reassess debates, edit scores, modify biographies, or alter
the separate *Evidence, Faith and AI Bias* paper.

## Coverage and principal changes

- 308 published assessments, 7,264 assessed moves, and 307 unique video links.
- 291 comparable locked one-on-one debates, 582 sides, and 7,032 verified moves.
- 234 reviewed religious-versus-skeptical comparisons, including 47 new ones.
- 179 earlier-process and 112 later-process comparable records; 17 other formats.
- 57 ranked people with three or more appearances; 416 appearances in that field.
- The gap falls from 6.34 to 5.74 points; the 47 new comparisons average 3.34.
- The weighted same-person CON estimate is 1.33 with a positive 0.32–2.30
  resampling range. The equal-person range still narrowly crosses zero.
- Untagged losses fall from 61.7% to 54.4% overall, but differ sharply by process.

Assessments 13 and 125 share a source video under different formats. They count
separately only in the full assessment-level inventory. Only 13 enters the
comparable set, where source URLs are unique. Recurring speakers still limit
independence. No scores or process classifications in the earlier 253-record
snapshot changed.

## Historical direct slogan evidence

The September 5 single-reader study still covers 187 September-source
transcripts. Its published per-debate counts, word-normalized means and seeded
resampling intervals were independently recalculated without new AI calls.
The results reproduce 77 versus 19 protected uses and 0.56 versus 0.16 per
10,000 words. No new transcript reviews were commissioned. The revised third
paper clearly separates this dated evidence from a current score-threshold
comparison across 234 cases. Scores are never treated as direct slogan coding.

Original review records and supplementary checks remain in
`../direct-slogan-study-2026-09-04/`. The old detailed-findings proxy remains
available in the results for provenance, but is not represented as direct evidence.

## Classification and interpretation

The reviewed September position decisions are preserved. Every addition,
254–308, has an explicit decision in `analyze.py` and `classification.csv`.
Eight stable research topics retain edition comparability; these are not the
current 18 browsing categories. Creator/design arguments are distinguished from
full personal theism in the reasons and prose. A sensitivity removes the two new
origins cases. The narrower truth-claim check excludes cultural-benefit and
specified historical/doctrinal comparisons; it contains 186 cases.

Cases are not classified by speaker identity. Secular moral realism, a human
historical Jesus, free will, or consciousness-first metaphysics do not alone
establish a religious contrast. The new interfaith and intra-Christian cases are
excluded from the religious-versus-skeptical study, not from other eligible uses.

The data describe a curated catalogue, not a representative sample. Score
decomposition is arithmetic rather than causal validation. Resampling describes
stability within observed records, not all sources of error. Rank models hold the
field and fitted variation parameters fixed. No future-win probabilities or
automatic score adjustments are claimed.

## Files and reproduction

- `analyze.py`: deterministic calculations with baseline seed 20260904 and
  20,000 draws, preserving it for comparison across editions.
- `results.json`, `debates.json`, `moves.json`, `losses.json`, `casebook.json`:
  inspectable analytic records and source-linked descriptions.
- `classification.csv`, `ranking.csv`: full inclusion and ranking tables.
- `source-manifest.json`: input paths, SHA-256 fingerprints, reconstruction counts.
- `figures.py`, `figures/`, `chart-contracts.json`, `figure-reading-keys.json`:
  data-derived charts, plotted inputs, definitions and reading guides.
- `manuscripts/`, `editorial.json`, `build_papers.py`: rewritten papers and shared
  public summaries. Headline values are bound to `results.json` where repeated.
- `publication-manifest.json`: PDF metadata, lengths, figure counts, hashes.
- `sync_site.py`: shared website data and selected chart images from this edition.
- `verify_papers.py`, `verify_public.mjs`, `qa-results.json`, `validation.md`:
  independent arithmetic, source, PDF, link, font and rendered checks.

From the repository root, with Node and Python providing NumPy, SciPy,
Matplotlib, ReportLab, Pillow and pypdf, plus Poppler:

```sh
python docs/analysis/corpus-papers-2026-10-09/analyze.py
python docs/analysis/corpus-papers-2026-10-09/figures.py
python docs/analysis/corpus-papers-2026-10-09/build_papers.py
python docs/analysis/corpus-papers-2026-10-09/sync_site.py
python docs/analysis/corpus-papers-2026-10-09/verify_papers.py
node docs/analysis/corpus-papers-2026-10-09/verify_public.mjs
npm run seo
npm run site:check
```

Run against the frozen source revision or matching source hashes. The population
assertions deliberately stop silent reuse against a changed catalogue. A future
edition needs reviewed classifications and prose, not just replacement counts.
The PDFs retain their stable public filenames; October cache versions accompany
all page download and chart links. Every declared PDF font is embedded.
Shared research-module imports also carry the dated edition version; update
those tags when publishing a later edition.

The September analysis package remains intact. Earlier PDFs are preserved in
repository history. No paid AI service was used for this refresh.

## Stability interpretation revision

Paper seven and its shared site summaries now lead with the strong observed
repeatability: 0.87 median split-half agreement (31 people; middle 95% of split
results 0.81–0.92), 0.84 under assessment-number splits, and 0.99 agreement
after process-mean centering in the 57-person field. Exact-rank precision is
distinguished from broad stability; judging validity and future performance
remain separate questions. These complementary checks reuse the same archive.
No source records, results, scores, figures, or other six PDFs were changed.

`python3 docs/analysis/corpus-papers-2026-10-09/verify_stability.py` independently
reproduces the split-half, ordered-split, process-centering and repeatability
calculations using a separate tied-rank implementation. To rebuild only this
paper without changing the other PDFs, run `build_papers.py --paper 7`, then
`sync_site.py` and the normal checks. The stability revision uses a new cache
version while preserving the October 9 data snapshot and public filenames.

## Charts companion reference

The score-gap website section and methods page include a linked summary of
*Evidence, faith, and fair assessment*, the clarified 16-page October 8 PDF
linked from Charts. Its discussion of evidential omissions, burdens, faith
insulated from correction and possible model bias informs the interpretation.
The summary preserves the paper's tentative support for a contributing faith
mechanism without presenting that mechanism as a measured cause.

The companion's 226 debates / 5,405 moves and 7.7-point evidence-dimension gap
remain distinct from the October research edition's 234 comparisons and
5.74-point overall-score gap. The studies reuse overlapping records and are
not independent replications. Reader-feature checks verify the Charts link,
local PDF, source counts and evidence means, and initial methods-page text.
This is a website cross-reference; neither the companion nor the seven existing
PDFs are changed by this addition.
