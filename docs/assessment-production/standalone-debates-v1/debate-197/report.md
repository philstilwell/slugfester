# Debate 197 production and workflow-audit report

Status: **published and frozen**.

## Result

Iain McGilchrist and Anil Seth debate whether consciousness fundamentally pervades reality and points toward God. McGilchrist is the affirmative side; Seth is the skeptical side. The one permitted repository calculation scored McGilchrist **74** and Seth **83**, so Seth prevailed by nine points.

The result was stable across the two isolated judgments: the median absolute difference was 1.5 points, the largest difference was two points, the final scores remained within the primary judgments' range, and both judgments agreed on the winner.

## Evidence and review

The complete 1-hour-59-minute public YouTube caption track supplied 3,330 chronological events and 23,754 words. The frozen inventory contains 30 scored moves across six semantic sections, evenly divided between the sides. Two fresh, isolated 5.6 Sol judgments assessed every move; a separate identity-blinded review resolved 50 disagreements. Three medium-confidence speaker boundaries required audio checking. One paid diarized transcription succeeded, while an earlier transport-uncertain attempt produced no usable result and was not repeated.

Repository code then calculated all move, section, and overall scores exactly once. No model wrote a total, no score was manually overridden, and no second score pass occurred. Publication maps every locked move to one visible evidence card, preserves exact source quotations, supplies three strengths and two material weaknesses per side, and keeps the separately labeled AI Extension outside the participant scores.

## Comparison with recent debates

Comparison with the independent Debates 171–195 window found three legitimate structural outliers: the nine-word frozen motion is below the recent 11-word minimum, while 16 display rows and 30 moves exceed recent maxima of 12 and 23. The exact motion and all 30 distinct, load-bearing moves were retained because changing them would alter debate identity or delete assessment substance from a nearly two-hour exchange. The 15-to-15 side balance arose from the source inventory rather than forced symmetry.

The comparison also found repairable publication drift. Although the original critiques met their word target, repeated six-word boilerplate covered 57.3% of their words on average; parts of the Overall Commentary and AI Extension were also shorter than recent production. All 30 critiques were rewritten move by move without changing any judgment or score. The final critiques are 112–121 words and 895–979 characters, with zero qualifying repeated six-word boilerplate; summary, commentary, AI Extension, and every other hard content contract now pass.

The post-scoring fallacy and cognitive-bias review covered all 30 moves. It accepted five transcript-supported labels: **Argument from ignorance** on the wetness response and the fundamental-consciousness response, **Equivocation** on the prehuman-beauty inference, **Confirmation bias** on selective cosmic directionality, and **Subjective validation** on treating private ritual resonance as disclosure about external reality. Six plausible alternatives were explicitly rejected because they described underargument, analogy limits, or speculation rather than the named catalog defect. No tag altered a score, critique, move, or winner.

The audit exposed broader workflow weaknesses that older standalone records did not fully test: shared tooling contained debate-specific routing assumptions; legacy generic section identifiers were not separated from the standard for new records; side-balance and fourth-row behavior lacked general machine checks; speaker identity could be confused with a position label; formally valid but repetitive critique prose could pass; production-only requirements were checked too late; judgment and one-pass score claims needed stronger hash authentication; uncertain paid attempts were not clearly separated from successful cost; the living transcript count and generated asset version could become stale; and, on mobile, an open critique layer intercepted a later tap on the AI Extension.

## Implemented recommendations

The standalone workflow is now registry-driven and validates every published standalone record. New records use a semantic, balance-aware profile while Debate 196 remains intact under an explicit frozen-legacy profile. The machine gates now cover exact motion and speaker identity chains, semantic section identifiers, selection balance, the general fourth-row rule, judgment-execution hashes and settings, the single score-pass chain, audio-trigger completeness, two material weaknesses per side, critique specificity, and the full production display contract before final integration.

The publication prose was rewritten to evaluate each move's actual inference and evidence, then corrected against the production contract without changing any judgment, adjudication, move, or score. The mobile critique layer no longer captures taps outside its intended interaction, and the asset version was advanced so generated pages receive the stylesheet correction. The transcript inventory, search data, rankings, topic and profile pages, sitemap, and all generated pages were refreshed. The reusable `add-slugfester-youtube-debate` skill and runbook now require these controls for future additions.

## Rendering, validation, and limitations

The debate page passed Chromium checks and a post-rhetorical-tag replay at 1440×1000 and 390×844. All 30 cards, six sections, five argument tags, and their two Overall Commentary links rendered; reference pages included the new occurrence cards. Both speaker profiles linked correctly, the mobile critique-then-AI-control tap passed, and there were no empty cards, horizontal overflow, console errors, warnings, or failed resources.

The production validator, 197-transcript corpus replay, 384-file generated-page replay, historical campaign and calibration audits, full repository suite, focused Debate 196 and Debate 197 standalone audits, and all-record standalone audit passed. A separate clean checkout also passed the all-record standalone audit and 384-file generated-page replay without relying on ignored local evidence.

One preservation limitation is documented: the exact bytes of the first rejected publication draft were overwritten before its failure record was created. The record truthfully preserves that fact and the known diagnostics; later failed artifacts were preserved exactly before correction.

Known successful paid cost: **$0.0200725**. Maximum possible cost including the transport-uncertain attempt: **$0.04**.

Primary production files:

- `src/data/debates.js`
- `docs/assessment-ledgers/mcgilchrist-seth-consciousness-god-2026.json`
- `docs/assessment-production/standalone-debates-v1/debate-197/`
- `docs/calibration/v2.1/corpus-transcript-audit.json`
