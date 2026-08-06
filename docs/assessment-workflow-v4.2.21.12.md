# Slugfester Simplified Partition Discovery v4.2.21.12

This prospective successor removes the unnecessary target-ID dependency that caused the v4.2.21.11 gate to fail at 11/12 valid contexts. It makes no model or audio call, derives no score, and reuses none of the predecessor outputs for assessment.

Discovery response intent now contains only `kind` and `earlierTargetDescription`. `kind` is either `constructive` or `reply`; every reply must describe its earlier contrary target in at least thirty characters. Candidate target IDs are structurally absent, so same-side, future, and missing candidate-ID failures cannot occur during score-blind discovery. The repository derives only `moveKind`. Primary Pass A remains solely responsible for target IDs among the moves it actually selects.

All source partition plans, exact chunk ledgers, context ceilings, start-event ownership, confidence policy, and no-silent-deduplication rule remain unchanged. A new gate must rerun all twelve contexts under fresh isolation. The eleven predecessor successes are fixtures only and are not assessment inputs.
