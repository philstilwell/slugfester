# v3.7.4 disjoint retired atomic-bundle assessment

## Outcome

The v3.7.4 gate failed its preregistered semantic-repeatability threshold. The two initial Sol passes agreed on 10 of 12 bundles (83.3%), below the required 11 of 12. Both disputed bundles were then adjudicated in isolated contexts and all twelve final bundles obtained two matching votes, but post-adjudication resolution does not repair a failed initial-agreement gate.

The execution mechanics passed completely: six of six initial contexts and two of two adjudication contexts were valid on their sole attempt, with no schema rejection, retry, stream recovery, invalid bundle, score field, metered API charge, or transcription charge.

| Family | Initial agreement | Final match to retired expectation |
| --- | ---: | ---: |
| Target | 4/4 | 0/4 |
| Diagnostic | 3/4 | 4/4 |
| Reframe | 2/2 | 1/2 |
| Burden | 1/2 | 1/2 |
| Overall | 10/12 | 6/12 |

## Disputes

`diagnostic-154-09` split between `attribution-error` and `ambiguity`. The third pass selected `attribution-error`, producing a two-vote resolution. The rubric does not yet state a sufficiently deterministic precedence rule for a complaint that a category is being placed onto the wrong object while also implying a conceptual conflation.

`burden-185-07` split between the central sourcehood bridge and the subsidiary alternatives bridge. The third pass selected the central bridge. The rubric needs a priority rule distinguishing the route bridge a move directly attacks from a different bridge that its positive alternative may incidentally support.

## Interpretation

The atomic candidate format remains structurally successful and materially better than free scalar judgments, but the perfect v3.7.3 result did not generalize to disjoint case IDs. The failed 11-of-12 threshold should not be lowered after observing 10-of-12.

The 6-of-12 match with the retired key is diagnostic rather than a pass condition. In particular, all four target bundles were internally repeatable yet differed from the retired expectations, usually because v3.7.4 treated express opposition as `distinction` and required more literal contact for `exact-proposition`. This reinforces that same-model consensus and retired-key agreement are separate questions.

## Quality judgment and next step

The engineering and isolation controls performed at an **A level**. Cross-case semantic repeatability is **promising but below the frozen standard**, and semantic correctness remains provisional. The workflow is not ready for a larger retired gate or the 195-debate batch.

The next justified step is a narrow exposed v3.7.5 correction smoke, not a larger gate. It should add deterministic precedence anchors for diagnostic labels and burden-route selection, test those anchors on the two failed bundles plus orthogonal examples, retain two isolated passes and dispute-only adjudication, and prohibit model execution until its packet universe and thresholds are separately frozen.
