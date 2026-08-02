# v2.1 complete-debate gate

This directory contains the preregistered three-debate promotion gate for the complete v2.1 workflow. All results are shadow assessments: they do not alter published debates, production ledgers, or rankings.

The gate must preserve this sequence:

1. Commit `gate-manifest.json` before inventory or scoring.
2. Build one complete blind inventory per debate.
3. Run Pass A and Pass B in separate 5.6 Sol tasks using the same locked inventory.
4. Adjudicate only threshold-triggered disagreements.
5. Calculate ledgers mechanically.
6. Draft and novelty-audit the complete scorecards.
7. Reveal legacy results only after the new results are locked.
8. Publish a gate analysis against every preregistered threshold.

## Result

The three-debate gate did not pass. See `reliability-analysis.json` for the locked decision and complete metrics.

- All six side-level Pass A/B overall differences were four points or less.
- Twenty-six of 79 moves required adjudication (32.91%), exceeding the 25% review threshold.
- One of three pass comparisons changed from a tie to a con-side lead.
- Calculations, pass isolation, inventory coverage, and required adjudications passed.
- Three uniform canonical ledgers passed the repository calculator in both write and check modes with zero mismatches.
- One contaminated #05 Pass A attempt was stopped before output and discarded; the retained rerun used a fresh task with an explicit file allowlist.
- Central-quote verification, complete prose scorecards, and AI Extension novelty maps were not completed after the reliability gate failed.

The result does not authorize the ten-debate expansion or corpus-wide reassessment. Required remediation is recorded in `reliability-analysis.json`.
