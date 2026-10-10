# Three new Slugfester studies — October 9, 2026 snapshot

Papers 8–10 extend the seven-paper research edition without changing its
statistics, PDFs, any debate score, or any interlocutor biography.

## Design and scope

This is an exploratory analysis, not a preregistered confirmatory experiment.
The research questions preceded calculation; the case selection and explanatory
framework were developed while inspecting the evidence. No causal effect,
representative prevalence, independently validated score, or corrected ranking
is claimed. No new paid model judgments or full-video reviews were commissioned.

1. **Replies:** audit the response-link structure in all 112 later-process
   comparable debates (3,609 moves). Explain eight deliberately selected replies
   from five debates by reading the saved source excerpts for both reply and
   target. Cases illustrate premise challenges, inference challenges, scope
   clarification, concessions, and failures of target identification. They are
   not a random sample and do not estimate frequencies of good or bad replies.
   Existing scores are displayed as context, not used to validate the new
   framework. A preliminary Donahue prior-probability example was replaced by
   Schieber's exclusivism clarification because its saved target was broader
   than the immediate question; this was a source-context decision, not a score
   threshold. All 2,444 reply records are mechanically audited, not qualitatively
   reclassified. Link chronology checks use excerpt start times, not a claim
   that every transcript attribution has been independently verified.
2. **Creator bridges:** eight focal passages from six purposively selected
   debates cover necessary foundation, agency, value-sensitive purposes,
   unlimited attributes, limited power, Trinity, Christian identification, and
   intentionally limited design claims. The organizing question is what each
   inference supports, not what religion its speaker holds. These are source-
   linked comparative case studies, not a prevalence estimate for all theism.
   Biological design does not by itself establish a cosmic creator. The levels
   in the explanatory diagram are possible claim increments, not a mandatory
   sequence or a deductive proof.
3. **Opponents:** all 291 locked comparable one-on-one debates; 582 appearances.
   Repeated unordered pairs are counted once per pair. A reversal requires a
   strictly positive and a strictly negative score difference; a tie is not a
   reversal. A same-process pair group requires two meetings under one procedure.
   Compare a speaker's own scores with an opponent proxy calculated from that
   opponent's scores against OTHER people, excluding every meeting of the focal
   pair. Require three other appearances (five in a sensitivity) and at least
   two eligible appearances of the focal speaker. Fit ordinary least squares
   with separate speaker intercepts, then procedure and PRO/CON controls.
   These intercepts compare changes within the same person. Do not use the
   opponent's score in the same debate as the predictor. Additional checks use
   broad topic controls, equal-person weighting, separate procedures, and a
   proxy restricted to the same procedure. An additional check uses exactly
   that restricted set of appearances with the original pooled proxy, separating
   the sample change from the proxy change. The proxy draws on the whole fixed
   snapshot, so these are descriptive fits, not advance predictions. Topic
   adjustment groups the eight existing research topics plus Other questions;
   it does not pretend to control every subject difference. No confidence
   intervals or significance tests are reported: the specification spread is
   not an uncertainty interval, and repeated speakers/opponents are dependent.

## Source treatment and reproduction

Input revision: `e65bc3c0b6`. The earlier edition's debates, moves and casebook
files supply the frozen catalogue. Every raw adapter/final ledger read is
checked against its earlier source-manifest hash; final ledgers also match
their adapter's evidence lock. Source excerpts are noisy automatic-caption
material saved in those ledgers, not a newly corrected transcript. Authored
case descriptions are paraphrases, never presented as verbatim quotation.
The accompanying case coding is an AI-assisted editorial interpretation by one
review process, not an independent or blinded second panel.

`analyze.py` creates the results, complete reply-edge audit, opponent appearance
table, repeated pairs and selected evidence. `case-analysis.json` records the
authored distinctions. `figures.py`, `chart-contracts.json`, and `figures/`
contain plotted inputs and reading guides. `manuscripts/`, `build_papers.py`,
`editorial.json`, `sync_site.py`, and `publication-manifest.json` reproduce the
three public PDFs and site summaries. `verify.py` independently checks the
counts, fits, links, page text, font embedding and preservation of the original
seven PDFs. `validation.md` records the publication checks.

From the repository root, using Python with NumPy, SciPy, Matplotlib,
ReportLab, Pillow and pypdf plus Poppler installed:

```
python docs/analysis/argument-structure-studies-2026-10-09/analyze.py
python docs/analysis/argument-structure-studies-2026-10-09/figures.py
python docs/analysis/argument-structure-studies-2026-10-09/build_papers.py
python docs/analysis/argument-structure-studies-2026-10-09/sync_site.py
python docs/analysis/argument-structure-studies-2026-10-09/verify.py
npm run seo
npm run site:check
```

Each future refresh needs new source checks, case review and prose review;
automatically changing a date or chart count is not a new research edition.
