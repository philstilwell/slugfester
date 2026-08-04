# v3.6.2 schema-smoke assessment

## Outcome

The immutable gate failed. All four subscription-backed 5.6 Terra contexts completed, the remote service accepted all four closed schemas, and there were zero retries, schema rejections, stream recoveries, scoring fields, or metered API charges. Reframe and burden passed deterministic validation; target and diagnostic did not. Artifact integrity passed independently.

This result does not authorize the retired semantic-card test, held-out access, numerical scoring, assessment prose, AI Extension generation, or production mutation.

## Failure audit

- **Target:** The response correctly selected `restriction` for component `c1`, but supplied `licenseText: "only"`; license text is active only for `explicit-global-assent`. It also supplied contrary evidence for `component-contact-precludes-contrary`, whose exclusion state requires null evidence. The deterministic validator stopped at the first violation. Separately, non-gating monitoring found `example.classification: "none"` where the expected boundary classification was `inside-locked-target`.
- **Diagnostic:** The response used `linkCueText: "so"`. Raw substring matching found `so` twice—once inside `comparison` and once as the inferential link—so the evidence was not unique. The longer exact cue `so it cannot` would have been unique. This was a model-output validation failure, not a response-schema rejection.
- **Monitoring:** The reported 12/14 comparison is conservative but partly syntactic: the reframe replacement cue differed only by a terminal period. Future monitoring should compare derived semantic fields rather than exact evidence boundaries.

## Correction recommendation

Run one preregistered v3.6.3 correction smoke on the same four gold-free packets. Strengthen the target schema so conditional nullability is represented structurally, state that uniqueness counts raw substring occurrences inside longer words, require a mechanical occurrence check before return, and compare only derived decisions in post-close semantic monitoring. Retain isolated contexts, one attempt per family, subscription authentication, and the prohibition on scoring and production work.
