# Publication validation

September 4, 2026 edition, plain-language revision. Source corpus: `76d006b377f79372edc86dd804840cbac4936221`.

## Outcome

The seven rewritten PDFs contain 106 pages and 33 figures: 32 use recorded data
or fitted models; one clearly labeled teaching diagram uses five invented names.
The manuscripts contain 31,242 words, excluding generated contents and the full
speaker-ranking appendix. Every paper identifies the edition date, the
253-assessment archive, its own eligible sample, the main result, and limitations.
This is a new analysis of existing scores, not a new model's judgment of the
253 transcripts. All seven conclusions use explicit numbered reasons followed
by “Therefore.” Every figure has a plain-language reading key. Both rank-range
columns are explained before the appendix table and through three real rows.

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
- The full ranked field contains 50 speakers and 334 appearances. The broader
  eligible archive has 158 speakers and 474 appearances, but the repeatability
  and rank models are fitted to the 50-speaker, 334-appearance ranked group.
  Resampling preserves the stated debate or speaker unit and fixed seeds.
- The new exact-score check confirms four observed earlier clarity values and
  41 later values. Exactly 2,179 of 3,423 earlier moves receive task score 87
  (63.7%). `figures.py` asserts these counts from the saved moves before plotting.
  The observation does not establish why the score relationships changed.
- The invented five-speaker examples produce Spearman values +1, +0.90, and −1,
  checked directly with SciPy. They are never included in assessment counts.
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

All 106 final pages were rendered with Poppler and reviewed in seven contact
sheets. Selected dense or repaired pages were also inspected at full-page
resolution, including the weighted-gap waterfall, dimension correlations,
speaker-role comparison, rank-interval figure, exact-score-frequency figure,
Spearman teaching diagram, reader's guide, appendix explanations, and table.

This revision adds larger caption text, a separate reading key under every
figure, a six-area name key where relevant, solid/dashed rank ranges, and an
explicit first-place tick. Distribution plots separate ties into a gray bar.
The speaker-role plot uses equal-sized dots to remove an unnecessary size code.
Review caught reader-guide paragraphs spilling onto mostly empty pages; tighter
contents spacing repaired those breaks without shrinking the text. The complete
ranking table now starts on a fresh page and repeats its headers. Final contact
sheets use current page counts so obsolete render files cannot appear as extras.

The automated final checks confirm embedded fonts in all seven PDFs and all 33
vector figure PDFs, no extracted text outside the page boundaries, valid page
counts, working internal/external PDF link annotations, and no missing-character
replacement glyphs or unresolved manuscript placeholders. All figures label
their populations, score units or percentages, and the meaning of intervals.
The verifier asserts that all 33 reading keys are present and each PDF contains
exactly as many printed reading-key headings as figures. It also checks that
each paper has at least two explicit “Therefore” conclusions.
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
- The full 52-test run for this revision passed after static page generation
  finished. Download cache keys identify revision 2, and the card lengths are
  synchronized from the PDF manifest rather than maintained separately.

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
