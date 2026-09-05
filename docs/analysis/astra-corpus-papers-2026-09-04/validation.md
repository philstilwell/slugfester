# Publication validation

September 4, 2026 edition. Source corpus: `76d006b377f79372edc86dd804840cbac4936221`.

## Outcome

The seven rewritten PDFs contain 95 pages and 31 data figures. The manuscripts
contain approximately 28,300 words, excluding generated contents and the full
speaker-ranking appendix. Every paper identifies the edition date, the
253-assessment archive, its own eligible sample, the main result, and limitations.
This is a new analysis of existing scores, not a new model's judgment of the
253 transcripts.

## Numerical and source checks

- 253 unique debate IDs and 253 distinct YouTube source URLs.
- 237 comparable locked assessments, comprising 5,282 moves and 474 side totals.
- All 5,282 move scores, 2,558 side-section scores, and 474 overall scores
  reconstructed exactly. All locked public move scores agree with their records.
- All 58 later final-ledger SHA-256 fingerprints agree with their source locks.
- The relevant position classification contains 187 comparisons. An independent
  Node.js calculation using `publishedDebates` gives a gap sum of 1,186 points:
  1,186 / 187 = 6.3422459893. The 237 formal-role contrasts sum to 1,113 points:
  1,113 / 237 = 4.6962025316.
- The independent public-card count gives 5,492 moves, 243 decisive assessments,
  and 150 losses without a named-fallacy tag. It handles multiple cards in an
  exchange and does not silently drop array-valued entries.
- Topic counts sum to 187; non-theist-higher topic counts sum to 160. Weighted
  dimension contributions plus rounding and burden adjustments reconcile to
  the overall position gap. The unchanged original slogan rule covers 146
  debates; its newer score-based counterpart covers 187. The separate narrow
  sensitivity also contains 146 debates, but is not the same set.
- The full ranked field contains 50 speakers and 334 appearances. Broader
  repeatability calculations use 158 speakers and 474 appearances. Resampling
  preserves the stated debate or speaker unit and fixed seeds.
- All 22 distinct manuscript source links were inspected for valid local debate
  IDs or existing source-document paths where applicable. Brief Lennox
  quotations were checked against locked source excerpts with source times;
  public explanatory paraphrases were not silently treated as verbatim speech.
- Source and final-PDF fingerprints are recorded separately. The automated
  verifier checks those fingerprints before examining the papers.
- `audit.ipynb` was executed successfully from beginning to end with the Python
  kernel. Its cells are a compact numerical audit, not a substitute for the full
  simulation code in `analyze.py`.

## PDF and visual checks

All 95 final pages were rendered with Poppler and reviewed in seven contact
sheets. Selected dense or repaired pages were also inspected at full-page
resolution, including the weighted-gap waterfall, dimension correlations,
speaker-role comparison, and rank-interval figure.

Repairs made during review included moving a small waterfall label outside its
bar, separating the rank-interval legend from the final data row, keeping short
tables together, adding or moving prose after figure-adjacent headings, and
keeping each methods endnote together. Final contact sheets were regenerated
from the current page counts so obsolete render files could not masquerade as
extra pages.

The automated final checks confirm embedded fonts in all seven PDFs and all 31
vector figure PDFs, no extracted text outside the page boundaries, valid page
counts, working internal/external PDF link annotations, and no missing-character
replacement glyphs or unresolved manuscript placeholders. All figures label
their populations, score units or percentages, and the meaning of intervals.
Colors supplement labels rather than replace them.

The machine-readable `qa-results.json` deliberately describes its own checks
as automated; this document records the separate visual review. The PDFs have
not been certified as PDF/UA or archival PDF/A, and automated checks do not
establish screen-reader reading order or the objective accuracy of judgments.

## Website checks

- `npm run site:check`: all 52 browser tests passed in the final run.
- Explicit topic assignments validated for all 253 debates across 15 categories.
- All 719 generated search/discovery files matched the generator.
- Public-site validation covered 444 routes, 253 detail files, 172 profiles, and
  172 avatar assets.
- Targeted browser inspection found seven visible paper cards, no closed
  accordion ancestor, and one shared column at desktop and phone widths.
  At 390 pixels, document width and content width were both 390 pixels: no
  horizontal overflow. All seven local PDF requests returned HTTP 200 with
  `application/pdf` and the expected file sizes.
- Backend descriptions, lengths, figure counts, title metadata, and PDF cache
  versions were updated. Paper five's descriptive title is now *Beyond the
  Fallacy Count*, while its stable existing download filename remains intact.
- The first browser run overlapped regeneration of static pages and one route
  was briefly absent. The completed generation was then checked by a fresh
  full run; all 52 tests passed. This was a local test-timing issue, not an
  unresolved production error.

## Interpretation limits retained

The archive is selected, not representative. Scores are model judgments, not
measurements of a worldview's truth. Arithmetic verification does not validate
those judgments. Score-component decompositions are accounting identities, not
independent causal explanations. The slogan-risk measure is not a validated
census of literal non-falsifiability. Emotional enforcement and private motives
were not measured. Process differences are not isolated causal effects.
Repeated speakers, shared opponents, selective topics, and judging error are
not fully represented by the displayed intervals. Rank-model probabilities
condition on a fixed field and fitted assumptions and are not promises of
future rank or victory.

No paid imagery or external model calls were used to generate illustrations.
Additional image-generation spend: $0. Temporary rendering and browser-check
files are not publication assets; they can be regenerated from the scripts.
