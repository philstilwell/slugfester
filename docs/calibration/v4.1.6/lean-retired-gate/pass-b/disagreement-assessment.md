# v4.1.6 deterministic disagreement assessment

Status: **passed; dispute-only adjudication preparation authorized**.

Repository code compared all 34 locked moves from the three valid primary artifacts with their independent Pass B counterparts. The comparison used the frozen v3.8.11/v4.0 triggers: every response-tuple mismatch, charity-tested-state mismatch, score-driving scalar delta greater than five, diagnostic move-score delta greater than four, and burden-adjustment semantic mismatch is disputed. Precision and epistemic-calibration values were first derived from their closed findings with the mandatory v4.0.1 mapping, so a categorical anchor difference that changes a score-driving value could not escape the scalar rule.

All 34 moves contain at least one qualifying disputed field. The extractor found 14 response-tuple disputes, three charity-state disputes, 145 exposed score-driving fields, 21 diagnostic move triggers, and six burden-adjustment disputes. It also identified 39 unequal raw scalar fields below the dispute thresholds; those values remain unavailable to adjudication and are preregistered for a rounded-mean merge only after adjudication closes.

The 100% disputed-move rate does not mean every field is open. Routes, section identities and weights, move inventory, speakers, propositions, source spans, importance, nondisputed structural fields, calculated scores, and publication prose remain locked. The third pass may see and select only the two anonymous candidates for each mechanically exposed field.

This retired sample therefore requires adjudication for all three debates rather than the planning assumption that only half of escalated debates would need it. That observation must be incorporated into the measured compute analysis after the adjudication run. No adjudication execution, score derivation, publication finalization, production mutation, held-out gate, or 195-debate run is authorized by this artifact.
