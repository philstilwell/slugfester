# v3.8.2 held-out source-preparation assessment

## Outcome

The v3.8.2 held-out source-preparation continuation passed every frozen source-stage requirement. All three reused v3.8.1 proposals revalidated against their pinned hashes, all three independent 5.6 Sol reviews completed with valid outputs, and deterministic comparison found 127 initial agreements across 132 fields (96.2%). The five disagreements were submitted to three isolated, dispute-only adjudications. Every field finished with two matching votes, leaving no unresolved source field.

The final locked inventory contains four moves from each of Debates 55, 103, and 161, for 12 moves total. Every selected move has high attribution confidence. Consequently, the frozen audio rule was applied but produced no required audio verification; it was not waived.

| Result | Count |
| --- | ---: |
| Reused proposals revalidated | 3/3 |
| Independent reviews valid | 3/3 |
| Initial field agreements | 127/132 |
| Initial field disagreements | 5/132 |
| Final two-vote fields | 132/132 |
| Unresolved fields | 0 |
| Required audio verifications | 0 |
| Selected moves | 12 |
| Model-output retries | 0 |
| Same-request stream recoveries | 1 |
| Metered API cost | $0 |
| Transcription cost | $0 |

## What the disagreements show

All five disagreements concerned only `provisionalBurdenContact`. There was no disagreement about whether a route, bridge, or move was valid; no disagreement about speaker or side; and no disagreement about attribution confidence. The disputed cases were boundary decisions about direct attack versus compatible support, subsidiary versus motion-level contact, or which nearby bridge was the most exact target.

The third passes resolved those cases without receiving agreed fields and without inventing new values. They selected only among anonymized, counterbalanced options supplied by the deterministic extractor. These outcomes are source-preparation aids, not truth keys, and remain hidden from the later classifiers.

This disagreement pattern is favorable for the source stage. The independent passes consistently recovered the same debate structure and usable source material while surfacing precisely the semantic burden-contact ambiguity that the later classification stage is intended to test independently.

## Execution quality

Isolation, source provenance, deterministic validation, adjudication scope, and cost control performed at an **A level**. Each of the six model contexts completed on its sole inference attempt; there were no timeouts, schema rejections, invalid items, scoring fields, paid API calls, or transcription calls. Phase locks hash every model-visible transcript, event file, packet, schema, and completed upstream artifact while excluding future outputs.

The corrected transport detector also passed its live test. Debate 103 emitted one genuine anchored `codex_core::responses_retry` warning, including the turn ID and retry counters. The same request recovered and returned one valid output before its 60-minute timeout. Ordinary words that falsely triggered v3.8.1 were not counted. The other five model contexts emitted no structured recovery event.

Source-preparation repeatability is **A-minus within this three-debate gate**. The 96.2% initial field agreement is strong, the five differences were narrow and adjudicable, and all 24 proposed candidates survived validity review before deterministic balanced selection. The grade remains below an unrestricted A because three debates are too few to establish corpus-wide behavior and the audio-verification branch was not exercised by a medium-confidence case.

## Remaining risks

The principal engineering risk is latency variance. Debate 103's review took 3,437,787 ms (57 minutes 18 seconds), close to the frozen 60-minute timeout, while the other reviews took about three to four minutes. It completed validly, but a 195-debate run needs concurrency limits, durable progress records, and explicit recovery policy so one slow context cannot obscure batch status.

This gate did not classify burden contact, score either participant, generate assessment prose, create Overall Commentary or AI Extension, alter a benchmark, or mutate a production debate. It therefore cannot establish the quality of those downstream stages. It also cannot validate treatment of debates with three or more substantive speakers; those remain outside the dyadic workflow.

## Readiness judgment

The adjudicated-consensus source-preparation workflow is ready to advance to a separately frozen burden-contact classification-packet stage for these held-out debates. It is not yet ready to run all 195 debates or to publish reassessments. That broader decision requires successful classification, post-adjudication score derivation, and prose reconstruction gates using only the locked source inventory.

The next authorized step is to preregister and deterministically construct classification packets from the 12 locked moves. The construction must hide all provisional burden-contact values and adjudication rationales, preserve the two-independent-pass plus dispute-only-third-pass design, and prohibit model execution until packet hashes, schemas, thresholds, and phase boundaries are frozen in a new manifest.
