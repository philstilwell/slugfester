# v2.1 calibration artifacts

These files test `Slugfester Reassessment Workflow v2.1`; they are not published scorecards and do not feed Slugfester rankings.

- `pilot-manifest.json`: the ten-debate varied sample, locked before scoring.
- `source-manifests/`: retrieval metadata and hashes. Full captions remain in ignored `.assessment-cache/` storage.
- `benchmark-definitions/`: score-blind targeted move inputs. They contain no legacy score, critique, tag, or commentary.
- `pilot-judgments.json`: the two raw 5.6 Sol scoring passes and post-score tag decisions.
- `ledgers/`: deterministically calculated v2.1 results with preserved pass disagreement and adjudication data.
- `pilot-analysis.md` and `.json`: reproducible analysis and the production recommendation.
- `promotion-gate-template.json`: preregistration template for the next complete-debate gate.

Rebuild deterministic artifacts with `npm run assessment:v2.1:build`. Validate them with `npm run assessment:v2.1:check`.

The blind packets and complete transcript text are deliberately ignored because they contain large third-party caption datasets. Their hashes are committed so local source packets can be verified without republishing the transcripts.
