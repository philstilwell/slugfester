# Slugfester Bounded Lean Workflow v4.1.5

This prospective amendment inherits v4.1 through v4.1.4. It changes only the compute-timing gate; the judgment schema, scoring anchors, source access, model allocation, triggers, audio rule, and score formulas remain unchanged.

## Transport-aware compute timing

Total wall time is always reported. For the three-debate compute gate:

- if all three valid contexts have zero recoverable stream events, compute time uses their ordinary mean;
- if exactly one valid context has one or more allowed recoverable stream events, compute time uses the mean of the two transport-clean contexts;
- at least two transport-clean contexts are required, and more than one recovered context fails timing eligibility; and
- both central and conservative corpus projections add a fixed two-hour transport contingency after the existing five-hour audio, QA, and rendering allowance.

This distinction is limited to compute planning. A recovered context still must pass the preregistered transport-event limit and every deterministic judgment validator. Its full wall time, event count, and debate identity remain visible. The policy does not excuse a timeout, invalid transport classification, schema failure, or substantive inconsistency.

The central projection must remain at most 52 hours and the conservative projection at most 60 hours. For the conservative plan, primary compute time remains the greater of seven minutes and 125% of the eligible mean.

Protocol identity:

- `schemaVersion: 4.1.5-bounded-primary-output`
- `protocolId: v4.1.5-bounded-lean-risk-triggered-consensus`
