# v4.1.4 retired primary gate assessment

Status: **structurally passed; operational gate failed**

All three frozen 5.6 Sol/low contexts passed deterministic validation on one attempt each. The bridge-reference amendment corrected the v4.1.3 failure: every selected burden contact referenced a declared bridge, copied its exact tier, and used the matching relevance/burden band. No context required normalization or replay.

The gate nevertheless failed its runtime ceilings. Aggregate elapsed time was 28.66 minutes, or 9.55 minutes per debate. The resulting projection is 55.13 hours centrally and 68.13 hours conservatively, above the preregistered 52-hour central and 60-hour conservative limits.

## Context results

| Debate | Elapsed | Sections | Moves | Transport | Provisional score | Comparator | Winner |
| --- | ---: | ---: | ---: | --- | --- | --- | --- |
| 55 | 4.04 min | 6 | 12 | Clean | 78–87 | 71–81 | Con preserved |
| 103 | 5.14 min | 4 | 11 | Clean | 82–77 | 76–67 | Pro preserved |
| 161 | 19.48 min | 5 | 10 | One recovered stream event | 74–84 | 68–78 | Con preserved |

Debate 161's recovered connection makes the wall-time mean an obvious outlier relative to the two clean v4.1.4 contexts and its 3.74-minute clean v4.1.3 attempt. The frozen runtime rule, however, did not authorize excluding that time, so the recorded gate result remains a failure.

## Quality signals

- Winner classifications preserved: 3 of 3
- Sides within five comparator points: 0 of 6
- Score deltas: Debate 55 +7/+6, Debate 103 +6/+10, Debate 161 +6/+6
- Triggered debates: 3 of 3
- Pending audio-verification moves: 0

The scores are provisional. Debate 55 triggered on a band boundary, Debate 103 on winner sensitivity and a band boundary, and Debate 161 on the frozen control plus two band boundaries. All three therefore require an isolated high-effort Pass B before comparator acceptance can be assessed. v4.1.4 does not authorize those contexts because runtime failed first.

## Execution facts

- Contexts: 3
- Valid contexts: 3
- Attempts: 3
- Retries: 0
- Recoverable stream events: 1
- Metered API cost: $0
- Transcription cost: $0

## Consequence

v4.1.4 does not authorize Pass B, adjudication, reconstruction, production mutation, or the full corpus. A prospective runtime amendment may distinguish compute planning from recovered transport wall time, but it must freeze that rule before a new gate rather than retroactively changing this result.
