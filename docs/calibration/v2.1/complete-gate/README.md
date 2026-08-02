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

