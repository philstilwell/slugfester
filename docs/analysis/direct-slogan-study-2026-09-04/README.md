# A direct review of slogan use

This is the replacement study for **Are Theist Arguments More Often Slogan-Like?**
(originally called Paper 2 in the conversation; item 3 in the current library).
All 187 direct reviews and the replacement PDF are complete. The September 5,
2026 edition has 17 pages, four figures, and about 5,500 words. It replaces the
old proxy-based paper without changing the other six papers or debate scores.
See `publication-manifest.json`, `manuscript.md`, and `report-notes.md`.

## Active method

Use `protocol-light.md`, `light-instructions.md`, `light-schema.json`, and
`light-manifest.json`. Each whole retained transcript receives one fresh,
source-only GPT-6 Astra **low / Light** reading. Source scores are not supplied.
The reader distinguishes an unsupported slogan from a slogan that also protects
itself against criticism. Neither religion nor a lack of a laboratory test is,
by itself, enough for either finding.

All 187 source files match their original saved fingerprints: 3,496,979 caption
words, about 335 hours of recordings. This verifies the retained files, not the
accuracy of every caption or the completeness of the original recordings.

The user asked to simplify the original plan. The five medium-effort two-reader
pilot pairs are retained under `reviews/` but **excluded from the final results**.
The abandoned adjudication preparation was never executed. Do not revive the
two-reader or third-reader plan. Resolve actual source conflicts and check the
examples printed in the paper; do not commission unnecessary full rereadings.

## Usage ceiling and progress

The user requested a pause when shared ChatGPT/Codex usage reaches **50% used**.
Check the account's usage tool between batches and while a batch runs. Use smaller
batches near the limit. At 50%, launch no further reviews; save results at a safe
boundary and tell the user exactly what is complete. Do not redeem a reset, buy
credits, or switch billing surfaces. The agreed incremental cash estimate is $0
within the existing subscription. Report review progress as completed / 187,
distinct from progress on writing and publishing the replacement paper.

## Reproduce the finished analysis and PDF

Run from the repository root. The existing ignored Python environment is
`.assessment-cache/direct-slogan-study-v1/python/bin/python`.

```
.assessment-cache/direct-slogan-study-v1/python/bin/python docs/analysis/direct-slogan-study-2026-09-04/analyze_light.py
.assessment-cache/direct-slogan-study-v1/python/bin/python docs/analysis/direct-slogan-study-2026-09-04/supplementary.py
.assessment-cache/direct-slogan-study-v1/python/bin/python docs/analysis/direct-slogan-study-2026-09-04/figures_light.py
.assessment-cache/direct-slogan-study-v1/python/bin/python docs/analysis/direct-slogan-study-2026-09-04/build_paper.py --publish
```

The runner skips completed reviews, retains original output and execution evidence,
and stops a batch if its checks find a problem. Inspect unsuccessful records before
continuing. At most three readers run at once. There are no tools inside a reading.

`analyze_light.py` checks complete event coverage, source and output fingerprints,
exact quote location, and counting arithmetic. It creates source-linked incident
records and a debate-level CSV. One-event shorthand such as `1048:B` is interpreted
as `1048-1048:B`; the original output is preserved. An early validator correction
for debate 5 is separately recorded. Source-based changes belong in
`editorial-corrections.json`, with their reasons, not in the original model output.

Without `--partial`, the analysis refuses to finish if the review is incomplete or
has unresolved source problems. The PDF builder must enforce the same restriction.
Interim estimates are not a replacement for the published paper.

## Final handoff

**Review checkpoint, September 5, 2026:** All 187 Light reviews are complete.
The final `analyze_light.py` run (without `--partial`) returned `status: complete`,
187 validated reviews, zero missing debates, and no unresolved issues. It located
904 quotations exactly and one with only case/punctuation differences; 18 were
reanchored within the supplied context. Shared Codex usage was 22% used at this
checkpoint. Do not rerun the completed reviews. The requested Astra Extra high
current-task setting override was accepted after this checkpoint and before
the final manuscript was written. All review records remain Light.

The user explicitly requested **Extra high (`xhigh`) reasoning before rewriting
Paper 2**, after the 187 Light reviews are complete. Keep every debate reading at
Light; change only the subsequent synthesis/writing turn to Extra high. Preparatory
methods/example notes in this folder are drafts, not the final manuscript. The
50% account-usage ceiling still applies during writing. Use the supported current
task follow-up reasoning override at the phase boundary, or another verified app
control; do not merely claim a setting changed. Do not change global defaults for
unrelated tasks.

Write in plain language with clear graph keys and numbered reasons leading to the
conclusion. Explain the limits of one AI reader and distinguish direct counts from
the former score-based warning rule. Preserve the other six PDFs and all original
assessment scores. Embed every PDF font, inspect rendered pages, update the one
Backend library entry, run relevant site checks, then commit and push.
