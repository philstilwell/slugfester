# Post-campaign operator guide

## Completion state and scope

The reassessment campaign closed successfully on `main` at commit `055bd337e35256e532a5c188851f79d0daa7ba09`. It covers 174 unique debates: the 10-debate production checkpoint and all 164 debates in the frozen continuation pool. Batches 1–16 contain ten debates each; Batch 17 contains the final four. The frozen pool is exhausted.

After closure, a separately authorized calibration-promotion release published Debates 51, 63, 90, 153, and 165 from their existing frozen calibration judgments and single score pass. It made no new judgment or score calculation and is not Batch 18. Production now contains 179 authenticated assessment ledgers: the unchanged 174-debate campaign population plus these five supplemental records. Its durable records are the [promotion report](../calibration-promotion-v1/report.md), [manifest](../calibration-promotion-v1/manifest.json), and [validation summary](../calibration-promotion-v1/validation-summary.json).

Do not select Batch 18, create a Batch 18 directory, or treat ordinary site maintenance as another reassessment batch. A future reassessment campaign would require a new, explicitly authorized protocol and a new evidence namespace.

The authoritative closure records are the [report](../campaign-closure-v1/report.md), [manifest](../campaign-closure-v1/manifest.json), and [validation summary](../campaign-closure-v1/validation-summary.json). The frozen production workflow remains documented in [the assessment-production workflow](../../assessment-production-workflow.md).

## Run the closure checks

Use the repository-only replay in a fresh checkout or any environment without the local campaign cache:

```bash
npm run assessment:campaign:closure:repository:check
```

This deterministic, zero-cost check validates all tracked closure evidence, all 174 published reassessments and production ledgers, 696 passing rendering screenshots, 99 completed audio verifications, the deterministic selection census, and the tracked manifests that lock the ignored source hashes. It does not claim to re-read ignored local evidence bytes. The portable boundary contains 794 files: 522 transcript-chain files, 174 compact ledgers, and 98 paid-audio transcript JSON files. They supply 1,316 references across the selection and final-ledger checks; repository-only mode verifies their frozen hash claims through the tracked records that contain them.

Use the full replay on the campaign workstation when `.assessment-cache/` is intact:

```bash
npm run assessment:campaign:closure:check
```

The full replay performs every repository-only check and also rehashes the local transcript-chain, compact-ledger, and paid-audio transcript bytes. It fails if those local files are absent. This is intentional: `.assessment-cache/` and the relevant `output/transcribe/` artifacts are ignored, were never part of a clean checkout, and should not be committed merely to make the full replay portable.

`npm run check` runs the normal repository suite and then invokes the repository-only closure replay through the standard `postcheck` step. Some earlier checks in that suite also inspect the local transcript corpus, so use the dedicated repository-only command when testing a truly cache-free checkout.

The same lifecycle also runs the calibration-promotion repository-only check. It can be invoked directly with:

```bash
npm run assessment:calibration-promotion:repository:check
```

On the campaign workstation, `npm run assessment:calibration-promotion:check` additionally rehashes the five ignored local event files used to replay the frozen calibration score ledgers.

Neither command calls a model, a transcription service, or any paid service. Never run the closure checker with `--write` during maintenance; that option reconstructs the frozen closure report and manifest and belongs only to the completed closure procedure.

## Immutable evidence

Treat these campaign materials as immutable:

- frozen selections, inventories, judgments, disagreements, adjudications, final ledgers, calculated-score artifacts, publication candidates, production locks, and compatibility records under the checkpoint and Batch 1–17 archive;
- the 174 campaign entries in `src/data/debates.js` and their production ledgers in `docs/assessment-ledgers/`;
- the five promoted calibration entries, their production ledgers, staged candidates, source locks, rendering evidence, and supplemental promotion records;
- canonical source transcripts, events, manifests, compact ledgers, and every retained source hash;
- paid-audio source clips, transcripts, attributions, hashes, usage records, and failure records;
- rendering audits, evidence JSON, required screenshots, hashes, dimensions, and preserved partial-failure screenshots;
- campaign-closure artifacts and every historical failure, diagnosis, authorization, and recovery record.

Do not rerun scoring, manually edit calculated scores, reuse rejected prose, alter accepted prose, rewrite history to remove failures, or regenerate a frozen evidence file in place. If an immutable file appears corrupted, stop and compare it with the closure manifest and repository history; do not “repair” it by weakening a validator.

## Costs and recovery history

The consolidated recorded audio estimate is **$3.6544575** across 101 paid attempts and 100 completed calls. It is not a known invoice total: the checkpoint amount is duration-derived, Batch 1–17 amounts are usage-derived, and actual provider charges were not retained. Batch 1's post-call estimate was $0.1190425, which was $0.0190425 above its original estimate cap; the acknowledged overage remains in the historical record. The closure and this handoff pass incurred $0 direct incremental cost.

The archive preserves 131 model-execution records in recovery, repair, resumption, or correction paths, including 27 that explicitly document field-disjoint handling. It also preserves two authorized third-level publication recoveries, one failed paid transport attempt and its authorized Batch 16 replacement, closure-audit normalization recoveries, and no fourth campaign recovery level. These counts describe retained history; they are not permission to resume the campaign.

## Known historical-validator limitations

Five historical wrappers intentionally do not pass against the final published tree. They lock preparation-time absence, pre-publication hashes, original failed attempts, or mutable diagnostic references. Their representative failures and diagnoses are preserved under `campaign-closure-v1/stale-*-diagnosis/`. Use the accepted-output validators and the closure checker for the final state; do not edit old wrappers or their evidence to make them green.

The full closure replay is workstation-dependent only because the canonical transcript, compact-ledger, and paid-audio transcript bytes live in ignored local paths. Repository-only replay verifies the tracked hash locks but cannot independently rehash absent bytes. The closure manifest also records six other qualifications, including the estimated-cost basis, 36 preserved partial-failure screenshots, extensive Batch 9 source-acquisition history, and one deterministic Debate 24 title correction that changed no score or ledger field.

## Safe unrelated site maintenance

1. Start from a clean, synchronized `main` and create a narrowly scoped change.
2. Keep edits outside the frozen campaign evidence. For `src/data/debates.js`, confirm that no campaign debate object changes unless a separately authorized correction explicitly requires it.
3. If routes, titles, search data, debate identities, or reference pages change, run `npm run seo` and review the generated diff. Generated files are derived, but an unrelated change should not silently alter frozen reassessment content.
4. Run `npm run check`. If the local transcript cache is unavailable, also run the dedicated repository-only closure command and record the earlier transcript-check limitation accurately.
5. On the campaign workstation, run `npm run assessment:campaign:closure:check` for the strongest evidence replay.
6. Review `git diff` and `git status` before committing. A closure-audit failure is a stop signal, not an invitation to change frozen evidence or weaken the checker.
7. Fetch before pushing, never force-push, and verify local `HEAD`, local `main`, and `origin/main` equality afterward.
8. Remove temporary files and close local servers or browser sessions.

Normal improvements to application code, styles, non-campaign pages, documentation, and deterministic generated pages remain possible when they preserve the immutable boundary and pass the repository checks.
