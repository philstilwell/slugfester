# Slugfester Focused AI Verification Workflow v3.1

Workflow v3.1 is an AI-only calibration workflow. It accepts that model judgment is imperfect, measures that imperfection against frozen gold material, and uses source controls plus narrow verification tasks to reduce avoidable error. It remains calibration-only until a retired three-debate execution test and a later, disjoint held-out gate are completed and explicitly accepted.

## Why v3.1 differs from v3.0

The v3.0 retired test showed that dispute-only adjudication cannot correct correlated errors: Pass A and Pass B agreed on 136 semantic judgments, but 33 of those agreements were wrong. It also mixed 46 evidence-only span disputes with 25 semantic disputes, and the adjudicator selected the correct semantic result in only 7 of those 25 conflicts.

Version 3.1 therefore makes four architectural changes:

1. deterministic disagreement extraction compares semantic values separately from evidence spans;
2. a third isolated AI stage independently verifies every primitive, including A/B agreements, in four field-family packets;
3. the verifier never sees raw-pass values, labels, rationales, agreement status, or the gold key; and
4. exact evidence is canonicalized mechanically after the focused semantic decision.

The focused verifier is authoritative for the final semantic lock. The two complete raw passes remain necessary as independent reliability monitors and as alternate evidence sources. This is not majority voting: a focused verifier may override a shared A/B classification because detecting shared error is the purpose of the stage.

## Required sequence

For every debate:

1. Freeze the local transcript chain, source hashes, motion, sides, burdens, target packets, component graphs, move inventory, section weights, and move importance.
2. Verify every selected move with medium or low speaker-attribution confidence against locally retained audio. A missing or mismatched audio record blocks all model passes.
3. Run Pass A and Pass B in separate fresh 5.6 Sol contexts with the same five allowlisted inputs and no access to gold, legacy assessments, the other pass, numerical scores, Overall Commentary, or AI Extension material.
4. Extract semantic disagreements and evidence-only differences deterministically. Preserve both counts, but do not give either raw result to the focused verifier.
5. Split every compound primitive into exactly one of four families: targeting/burden, coverage, diagnostic, or reframe.
6. Run one fresh 5.6 Sol verification context for each family. Each context receives only the workflow, rubric, verification manual, output schema, and the debate-specific family packet. It rejudges assigned fields directly from locked source material.
7. Validate every focused judgment independently, then combine all four families into a complete verifier annotation and validate the cross-field constraints.
8. Set the final semantic value of every primitive to the focused verifier's value. For that value, mechanically select the shortest valid supporting span among Pass A, Pass B, and the verifier; defaults retain null evidence.
9. Recompute coverage, diagnostic status, reframe status, burden relevance, and the exact derived tuple in code.
10. Build any numerical-scoring input only after the final lock and every provenance audit validate.

## Four verification families

- **Targeting and burden:** original-target contact, expressly connected example, scope, burden adjustment, and highest eligible burden contact.
- **Coverage:** every indispensable component contact and relevant contrary material.
- **Diagnostic:** expressed defect type and separately stated consequence.
- **Reframe:** malformed-demand explanation and replacement demand.

Every primitive appears exactly once. The family packets contain no raw candidate values and no indication of whether A and B agreed. This prevents selection bias and makes the third stage an independent source-grounded judgment rather than a preference between two model phrasings.

## Semantic/evidence separation

Semantic equality ignores evidence objects:

- booleans compare only their boolean value;
- scope, burden adjustment, and defect compare only their enumerated value;
- burden contact compares tier plus bridge ID; and
- evidence text and offsets are compared separately.

The disagreement ledger records `semantic-conflict`, `evidence-only`, or `exact-agreement` for every field. Only semantic accuracy affects the classification gate. Evidence remains mandatory for positive or changed values and must pass exact offset validation.

After the focused value is locked, code chooses the shortest complete valid evidence span offered by any of the three AI passes with that same semantic value. A tie is resolved by start offset, end offset, then canonical JSON. If no valid candidate evidence supports a nondefault focused value, merge fails closed.

## Defaults and authority

Explicitness defaults remain disciplined abstention: false, `same`, `retained`, `none`, and burden tier `none`, as applicable. The focused verifier must prefer the default unless the excerpt itself satisfies the positive or changed-value rule. It is authoritative because it receives a smaller decision family and is insulated from raw-pass anchoring. Its authority does not make it infallible; final accuracy is measured against the preregistered gold key.

## Scoring boundary

Raw passes, disagreement ledgers, verification packets, verifier outputs, and final locks contain no participant-performance scores. Scores are derived only after the final verification lock validates. The v3.1 rubric constrains responsiveness and relevance/burden from the locked structural classifications, and the repository calculator remains the only component permitted to calculate move, section, and overall totals.

## Retired three-debate gate

Rerun the same frozen retired sample used for v3.0 so the architectural change can be compared directly:

- one straightforward dyadic debate;
- one difficult dyadic debate with diagnostic/reframe boundaries; and
- one multi-speaker debate.

Use the independently constructed pre-v3.0 gold key. Freeze workflow, rubric, schemas, packets, source hashes, thresholds, and stop rules before launching Pass A. A successful execution requires valid isolation, complete field-family coverage, a 100-percent medium/low audio-verification rate, zero unresolved fields, zero score leakage, and every frozen accuracy threshold. The report must also compare v3.1 against v3.0, including shared-error detection and focused-verifier overrides.

Failure does not authorize opening held-out transcripts, numerical scoring, production scorecards, rankings, Overall Commentary, or AI Extension copy. Success authorizes only preregistration of a disjoint held-out classification gate.

## AI-only operating assumption

Human adjudication is not a required workflow stage. When a future production result remains structurally uncertain, the system should expose an AI-confidence or review flag rather than silently claim certainty. Editorial acceptance may still decide whether to publish, but the assessment itself remains AI-generated.
