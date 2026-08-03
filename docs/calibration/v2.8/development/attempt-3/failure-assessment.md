# v2.8.2 attempt-3 failure assessment

Attempt 3 failed its preregistered reliability analysis and remains classification-only. Both independent 5.6 Sol passes stayed within the five-file blind packet, completed all 25 cases, passed evidence and schema validation, and cleared every non-degeneracy floor. The completion controls added after v2.8.1 therefore worked. The semantic contract did not.

Only 3 of 18 hard gates passed. Agreement was 0.84 for target object, 0.855 for component contact, 0.68 for responsive coverage (kappa 0.50), 0.50 for diagnostic object, 0.737 for impact, 0.76 for burden relevance (kappa 0.46), and 0.36 for the exact derived tuple. Reframe agreement passed at 0.92, but neither pass achieved the required 1.00 positive recall against the frozen key. Component-operation exact agreement was only 0.645, and exact operation accuracy against the key was 0.52 for A and 0.32 for B.

The failure is not explained by the multi-speaker lane. On this sample, multi-speaker cases had higher agreement than dyadic cases for target object, component contact, coverage, burden relevance, and the exact derived tuple. Multi-speaker debates therefore remain a separately reported lane; they are not removed from the corpus.

## Diagnosis

1. The schema asks one pass to make several distinctions that are more granular than the eventual score requires. In particular, operation subtype, packet-versus-component diagnostic object, impact subtype, and bridge direction create disagreement without improving the responsiveness or burden-relevance score.
2. `direct`, `connected-example`, and `object-change` are forced alternatives even when a response both contacts the original target and introduces a new comparison or example. Because object change automatically substitutes the target, a mapping disagreement cascades into component, coverage, diagnostic, bridge, burden, and tuple disagreement.
3. Component contact is inferred through a seven-way operation taxonomy. Annotators can agree that a clause addresses a component while disagreeing whether it accepts, explains, qualifies, distinguishes, denies, or undermines it. The scoring-relevant contact decision needs its own binary primitive.
4. Diagnostic-object selection is underdetermined when a criticism grammatically names one premise but expressly claims a consequence for the full inference. A packet/component distinction should not be a hard scoring gate.
5. Bridge `supports` versus `attacks` is irrelevant to burden relevance, which depends on whether and at what route tier the move engages the burden. Direction should be evaluated as argument quality, not used in the burden-contact identity.
6. The carried-forward key was independently readjudicated once, but the low operation accuracy of both blind passes shows that one unadjudicated key is not credible enough for a fine-grained gold-standard comparison. The next key requires two independent key annotations plus an explicit adjudication ledger before blind passes.
7. The analyzer's frozen failure message says “attempt 2.” This is a provenance-label defect inherited by mechanical versioning, not a scoring defect. The immutable analysis remains unchanged; this decision record supplies the correct attempt number.

## Required v2.9 changes

- Separate `originalTargetContact` from `connectedExample` and `exclusiveObjectSubstitution`. A response is substituted only when it exclusively answers a changed object and contains no evidenced contact with the original target.
- Record binary contact for every indispensable component. Derive coverage from those booleans. Keep response posture, if retained at all, descriptive and outside every score and reliability gate.
- Replace packet-versus-component diagnostic-object scoring with a single evidenced `diagnosticTarget` at the locked target-packet level. Retain defect type and an explicit consequence cue; eliminate the `verdict` versus `inferential-consequence` choice from scoring.
- Record the highest evidenced burden-route tier contacted (`none`, `subsidiary`, `central`, or `motion`). Do not encode support/attack direction in burden relevance.
- Preserve the two-clause reframe rule, but add contrastive worked examples covering redirection, counterquestion, true replacement, and a response that both answers and reframes.
- Add synthetic, non-challenge worked examples for each scoring-relevant decision and run a validator-backed practice fixture before the blind challenge.
- Build the v2.9 key from two independent subscription-authenticated 5.6 Sol contexts and adjudicate disagreements before freezing the manifest.
- Report dyadic and multi-speaker lane metrics separately while retaining the same semantic contract and pooled authorization gate.
- Keep held-out selection, numerical scoring, Overall Commentary, AI Extension, and production changes locked until the replacement development gate and executable preflight both pass.

No held-out transcript was opened, no audio was transcribed, no numerical debate score was generated, and no production scorecard was changed. The two Sol passes used the ChatGPT/Codex subscription login rather than metered API authentication.
