# Slugfester v4.2.21.17.8 workflow readiness

## Decision

The workflow is **ready for a new disjoint held-out gate, but not yet ready for all 195 debates**. The retired partition three passed the complete inventory, two-judge, deterministic disagreement, audio, isolated adjudication, final-ledger, and one-pass scoring path without semantic repair or scoring leakage.

## Quality

- Six of six independent Sol judgments validated.
- 53 of 54 moves contained material disagreements; all 172 required candidate selections were adjudicated.
- Both medium-confidence moves passed audio verification; no audio move remained unresolved.
- All three final ledgers replayed and passed the unchanged full-source validator.
- All three A/B winner agreements were preserved. Mean final-to-initial score distance was 1.58, maximum distance was 5, and maximum movement outside the A/B range was 1.

## Compute

Observed successful serial model work projects to **78.1 hours** for 195 debates. With four isolated discovery slots and A/B judgments run concurrently, the dependency-critical path projects to **48.8 hours through final scores**, close to the 50-hour target. This excludes publication synthesis, which the new held-out gate must measure.

The production scheduler must use the all-candidate transport projection universally; the retired oversized inventory request that timed out is not part of the production estimate. A portfolio mean target of at most 14 locked moves per debate should be monitored, without truncating burden coverage on unusually complex debates.

## Next gate

Select five new, unseen, dyadic debates—two direct and three partition-routed—excluding Debates 133, 178, and 182. Run the complete workflow once with no retries or corrections. The gate must also reconstruct the public assessment, including Overall Commentary and a clearly AI-labeled, distinctly styled accordion AI Extension, and must measure that publication-synthesis time before authorizing all 195.
