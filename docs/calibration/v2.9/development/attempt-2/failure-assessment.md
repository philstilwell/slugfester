# v2.9.1 attempt-2 failure and readiness assessment

Attempt 2 failed the frozen development reliability gate. Both blind 5.6 Sol passes were isolated, complete, non-degenerate, and validator-clean. The adjudicated key was built from two independent candidates and a third fresh adjudicator before the manifest freeze. This is therefore a semantic reliability failure, not an execution or provenance failure.

## Results

Five of seventeen hard gates passed. Original-target contact (0.926) and scope (0.960) passed. Burden relevance improved to 0.926 exact agreement and kappa 0.826, so the simplified highest-tier burden rule is successful. Burden adjustment narrowly missed at 0.889.

The central scoring dimensions remain below deployment quality. Component-contact micro agreement was 0.831. Derived coverage was 0.630 with kappa 0.337. Defect-type agreement was 0.720, consequence agreement 0.800, diagnostic agreement 0.815, and exact derived-tuple agreement 0.444. Both blind passes recalled only 5 of the adjudicated key's 8 diagnostic positives. Reframe agreement was 0.889; Pass A recalled all three keyed positives, while Pass B recalled two.

Compared with v2.8.2, v2.9.1 materially improves target alignment, burden relevance, and the exact tuple, but it does not make component coverage or diagnostic consequence reproducible. The lower-granularity contract was therefore directionally correct but insufficient.

## Lane finding

Three-plus-speaker debates are not the general failure source. Multi-speaker target agreement was 0.933, coverage agreement 0.667, and burden relevance 0.933. Dyadic target agreement was 0.917, coverage agreement 0.583, and burden relevance 0.917. Diagnostic defects were less stable in the multi-speaker lane, while component coverage was less stable in the dyadic lane. Removing multi-speaker debates would not make the workflow production-ready.

## Architectural conclusion

A single raw 5.6 Sol pass should not be used to score all 195 debates. Repeated rubric sharpening has reached diminishing returns: the remaining disagreements concern whether clauses contact particular argument components and whether criticism states a consequence, not missing format controls.

The next viable design is one of:

1. **AI consensus with adjudication (recommended):** two independent Sol classification passes per debate, deterministic disagreement extraction, and a third isolated adjudication pass restricted to disputed fields. Numerical scoring is derived only from the adjudicated primitives. Medium-confidence transcript moves still require audio verification. A held-out gate must test the final adjudicated outputs against an independently constructed key; raw-pass agreement remains a monitoring metric, not the sole authorization gate.
2. **Human-reviewed production:** one Sol pass followed by a human review of every coverage, diagnostic, reframe, and burden adjustment decision before scoring. This reduces subscription usage but requires substantial expert time and a formal review ledger.

The recommended consensus architecture preserves the successful v2.9.1 target and burden rules, retains both debate lanes, and narrows adjudication to actual disagreements. It should be tested first on a small retired three-debate execution sample and then on a fresh preregistered held-out gate. The current failure does not authorize that gate automatically; the new architecture and its thresholds must be frozen first.

No executable preflight or held-out transcript was opened, no debate was numerically scored, and no Overall Commentary, AI Extension, or production scorecard was changed. All Sol contexts used the ChatGPT/Codex subscription path with `OPENAI_API_KEY` removed; metered transcription/API charge was $0.
