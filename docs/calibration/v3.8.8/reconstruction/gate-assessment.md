# v3.8.8 recovered diagnostic gate assessment

## Decision

The recovered three-debate diagnostic is internally valid, but the strict preregistered gate **did not pass**. It does not authorize a ten-debate gate or reassessment of the 195-debate corpus.

Ten of twelve deterministic thresholds passed. The two failures are irreversible for this run:

1. The initial scoring outputs required post-hoc representation-only normalization. No substantive judgment changed, but the preregistered gate required two valid initial passes without recovery.
2. Required audio verification incurred an estimated **$0.09421125** in transcription charges, while the preregistered threshold required exactly $0.

The supplemental isolated Sol audit also found two medium-severity representative-selection defects and one low-severity novelty-label defect. Those findings are not formal v3.8.4 thresholds, but they independently show that the reconstruction selection rules need another revision before scale-up.

## Evidence summary

| Area | Result | Evidence |
| --- | --- | --- |
| Local transcript access | Pass | 195/195 transcripts available and hash-validated; 9/9 source-chain files rehashed for the three debates |
| Required audio verification | Pass operationally | 17/17 medium-confidence moves and 6/6 representative quotations verified |
| Initial scoring cleanliness | **Fail** | Post-hoc representation-only normalization was required; substantive judgment mutations: 0 |
| Mean absolute raw scalar delta | Pass | 3.880071 against a maximum of 5 |
| Material scalar dispute rate | Pass, fragile | 140/567 = 0.246914 against a maximum of 0.25 |
| Final ledger | Pass | 81 moves, 567 final rating fields, zero invented third values, zero unresolved fields |
| Score stability | Pass | Maximum overall A/B delta 2; identical winner classifications; Spearman 0.985184 |
| Burden adjustment | Pass | Zero nonzero final adjustments; calculator identity passed |
| Reconstruction contract | Pass | 3/3 valid; 48 displayed moves; every section/side has a load-bearing move; six verified quotes |
| AI Extension contract | Pass deterministically | 58 novelty-mapped items, balanced structures, correct placement, exact byline, zero prohibited-term hits |
| Supplemental Sol audit | Needs review | Debate 103 passed; Debates 55 and 161 need review; 2 medium and 1 low concern |
| Rendering | Pass | Desktop/mobile, closed/open accordion, keyboard Enter, visible focus, responsive stacking, reduced motion |
| Metered model API | Pass | $0; all model execution authenticated through the ChatGPT subscription with API keys removed |
| Transcription cost | **Fail against frozen threshold** | Estimated $0.09421125; exact billed amount unavailable |

## Supplemental Sol findings

- **Debate 55, medium:** A displayed exchange pairs Craig's Grim Reaper constructive with a Malpass reply aimed at a different target, while omitting the actual target/reply chain. The pairing can mislead a reader about what was answered.
- **Debate 55, low:** “Symmetric explanatory standards” is labeled `introduces`, but it develops Malpass's existing personal-versus-impersonal indeterminism comparison. It should be an extension with the relevant source move.
- **Debate 161, medium:** The first cosmological exchange displays Millican's causation challenge but omits Craig's later locked full answer to that exact move, overstating how unanswered the challenge remained.
- **Debate 103:** All ten adversarial checks passed.

No audit found conclusion inflation, duplicate penalties, asymmetric burden standards, score/prose conflict, quotation error, AI-attribution leakage, systematic charity failure, or unsupported named fallacy/bias tags.

## Quality assessment

As a diagnostic workflow, v3.8.8 is strong: source provenance, audio verification, consensus merging, deterministic score derivation, score stability, AI disclosure, and production-path rendering all worked. The score outputs are substantially more trustworthy than the operational history alone would suggest.

As a rollout workflow, it is not ready. The material disagreement rate passed by only 0.003086, the original scoring schema did not close cleanly, reconstruction required schema-compatibility recovery and a bounded Debate 55 prose correction, and the final adversarial audit caught consequential display-selection errors that deterministic coverage checks missed.

Overall assessment: **B as a recovered diagnostic; not production-ready for 195 debates.** The central scoring machinery is credible, but operational repeatability and representative-exchange fidelity remain below the standard needed for unattended scale.

## Required v3.8.9 revisions

1. **Make clean execution a hard artifact property.** Endpoint-compatible schemas, exact canonical nonanswer summaries, and a full synthetic preflight must pass before any real context. Recovered outputs may diagnose only and can never satisfy a gate.
2. **Replace the impossible $0 transcription rule prospectively.** Keep the frozen v3.8.8 result failed, but preregister a small explicit audio-verification budget in v3.8.9. Linear extrapolation from this test is roughly **$5.50–$6.25 for 195 dyadic debates**, before contingency; a conservative rollout cap should be estimated and approved before execution.
3. **Add consequential reply-closure to representative selection.** When a displayed move has a material direct answer or targets a displayed constructive, show the relevant target/reply chain in the same section or explicitly state that the answer is omitted from the representative view. A Sol audit, not lexical linkage alone, decides consequentiality.
4. **Audit novelty classifications before rendering.** Every `introduces` item must be compared against all source moves. If it develops an existing route, classify it as `extends` or `repairs` and cite the source. Preserve the independent Sol novelty audit.
5. **Add a reliability warning band.** Preserve the formal 0.25 ceiling, but treat results above 0.23 as fragile and require anchor revision or an additional retired calibration before rollout authorization.
6. **Turn the three discovered defects into regression fixtures.** The Debate 55 pairing, Debate 55 novelty label, and Debate 161 omitted answer should fail the next tooling preflight.
7. **Keep 5.6 Sol through the next clean three-debate test and the held-out ten-debate gate.** The current scalar-dispute margin is too narrow to justify a cheaper model substitution. Benchmark a cheaper model only afterward on retired controls, without changing the production protocol mid-gate.
8. **Retain the dyadic-only production lane.** Three-or-more-speaker debates should remain outside the 195-debate core process until a separately preregistered attribution and coalition-scoring lane passes its own tests.

## Next checkpoint

Implement v3.8.9, preregister a **fresh retired three-debate clean gate**, and require first-attempt-valid scoring/reconstruction contexts plus a clean supplemental audit. Only a clean pass should unlock the preregistered held-out ten-debate gate. A passed ten-debate gate would then justify phased corpus execution with periodic control debates, not one unattended 195-debate batch.
