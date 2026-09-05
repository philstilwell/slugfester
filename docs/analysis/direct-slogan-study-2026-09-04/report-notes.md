# Publication validation

## Overall assessment: Share with caveats

The completed direct study answers whether unsupported and criticism-protected
slogan uses differ between the two sides in the fixed 187-debate selection. It
does not test a causal account of religious belief. The user selected a PDF and
replacement of one existing site paper, so PDF is the primary report surface;
there is no parallel dashboard or newly hosted report. The audience is general
site readers, using the executive-report shape with substantial plain-language
explanation. The original assessment data and other six papers are out of scope.

## Reader structure

- Cover and Executive Summary: direct answer, scope, strongest result and limits.
- Sections 1-2: definitions and denominators before the graphs.
- Sections 3-7: rates, presence, uncertainty, selection and concentration checks.
- Sections 8-10: seven source-checked cases or contrasts, including Lennox.
- Section 11: emotional wording, with no causal inference.
- Section 12: single-reader, source, selection, and repeated-speaker limitations.
- Section 13: reader actions, future measurement improvements, unanswered causes.
- Section 14: numbered reasons and findings leading to the conclusion.
- Evidence guide: source accounting, links and replacement of the old proxy.

This maps the report skill's summary, visual evidence, next steps, further
questions, and caveats to the user's existing paper series. The explicit PDF
request takes precedence over optional HTML/MCP/Sites report delivery.

## Calculation checks

All 187 final source-only readings use Astra low, one per debate. The five
medium-effort pilot pairs and the never-executed adjudication plan are excluded.
Source/output hashes, complete event attribution, quote locations, and controls
passed. `audit.ipynb` was re-executed on the complete 187-row result. It checks
word accounting, unique debate identifiers, nested counts, paired means and
presence totals. `supplementary.py` adds transparent inclusive and concentration
checks; it does not reread or relabel cases. In particular, uncertain-only counts
must be ADDED to confirmed counts for the inclusive sensitivity calculation.

Seven printed example/context passages are recorded in `example-checks.json`.
Original outputs are preserved. Editorial corrections are separately documented.
No remaining quotation-location or attribution conflict blocks these results.
This does not constitute a full human or independent second reading.

## Chart map and final-context review

All four charts use the existing SLUGFESTER two-color palette (rust for theist,
teal for non-theist) with navy/grey references. Direct labels preserve meaning
without relying on color. No OpenAI research branding is added to this third-party
series. Static charts are appropriate for the explicitly requested PDF.

| Section / chart | Question and form | Evidence / interpretation |
| --- | --- | --- |
| 3 / p3-direct-rates | Two-panel horizontal bar comparison | Equal-debate rates, 187 pairs; same zero-based scale; protected is a subset. |
| 4 / p3-direct-presence | Two-panel horizontal bar comparison | Four mutually exclusive debate categories, each panel totals 187. |
| 6 / p3-direct-checks | Two stacked dot-and-range panels | Five overlapping selections, shared scale, defined zero and 95% repeat-draw lines. |
| 11 / p3-direct-emotion | Horizontal share bars | 102/128 and 73/82 detected unsupported uses; not all speech or causal effect. |

Bar charts recur because the sections ask category comparisons, not trends.
Exact small tables serve lookup/definition needs rather than decorative graphics.
All 17 final PDF pages were rendered at 85 dpi and visually inspected, including
every graph, reading key, table, example, conclusion, and source page. No clipping,
overlap, orphaned page fragments, missing figures, or unreadable legend was found.
The four PDF font subsets (Arial regular/bold and Georgia regular/bold) are all
embedded, verified by `pdffonts`. Text extraction confirms 17 substantive pages.
The source links use the verified repository `philstilwell/slugfester` and
timestamped YouTube source links; no invented `SLUGFESTER.com` repository path.

## Material caveats to retain

One AI reader; recognizable speaker identities; incomplete assurance of caption
accuracy; unassigned/mixed speech; selected debates and repeated speakers;
frequency not impact; overlapping sensitivity checks; no emotional-cause test.
The protected-slogan result is stronger than the broad unsupported result.
Lennox is not the driver of the archive-wide difference. Keep the distinction
between direct uses per words and the old risk percentage per assessed move.

## Site publication

The replacement retains the stable PDF filename and adds the cache key
`20260905-direct187-r1`. The seven-paper, one-column, always-visible library remains.
Only the slogan entry, necessary library clarification, Backend search date and
description, and their generated pages/sitemap are changed. A first local browser
test attempt stopped for missing packages. Installing the same pinned free versions
as CI resolved it; all 52 browser tests then passed (58.8 seconds), in addition
to the data, 719 generated-file, and 444 public-route checks. Neither dependency
manifest nor lockfile changed. Homepage and Backend asset versions are refreshed
so cached JavaScript does not conceal the replacement paper.

After deployment of PR #32, the first PDF query key still returned a Cloudflare
HIT for the previous 518,930-byte PDF (four-hour cache). A fresh `-r1` query
returned the checked 601,512-byte PDF with SHA-256
`617eaee497cd560280a5a84f6f2f8455b8e5946fde190539d66a3a97a47306b7`.
The library link and homepage/Backend application query keys were updated to
that verified fresh version. No paper content changed in this cache correction.
