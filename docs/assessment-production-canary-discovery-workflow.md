# Production canary discovery execution

## Scope

This stage freezes and, only after separate launch authorization, executes the 36 score-blind discovery contexts prepared for the ten-debate production canary. It produces candidate inventories for a later inventory-locking stage. It does not score, adjudicate, reconstruct publication prose, or mutate production.

## Model and authentication

Use `5.6 Sol` (`gpt-5.6-sol`) at low reasoning effort through the user's ChatGPT subscription. Run each context in a fresh temporary `CODEX_HOME` containing subscription authentication only. Remove API-key environment variables and disable plugins, apps, memories, skills, browsing, computer use, workspace dependencies, and multi-agent execution.

## Context isolation

Each model context receives exactly four copied files: the frozen discovery manual, one debate packet, one chunk-specific schema, and one chunk ledger. No other chunk, output, debate, legacy assessment, score, winner, tag, Overall Commentary, AI Extension, or publication prose is available.

Require one schema-conforming output per context. Candidate starts must lie in the owned core; candidate ends must remain in available context; speaker identity must use the two-person frozen allowlist. Outputs remain staging-only with `calibrationOnly: true` and cannot mutate production.

## Scheduler and stop rule

Use deterministic context order and a 1→2→4 scheduler ramp. The first real context is the operational canary. Expand to two contexts only if it validates; expand to four only if both second-phase contexts validate. Stop before expansion on any failure. Once steady-state begins, complete already-authorized independent contexts but do not retry or repair a failed output.

Allow one attempt and five minutes per context, with no retries or semantic correction. Maximum concurrency is four. Historical discovery runs imply approximately 40–75 aggregate model-minutes and 13–25 wall-minutes for all 36 contexts; the absolute gate timeout is 120 minutes.

## Deterministic compilation

After every context passes, revalidate all raw outputs, compile every discovered candidate without semantic deduplication, and preserve source spans. Construct a sparse source context containing each candidate span plus twelve flank events. Require at least eight candidates per debate and four per side before authorizing inventory-packet preparation.

Medium or low attribution confidence remains binding. If such a candidate is selected later, the production workflow requires audio verification before adjudication or scoring.

## Authorization boundary

The frozen execution manifest may authorize only these 36 discovery contexts, deterministic validation, candidate compilation, and post-execution analysis. It does not authorize retries, semantic correction, inventory model execution, independent judgments, audio work, adjudication, score derivation, publication, production mutation, or any remaining production batch.
