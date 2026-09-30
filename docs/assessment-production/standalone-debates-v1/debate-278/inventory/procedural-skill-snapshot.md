---
name: reassess-slugfester-debates
description: Reassess and reconstruct Slugfester debate scorecards from complete local transcripts using two isolated AI judgments, deterministic disagreement extraction, disputed-field adjudication, audio escalation, repository-derived scores, integrity-checked publication prose, and a clearly disclosed AI Extension. Use for calibration gates, individual debate rescoring, production batches, score-consistency audits, or rebuilding the Slugfester debate corpus.
---

# Reassess Slugfester Debates

Produce an auditable transcript-grounded assessment. Treat AI adjudicated consensus as an estimate, not ground truth, and describe the actual execution context honestly.

## Required project sources

Before acting, read the target repository's:

- `AGENTS.md`;
- `docs/assessment-production-workflow.md` for the promoted operational sequence and stop rules;
- `docs/reassessment-rubric-v2.1.md` for scoring anchors and formulas;
- `docs/assessment-workflow-v4.2.21.17.41.md` for the publication/readiness controls;
- current debate schema, score calculator, validators, and production manifest.

Read [references/output-contract.md](references/output-contract.md) before publication reconstruction. Read [references/rubric-v2.md](references/rubric-v2.md) only when the repository rubric is unavailable; the repository version is authoritative.

## Non-negotiable gates

1. Confirm the requested model is actually selected. Record its exact label; never relabel prior work.
2. Before paid transcription or another metered service, state the estimated cost and obtain approval. Prefer the complete canonical local transcript chain.
3. Fail closed unless `transcript.txt`, `events.json`, and `manifest.json` exist locally and their hashes validate.
4. Apply the production workflow only to one-substantive-speaker-per-side debates. Preserve 3+ speaker debates as excluded.
5. Keep legacy assessments, scores, prose, tags, winners, and other debates out of all judgment contexts.
6. Run two isolated model judgments on the same locked score-blind packet. Preserve both raw outputs.
7. Extract disputes deterministically. Audio-verify every below-high-confidence move; medium confidence always triggers verification.
8. Run a third isolated pass on disputed fields only. Preserve anonymous initial options and the adjudication result.
9. Assemble a fully resolved ledger, then derive scores once in repository code. Models never author totals and humans never hand-adjust them.
10. Reconstruct publication prose only after scores lock. AI Extension material never affects participant scores.
11. Permit only bounded field-level publication repairs authorized by the frozen workflow. Revalidate the complete debate after merging.
12. Validate source hashes, semantic structure, scores, quotations, prose integrity, AI disclosure/novelty, desktop/mobile layout, and accordion accessibility before any production mutation.

## Execution discipline

Freeze manifests before model calls. Use fresh isolated subscription-backed contexts with API keys removed. Record model, reasoning effort, timestamps, hashes, copied-input sizes, attempts, and costs. Do not retry or expand writable fields unless the frozen manifest explicitly permits it.

Run corpus work in stage batches at the manifest's tested concurrency and stop at required checkpoints. A missing source, ambiguous speaker count, unresolved audio trigger, invalid judgment, unresolved dispute, score mutation, non-exact quotation, failed repair, rendering regression, or schedule breach blocks that debate or batch.

For any production-site mutation, start from an up-to-date clean `main` and create a dedicated topic branch before the first write. After generated pages are current, run `npm run site:preflight` and fix every failure before committing; do not casually raise the catalogue baseline to silence a size regression. Push only the topic branch, open a pull request against `main`, wait for the required `accessibility-and-performance` check, and merge only when it passes. Fetch afterward and verify that `origin/main` contains the merged commit. Calibration-only work that does not change the public site remains governed by its own frozen workflow.

## Completion report

If a publication change creates a new interlocutor profile, add a short, neutral biography with a verified public source and actual review date in `src/data/interlocutor-bios.js`, following `docs/interlocutor-biographies.md`. This applies to team-only profiles too. Keep biographies out of all judgment contexts and calculations. Run the biography coverage check through site validation and confirm desktop/mobile placement alongside the score profile. Do not rewrite unrelated existing biographies during reassessment.

Report corpus disposition, source/hash status, model and authentication, pass isolation, dispute/audio/adjudication counts, calculated scores, publication repairs, validation/rendering results, elapsed time and fees, saved artifact paths, and the next authorized action. Distinguish participant analysis from the separately labeled AI contribution.
