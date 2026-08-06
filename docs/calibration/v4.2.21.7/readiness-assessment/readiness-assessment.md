# Slugfester v4.2.21.7 Workflow Readiness Assessment

## Decision

**Promising, but not ready for the 195-debate run.** The semantic-consensus and scoring pipeline now works end to end on three debates, but a frozen disjoint five-debate held-out gate is still required.

## What passed

- Complete local transcript/source-chain validation for both passes and the final ledger.
- Three independent Pass B judgments accepted after the charity-closure recovery.
- Five medium-confidence audio moves verified with no unresolved attribution.
- Three dispute-only adjudications passed on the first attempt.
- All 160 candidate selections and 64 deferred means replayed deterministically.
- Final score stability passed: mean distance from the initial passes was **2.5**, the maximum was **6**, and every final side score stayed inside the Pass A/Pass B interval.

## Why the corpus run is not yet authorized

- Every sampled move opened at least one dispute (**34/34**), making adjudication the normal path.
- The three debates were used while repairing the workflow and are no longer clean held-out evidence.
- Publication prose and the labeled accordion **AI Extension** have not yet been regenerated from the adjudicated ledger.
- Current observed direct-lane runtime extrapolates to **53.52 compute-hours** for consensus/scoring and about **67.34 hours** including the current publication-finalization assumption. That is already above the 50-hour target and is only a lower-bound extrapolation.
- **102 of 109** source-valid candidates in the last selection required partition routing. The current three-debate end-to-end test covered only the direct lane, so corpus-wide compute cannot yet be estimated responsibly.
- The stricter rubric runs lower than existing production scores by an average of **10 points per side**, although all three winner classifications match. Existing scores remain diagnostic only, not ground truth.

## Next gate

Freeze five unseen two-speaker debates—two direct and three partition-routed—stratified by topic, duration, source quality, density, and attribution difficulty. Run the complete consensus, audio, adjudication, score, and publication reconstruction path once, with no retries or corrections. The publication artifacts must include Overall Commentary and a clearly AI-labeled, distinctly styled accordion AI Extension, with no use of the forbidden wording.

The held-out execution needs a fresh cost estimate. At the observed audio rate, five debates would likely use about **8.07 transcription minutes**, approximately **$0.05** at current pricing; model work remains under the ChatGPT subscription.
