# Seven corpus papers: Astra-era research edition

Frozen September 4, 2026, from source revision `76d006b37`.
The user requested substantial rewrites of all seven Backend PDFs using the
253-assessment archive, with clear prose, updated statistics, and improved design.
The analysis and writing are new. The source debates have **not** been freshly
reassessed by Astra, and no underlying public score or annotation is changed.

The **plain-language revision** keeps that same frozen evidence. All seven papers
now have numbered reasons leading to explicit conclusions and a reading key for
every figure. Paper six adds a checked comparison of exact score values and a
detailed plan for the next complete assessment. Paper seven adds an illustrated
explanation of rank correlation, separate explanations of **Resampled ranks** and
**Model ranks**, three real-row walkthroughs, and a guide to every appendix column.
The seven PDFs total **106 pages, 33 figures, and 31,242 manuscript words**. One
figure is explicitly a made-up five-speaker teaching example; the other 32 use
the frozen assessment records or models fitted to them.

## Read the papers

The stable PDFs are in [`output/pdf`](../../../output/pdf):

1. **Why Do the Theist Sides Score Lower?** — location of the 6.34-point gap;
   a bounded defense of the substantiation/epistemic-bleed-through hypothesis.
2. **Where Is the Theist Disadvantage Largest?** — eight topics, uncertain
   ordering, and the inferential transitions that need more work.
3. **Are Theist Arguments More Often Slogan-Like?** — the original 146-debate
   risk rule, a distinct 187-debate score check, and source-linked close readings.
4. **Does the CON Side Have an Inherent Advantage?** — the raw 4.70-point
   association, position composition, and smaller same-speaker comparisons.
5. **Beyond the Fallacy Count** — retitled from *Debates Are Usually Lost Without
   a Named Fallacy* because the pooled majority reverses in newer assessments.
   The original filename is preserved to keep existing links working.
6. **Are All Slugfester Assessments on the Same Scale?** — process comparability,
   repeated speakers, dimension patterns, annotation drift, and the next review.
7. **Do Slugfester Rankings Measure Stable Performance?** — repeatability,
   rank uncertainty, unequal samples, and the complete 50-speaker field.

`publication-manifest.json` records exact titles, filenames, page and figure
counts, manuscript word counts, and final PDF hashes. The Backend retains the
existing intuitive three-group order, one-column cards, and no accordion.

## Data and denominators

| Use | Eligible population |
| --- | --- |
| Full archive / public tags | 253 assessments; 5,492 moves |
| Comparable locked records | 237 debates; 474 sides; 5,282 moves |
| Earlier detailed-findings process | 179 debates; 3,423 moves |
| Later standalone process | 58 debates; 1,859 moves |
| Broad religious-versus-skeptical set | 187 debates; 4,086 moves |
| Original detailed slogan-risk rule | 146 debates; 2,800 moves |
| Narrower truth-claim sensitivity | 146 debates, a DIFFERENT subset |
| Decisive public assessments | 243; ten ties excluded |
| Default ranked field | 50 speakers; 334 appearances; minimum three |

The primary classification preserves the 169 reviewed September 1 decisions
and explicitly reviews every addition, 227–253. Eighteen are included. A God
contrast is not inferred merely from PRO/CON, a religious speaker's identity,
belief in souls, moral realism, or defending the historical existence of Jesus.
`classification.csv` makes all inclusions, exclusions, substantive sides,
topic assignments, and narrower-set flags visible.

The broader set includes defenses of religious meaning, scripture, and doctrine
facing skeptical challenges. It is not a pure census of God-existence motions.
The narrowed set removes cultural, selected historical/social, and internal
doctrinal comparisons. The equal count of 146 in two different analyses must
not be mistaken for identical membership.

## Reproducible files

- `analyze.py`: source extraction, score reconstruction, subgroup decisions,
  paired resampling, tag counts, scale comparisons, and ranking models.
- `results.json`: all report statistics and simulation summaries.
- `debates.json`, `moves.json`, `losses.json`: normalized analytic records.
- `casebook.json`: public move text, critiques, source URLs/times, and dimensions.
  The selected quotations are independently traceable to the original locked
  `sourceSpan.excerpt` fields, not quotes invented from a public paraphrase.
