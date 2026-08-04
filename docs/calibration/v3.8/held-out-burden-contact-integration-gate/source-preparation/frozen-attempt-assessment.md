# v3.8 frozen source-preparation attempt assessment

**FAIL — STOPPED AT THE PROPOSAL BOUNDARY.** The preregistered v3.8 source-preparation execution did not produce any valid proposal context. Review, disagreement extraction, adjudication, audio verification, burden-contact classification, scoring, assessment prose, and production mutation therefore remained blocked.

The three proposal contexts used the frozen 5.6 Sol/high configuration through ChatGPT subscription authentication with API keys removed. Debate 103 completed in 340.461 seconds and Debate 55 completed in 406.052 seconds. Both returned substantial, source-grounded JSON, but the deterministic validator rejected the first candidate ID: the output schema permitted an arbitrary string while the validator required the canonical `debate-id-candidate-01` sequence. Debate 161 produced no output and was terminated by the operator after the invocation exceeded the announced 45-minute diagnostic ceiling; the frozen runner had no preregistered timeout.

The audit identified four additional structural defects:

1. `provisionalBurdenContact` encoded subsidiary targets as `tier + bridgeIndex`. The completed outputs treated `bridgeIndex` as if it referred to the route's overall bridge position, while the validator interpreted it within the tier-filtered subsidiary array. This can silently bind a move to the wrong bridge even after an ID-only repair.
2. The two completed contexts recorded four same-request stream recoveries in total, exceeding the frozen maximum of zero. These were not output retries, but the result still violates the execution lock as written.
3. The runner's phase-lock helper included each future review or adjudication output in the set to hash before that stage ran. Even a fully valid proposal stage would therefore have stopped on a missing future file.
4. The dry fixture exercised semantic disagreement handling but did not execute the real phase-boundary file lifecycle, so it could not expose the phase-lock defect.

The invalid proposal outputs are retained only as failure evidence and must not be normalized, accepted, reviewed, adjudicated, scored, or reused in a corrected run. A separately frozen correction must rerun all three proposal contexts.

## Required correction

- Remove model-authored candidate IDs from the proposal interface and derive canonical IDs deterministically from debate identity and array position, while preserving both raw and enriched output hashes.
- Replace composite bridge coordinates with one explicit `bridgeId`; derive side and tier from the frozen route map.
- Hash only inputs and already completed upstream artifacts in pre-stage phase locks.
- Add a preregistered per-invocation timeout, explicit timed-out status, graceful child termination, and elapsed-time fields.
- Treat same-request stream recovery separately from inference retry and preregister a bounded allowance appropriate to subscription transport.
- Add an end-to-end filesystem dry run that reaches proposal, review-lock, review, adjudication-lock, and analysis boundaries using synthetic outputs.
- Keep the existing requirements for two independent source judgments, dispute-only isolated adjudication, medium-confidence audio verification, and no scoring before source preparation and burden-contact adjudication are complete.

Metered API cost was **$0**. Transcription cost was **$0**. No new transcript was requested because all three committed local transcript/event chains had already passed hash verification.
