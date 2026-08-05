# v4.0.1 lean retired-primary failure

The frozen three-context retired-primary gate failed and cannot be retried, repaired, normalized, or counted toward passage. All three contexts ran exactly once with ChatGPT subscription authentication, API keys removed, $0 metered API cost, and $0 transcription cost. Only Debate 55 passed deterministic validation.

## Frozen results

| Debate | Result | Elapsed | Stream events | Sections | Moves | Deterministic failure |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 55 | valid | 18.17 min | 0 | 5 | 34 | none |
| 103 | invalid | 16.58 min | 1 | 5 | 21 | `sec-salvation` contained no selected con-side move |
| 161 | invalid | 56.91 min | 1 | 6 | 27 | both routes omitted the required subsidiary bridge tier |

Every selected move in all three outputs used high source-attribution confidence, so the failed primary artifacts did not trigger medium-confidence audio verification. That fact does not rescue either invalid output.

The execution used 91.66 aggregate minutes, or 30.55 minutes per primary debate. Substituting that measured mean into the frozen v4.0.1 compute model projects 99.30 primary hours and 123.26 total hours for 195 debates. This fails both the 52-hour central target and the 60-hour conservative ceiling. Even the two shorter contexts averaged 17.38 minutes, so the runtime defect is not solely a Debate 161 outlier.

## Failure classification

The gate exposed three independent workflow defects:

1. **Section-participation compliance:** the exact endpoint schema cannot express the relational rule that every scored section must contain selected moves from both sides, and the prompt did not reliably enforce it.
2. **Route-tier compliance:** the endpoint schema permits a route with no subsidiary bridge even though deterministic semantic validation prohibits it.
3. **Runtime and orchestration:** full-transcript Sol/high integrated judgments are too slow for the agreed corpus budget. The runner also recorded later contexts after Debate 103 failed instead of short-circuiting immediately, contrary to the written stop rule.

The two reconnects were recoverable same-attempt transport events under the frozen allowance, not retries. Debate 161 replayed substantial source-reading work after its reconnect, materially increasing elapsed time. The runtime gate still uses observed wall time because production planning must include real transport overhead.

## Prospective amendment required

A new protocol revision must, before another live gate:

1. make the section and route structural contracts endpoint-enforceable where possible and preflight every remaining relational invariant;
2. short-circuit the live runner after the first invalid context while still writing a complete execution record;
3. retain complete local transcript and events access but bound the primary inventory and reduce the primary reasoning budget;
4. reserve Sol/high for triggered Pass B or adjudication rather than every primary debate;
5. compare the faster configuration against these frozen high-effort artifacts and the retired diagnostic comparator without importing either into model contexts; and
6. require a measured central projection of at most 52 hours and conservative projection of at most 60 hours before any held-out or corpus authorization.

This failed gate authorizes no Pass B, adjudication, finalization, reconstruction, held-out gate, production mutation, or reassessment of the 195 debates.
