# Workflow v3.2 retired-gate assessment

## Decision

Workflow v3.2 is **not ready** for a held-out gate or the 195-debate corpus. Its execution controls are strong, but its semantic classification and adjudication are not reliable enough to support numerical scoring.

The gate was the preregistered 13-case retired sample: Debate 62 as a straightforward dyadic case, Debate 185 as a difficult dyadic reframe case, and Debate 154 as a multi-speaker case. It contained 161 scoring-relevant primitive fields. The frozen thresholds, gold, transcripts, and source audits were not changed after model outputs were accepted.

## What passed

- Two complete passes per debate were isolated: Pass A used 5.6 Terra at Extra High, and Pass B used 5.6 Sol at Extra High.
- Each third pass used 5.6 Sol at Extra High and saw only the deterministic risk packet, not either complete pass, gold, unflagged fields, legacy prose, or scores.
- All 76 routed fields were resolved exactly once. There were zero unresolved fields and zero alterations to unflagged agreements.
- Evidence was validated against exact transcript offsets and canonicalized deterministically.
- The only medium/low-confidence move was verified against retained audio, for a 100% source-gate rate.
- Participant-performance scores, Overall Commentary, and AI Extension prose remained outside the classification contexts. Scoring inputs were created only after final locks and contain no numerical participant scores.
- All model work used subscription authentication. Metered API cost was $0.

Five raw outputs were rejected during startup for exact-offset or cross-field invariant violations and were replaced in isolated contexts. Six final raw passes and three adjudications were accepted. Across the complete execution trail, 14 model contexts ran: 11 raw attempts and three adjudications. The fail-closed validators prevented rejected artifacts from entering the gate, but the retry rate is itself a scalability warning.

## Gate results

| Measure | Final | Required | Result |
| --- | ---: | ---: | --- |
| Original target contact | 100.0% | 95% | Pass |
| Scope | 84.6% | 90% | Fail |
| Burden adjustment | 100.0% | 95% | Pass |
| Component contact, micro | 80.6% | 90% | Fail |
| Coverage | 69.2% | 85% | Fail |
| Defect type | 61.5% | 85% | Fail |
| Consequence | 76.9% | 90% | Fail |
| Diagnostic | 76.9% | 90% | Fail |
| Reframe | 69.2% | 90% | Fail |
| Burden relevance | 92.3% | 90% | Pass |
| Exact derived tuple | 46.2% | 80% | Fail |
| Diagnostic-positive recall | 33.3% | 80% | Fail |
| Reframe-positive recall | 0.0% | 100% | Fail |

The hybrid improved on v3.1 in target-adjacent and burden measures, including scope by 38.5 percentage points, burden adjustment by 15.4 points, burden relevance by 30.8 points, and exact tuple by 38.5 points. It regressed on reframe exactness, diagnostic-positive recall, and reframe-positive recall. Improvement over a failed predecessor is not sufficient for promotion.

## Failure analysis

Model diversity helped at the raw-pass level. The shared-error rate fell from v3.1's 23.4% to 9.4%. It also increased informative conflicts from 16 to 33. One of the two raw candidates was gold-correct on 32 of 33 conflicts.

The third-pass mechanism failed to exploit that signal:

- The Sol adjudicator selected the correct candidate on only 15 of 33 conflicts, or 45.5%.
- Terra was the correct raw candidate on 24 conflicts; Sol was correct on eight; neither was correct on one. A mechanical Terra choice would have scored 72.7% on this retired conflict set, although that is a diagnostic comparison rather than an authorized production policy.
- The adjudicator selected candidate B, the Sol pass, on 20 conflicts. It selected B against a correct Terra candidate 14 times. Because the packet disclosed which model produced A and B, this is consistent with a model-identity or self-alignment confound, though the sample is too small to establish causation.
- Reframe adjudication was especially poor. Terra was correct on all ten malformed-demand and replacement-demand conflicts; the adjudicator was correct on only two.
- Twelve A/B agreements were jointly wrong. The router exposed seven of them, but the adjudicator made no agreement override. This produced zero harmful overrides but also zero corrections. Five shared errors were not routed at all.

The conservative default therefore succeeded as a safety constraint but failed as a repair mechanism. The hybrid final exact-tuple accuracy, 46.2%, was lower than Terra Pass A's 53.8%, showing that the adjudication stage degraded the stronger complete pass on this sample.

## Lane assessment

| Debate | Lane | Exact tuple | Conflict accuracy | Key weakness |
| --- | --- | ---: | ---: | --- |
| 62 | Dyadic, straightforward | 66.7% | 50.0% | Scope, components, and contrary-material boundary |
| 185 | Dyadic, difficult reframe | 25.0% | 46.2% | Defect, consequence, and reframe overclassification |
| 154 | Multi-speaker | 50.0% | 42.9% | Component boundaries and diagnostic/reframe selection |

The multi-speaker lane did not uniquely cause failure. The difficult dyadic reframe case performed worse on the most consequential aggregate. Three-or-more-speaker debates should remain a separate monitored lane, not be removed from the corpus process.

## Quality assessment

- **Source and provenance integrity:** ready. Transcript hashes, exact evidence, audio verification, isolation, and score exclusion all worked.
- **Deterministic workflow integrity:** nearly ready. Routing, validation, merging, and stop rules worked, but the five rejected raw outputs show that structural invariants must be encoded directly in schemas or programmatic postchecks before scale.
- **Semantic reliability:** not ready. Seven of thirteen substantive accuracy gates failed, as did both positive-recall gates and the exact-tuple gate.
- **Adjudication quality:** not ready. The third pass underperformed the stronger raw candidate and did not repair shared errors.
- **Publication quality:** untested. The failed classification gate correctly prevented scorecards, Overall Commentary, and the default-collapsed, visibly AI-authored AI Extension from being generated.
- **Corpus readiness:** no. Applying this version to 195 debates would produce inconsistent scores with false precision.

## Recommended next development step

Do not open a held-out gate. Build a v3.3 retired-development experiment with these preregistered changes:

1. Hide model identities and candidate provenance from the adjudicator. Deterministically counterbalance anonymous candidate order.
2. Require the adjudicator to make a blind field judgment first, then map that judgment to an anonymous candidate. Candidate inspection must not precede the independent decision.
3. Resolve dependency bundles together: target/components/contrary material, defect/consequence, and malformed demand/replacement demand. Validate both structural and semantic bundle coherence before merging.
4. Replace passive shared-agreement review with an explicit falsification test. Route all agreements in the empirically fragile connected-example, component, diagnostic, and reframe families during development; require a concrete positive rule for retaining a nondefault value and a documented near-miss rule for restoring the default.
5. Compare anonymous Sol and anonymous Terra adjudication on a frozen retired set. Do not infer a permanent model policy from the present 13 cases; preregister the selection rule before seeing results.
6. Require zero schema/invariant retries in a dry-run fixture suite before another paid or subscription-backed model gate.
7. If v3.3 passes the original three debates, run a second disjoint retired confirmation set before preregistering any held-out gate.

The production output contract remains unchanged for any future workflow that eventually passes: the assessment attribution and rubric label use an em dash separator; the AI Extension follows Overall Commentary, is visibly identified as AI-authored, uses distinct presentation, is default-collapsed and keyboard operable, strengthens both sides proportionately, adds genuinely new arguments, and is novelty-audited against the transcript.
