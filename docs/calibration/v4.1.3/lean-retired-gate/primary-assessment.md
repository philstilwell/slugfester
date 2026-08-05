# v4.1.3 retired primary gate assessment

Status: **failed; primary analysis blocked**

All three frozen 5.6 Sol/low contexts completed on their single authorized attempt. Debates 55 and 103 passed deterministic validation. Debate 161 failed because two selected moves declared `tier: central` while referencing `con-reliability`, a bridge declared as `tier: subsidiary` in the same output.

The validator stopped at the first mismatch:

```text
moves[4]: burden tier does not match bridge
```

The affected moves were `con-diversity-burden` and `pro-reliability-reply`. The artifact cannot establish whether the intended correction was to promote the reliability bridge to central or to treat the two moves as subsidiary and rescore relevance/burden within 55–74. Repository code therefore did not normalize the tier, bridge, or rating and did not derive scores.

## Context results

| Debate | Elapsed | Sections | Moves | Transport | Result |
| --- | ---: | ---: | ---: | --- | --- |
| 55 | 4.36 min | 5 | 10 | Clean | Valid |
| 103 | 4.45 min | 5 | 12 | Clean | Valid |
| 161 | 3.74 min | 5 | 10 | Clean | Invalid burden tuple |

Aggregate elapsed time was 12.55 minutes, or 4.18 minutes per attempted debate. If used only as a runtime diagnostic, that primary mean would imply approximately 37.67 aggregate hours under the central planning inputs; the preregistered conservative floor remains 52.06 hours. These are not promotion projections because the quality gate failed.

## Execution facts

- Contexts planned: 3
- Contexts attempted: 3
- Valid contexts: 2
- Attempts: 3
- Retries: 0
- Recoverable stream events: 0
- Metered API cost: $0
- Transcription cost: $0

## Consequence

v4.1.3 does not authorize primary analysis, comparator inspection, score derivation, audio work, Pass B, adjudication, reconstruction, production mutation, or the full corpus. A later prospective amendment may add the missing invariant to the pre-submission consistency pass: every `burdenContact.tier` must exactly equal the tier of its referenced bridge before the relevance/burden range is checked.
