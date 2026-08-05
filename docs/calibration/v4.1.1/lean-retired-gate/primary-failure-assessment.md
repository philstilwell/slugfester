# v4.1.1 bounded retired-primary failure

The frozen fail-fast retired-primary gate failed and cannot be retried, repaired, normalized, or counted toward passage. Debate 55 passed on its only attempt. Debate 103 failed deterministic chronology validation, so the runner correctly skipped Debate 161.

| Debate | Result | Elapsed | Stream events | Sections | Moves | Deterministic result |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 55 | valid | 8.57 min | 0 | 5 | 20 | passed |
| 103 | invalid | 7.58 min | 0 | 5 | 15 | duplicated sequence 9; no sequence 15 |
| 161 | skipped | — | — | — | — | fail-fast stop rule |

All selected source attributions in both attempted contexts were high confidence, so neither artifact created an audio-verification obligation. Debate 55 included a medium assessment-confidence move, which would have correctly triggered Pass B had the primary stage passed.

The two attempted contexts averaged 8.08 minutes. If used as a provisional runtime sample, the central 195-debate projection is approximately 50.34 hours, while the conservative projection using 120% of the measured mean is approximately 60.82 hours. The former passes the 52-hour target; the latter narrowly fails the 60-hour ceiling. The skipped 23.4k-word stress case would likely increase, not reduce, the uncertainty.

The sequence number is redundant with every move's locked `sourceSpan.startEvent` and `sourceSpan.endEvent`. The required amendment is prospective:

1. remove model-supplied sequence numbers;
2. derive a deterministic global chronology by source start event, source end event, then move ID;
3. retain the rule that a reply may target only a source-earlier selected move;
4. lower only the bounded primary context from Sol/medium to Sol/low, while retaining Sol/high for triggered Pass B and adjudication;
5. rerun deterministic fixtures and one exact-schema synthetic preflight under a new protocol identity; and
6. freeze a new fail-fast retired gate only if the preflight passes.

This attempt used ChatGPT subscription authentication, no API key, no retries, $0 metered API cost, and $0 transcription cost. It authorizes no Pass B, adjudication, held-out gate, finalization, reconstruction, production mutation, or corpus run.