- `source-manifest.json`: source paths, SHA-256 digests, and check counts.
- `classification.csv`, `ranking.csv`: inspectable tables.
- `audit.ipynb`: executed, reader-facing numerical audit companion.
- `figures.py`, `chart-contracts.json`, `figures/`: reproducible figures,
  denominators, actual plotted inputs, PNGs, and embedded-font vector PDFs.
- `figure-reading-keys.json`: the plain-language legend and reading guide printed
  beneath each of the 33 figures; every plotted mark and scale is explained.
- `revision-checks.json`: independently inspectable exact-score frequencies and
  the explicitly illustrative Spearman examples (+1, +0.90, and −1).
- `manuscripts/01.md` through `07.md`: complete authored prose, with selected
  headline fields linked to `results.json` at typesetting time.
- `build_papers.py`: shared ReportLab design, embedded Georgia/Arial fonts,
  linked contents, source links, and stable output filenames.
- `verify_papers.py`, `qa-results.json`: numerical, font, source-link, page-boundary,
  and render checks. Visual review is documented in `validation.md`.
- `sync_library.py`: updates the seven Backend cards' page/figure counts and
  download cache versions from the finished publication manifest.

## Methods that matter

The mean position and role gaps give one observation to each debate. Official
score decompositions preserve section and move-importance weights. Move-subset
and threshold rates are computed within each side of a debate before paired
differences are averaged. Pooled move rates are clearly labeled as pooled.

Replacement resampling uses 20,000 draws and deterministic seeds based on
20260904. Complete debates are resampled for debate contrasts; shared speakers
are resampled for speaker-bridge estimates. These intervals are conditional
stability diagnostics for a selected archive, not all-source uncertainty or
confidence about the truth of a worldview. Repeated speakers and opponents are
not fully handled by a one-way bootstrap.

The ranking analysis reports independent within-speaker resampling, a shared
positive-debate-weight sensitivity, and a normal pooled-variation model. These
have different assumptions and must not be presented as interchangeable.
The model conditions on fitted variance parameters and a fixed 50-speaker field;
its probabilities are not calibrated probabilities of future wins.

Neither score decomposition nor the slogan proxy is independent validation of
the judging criteria: the dimensions help define the score. A named-fallacy tag
is an accepted public annotation, not an exhaustive or independent error census.
There are only six named fallacy labels in the snapshot. The primary slogan-risk
rule is **not** a validated classifier of literal non-falsifiability, and the
archive does not measure emotional enforcement or private belief formation.

The topic taxonomy and checks are exploratory, not preregistered. The frequency
with which a topic ranks highest under resampling is not a posterior probability
that it is the true highest topic in an external population. Process-centering
of speaker scores is a sensitivity exercise, not an authorized recalibration.

## Run the analysis and build

Requirements: Node.js; Python with NumPy, SciPy, Matplotlib, ReportLab, Pillow,
pypdf; Poppler (`pdffonts`, `pdftotext`, `pdftoppm`). Notebook regeneration also
uses nbformat, nbclient, and ipykernel. The PDF font paths default to the
embeddable Georgia and Arial files under macOS's supplemental fonts directory.

From the repository root, using a Python environment with those dependencies:

```sh
python docs/analysis/astra-corpus-papers-2026-09-04/analyze.py
python docs/analysis/astra-corpus-papers-2026-09-04/figures.py
python docs/analysis/astra-corpus-papers-2026-09-04/build_papers.py
python docs/analysis/astra-corpus-papers-2026-09-04/verify_papers.py
python docs/analysis/astra-corpus-papers-2026-09-04/build_audit_notebook.py
python docs/analysis/astra-corpus-papers-2026-09-04/sync_library.py
npm run seo
```

Run against the frozen input revision or verify the source-manifest hashes
first. `analyze.py` deliberately asserts the edition's expected population sizes;
it is not a silently self-updating report. New corpus growth belongs to a new
version with reviewed classifications and prose. Old source analyses remain
under their September 1 directories, and earlier PDF versions remain in Git.

No paid image-generation service was used. The five-speaker teaching diagram is
clearly labeled as invented, not presented as evidence. All other figures use
the saved analysis. All seven PDFs embed every declared font.
The intended substantive refresh is the next major GPT-model transition;
corrections remain possible before then. No recurring job was created.
