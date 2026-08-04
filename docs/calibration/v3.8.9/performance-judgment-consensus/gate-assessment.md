# v3.8.9 clean scoring-stage assessment

## Result

**Failed at the initial two-pass scoring stage.** Deterministic disagreement extraction, adjudication, score derivation, reconstruction, novelty audit, rendering, production mutation, the held-out gate, and the 195-debate rollout remain blocked.

All six isolated 5.6 Sol contexts completed one subscription-authenticated attempt and wrote endpoint-valid structured JSON. Only Debate 55 Pass B passed the packet-aware deterministic validator. The other five outputs were rejected by newly added lexical tests that required particular words or word stems in response rationales.

| Metric | Result |
| --- | ---: |
| Planned contexts | 6 |
| Completed one-attempt contexts | 6 |
| Endpoint-valid structured outputs written | 6 |
| Deterministically accepted contexts | 1 |
| Rejected contexts | 5 |
| Model-context retries | 0 |
| Representation or semantic recoveries counted | 0 |
| Metered model API cost | $0 |
| New transcription cost | $0 |

The one recoverable subscription stream event occurred inside Debate 55 Pass A's original sampling request and remained within the frozen transport allowance. It did not create a second judgment attempt.

## Root cause

v3.8.9 correctly removed the redundant `contactedComponentSummary` and `missedComponentSummary` fields. It then overcorrected by adding deterministic regular-expression tests to the free-text response rationale. Those tests tried to decide semantic adequacy from a short vocabulary list such as `contact`, `address`, `answer`, or `engage`.

The rejected rationales demonstrate the defect. Debate 103 Pass B wrote that a diagnostic reply “identifies the target's failure” and states the defeating consequence. Debate 161 Pass B likewise wrote that a reply “identifies the alleged defect” and states the consequence. Both satisfy the substantive diagnostic requirement but omit the validator's preferred contact verbs. Other rejected partial-answer rationales explicitly described what the reply accepted and what it left unanswered without using both required word-stem families.

This was a validator-design failure, not evidence that the model outputs lacked the required structure. The exact-schema endpoint preflight did not catch it because its synthetic packet exercised only a constructive opening. Calling that a full schema preflight was incorrect: it proved endpoint compatibility but not the validator's conditional paths.

## Preserved boundary

- Every raw output and execution record is preserved unchanged.
- No output is normalized, repaired, retried, or reclassified for v3.8.9.
- No scores are derived and no assessment prose is generated.
- Prior v3.8.8 judgments, scores, prose, and novelty conclusions were absent from all model contexts.
- Production debate data and rankings are unchanged.

## Required v3.8.10 remediation

1. Remove every lexical-content regex from deterministic response validation. Deterministic code may validate identity, target membership, component counts, response-class invariants, score bands, charity flags, and burden-adjustment exclusion rules; it may not infer semantic adequacy from preferred wording.
2. Retain the manual requirement that the rationale identify contacted and omitted content. Semantic adequacy is evaluated by independent Sol passes and dispute-only adjudication, not by word matching.
3. Replace the one-move preflight with a synthetic packet that exercises constructive opening, full answer, partial answer, diagnostic defeat, relevant nonanswer, justified reframe, and nonanswer, plus tested and untested charity and zero-adjustment exclusion paths.
4. Run the exact expanded preflight on its first attempt before freezing six fresh v3.8.10 debate contexts.
5. Do not reuse any v3.8.9 performance output in v3.8.10. The inherited source, coverage, section, burden-contact, and audio locks remain eligible because they were model-input evidence rather than failed performance judgments.

v3.8.9 provides useful negative evidence: the canonical response tuple and endpoint schema were viable, while lexical semantic validation was not. A separately versioned clean rerun is required.
