# v3.7.5 correction-packet development assessment

## Outcome

The v3.7.5 correction packets are frozen and pass their preregistered local-development checks. The eight-bundle universe contains four diagnostic-precedence decisions and four burden-route decisions across retired debates 62, 154, and 185. Two anonymous, counterbalanced packet forms exist for each debate, all sampled speaker attributions are high confidence, and the development reference is sealed from model-facing contexts.

No model context has been executed. No score, participant assessment, Overall Commentary, AI Extension, production page, held-out case, transcription service, or metered API was used or authorized.

| Control | Result |
| --- | ---: |
| Atomic bundles | 8 |
| Diagnostic bundles | 4 |
| Burden bundles | 4 |
| Planned independent initial contexts | 6 |
| Initial agreement required | 8/8 |
| Invalid bundles allowed | 0 |
| Final two-vote resolutions required | 8/8 |
| Scoring fields allowed | 0 |

## Improvements encoded

The diagnostic rule now gives express wrong-source or wrong-object assignment priority over a coincident conceptual conflation. It separately reserves `ambiguity` for meaning shifts or concept confusion without that assignment, and `invalid-inference` for premise-to-conclusion defects.

The burden rule now assigns a direct attack to the attacked route bridge before an alternative that the response only incidentally supports. A subsidiary route must be independently advanced, and a move reaches the motion tier only when it states or directly establishes the complete motion-level result.

Each answer must cite a unique exact substring and explain the positive rule, the default, and the exclusion of the nearest competitor. Anonymous candidate positions are reversed between the two passes to make position bias visible.

## Limits

This is an exposed correction smoke, not a validation result. Its reference values combine retired fixtures and prior two-vote AI resolutions; they are provisional development references, not human ground truth. Perfect agreement on these known cases would show that the corrected instructions are reproducible on the cases that motivated them, but would not establish correctness or generalization.

The sample also cannot test the audio-verification branch because every selected move has high speaker-attribution confidence. That branch remains governed by the existing requirement that medium-confidence moves be checked against audio before adjudication or scoring.

## Quality judgment and next step

Packet engineering, isolation, and preregistration are at an **A level**. Semantic reliability is **not yet graded**, because there are no fresh model outputs. The workflow remains unready for a larger held-out gate or the 195-debate batch.

The next justified step is to implement and independently validate the v3.7.5 execution runner, deterministic disagreement extractor, dispute-only adjudicator, and analyzer without modifying the frozen packets or thresholds. Only after that separate execution lock should the six initial 5.6 Sol contexts run. A pass requires perfect 8-of-8 initial agreement; the threshold must not be lowered after seeing results.
