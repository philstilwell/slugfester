# v4.0 lean retired-control gate preregistration

## Decision under test

This gate tests whether the v4.0 risk-triggered workflow can preserve the substantive result of the completed v3.8.11 adjudicated diagnostic while reducing projected 195-debate compute from hundreds of hours to approximately 50. It is calibration-only and cannot alter production debates, rankings, or published assessment attribution.

## Frozen retired controls

- Debate 55: `craig-malpass-kalam-nothing-2026`
- Debate 103: `woodford-edwards-rational-belief-god-2023`
- Debate 161: `craig-millican-does-god-exist-2011`

These debates are retired controls, not held-out evidence. Their v3.8.11 final diagnostic scores are preserved as a comparator but are prohibited from every v4 model context. Comparator access occurs only after v4 scores close.

## Execution

Each debate receives one isolated 5.6 Sol primary context through ChatGPT subscription authentication with API keys removed. The context receives only workflow v4.0, rubric v4.0, this manual, a source-only packet, the exact schema, transcript, and events. It receives no v3.8.11 packet, route, section, move inventory, judgment, score, winner, or prose.

After deterministic validation, repository code derives provisional scores and the trigger engine decides whether Pass B is mandatory. Frozen-control selection is concealed from the primary context. Every medium- or low-confidence source attribution requires audio verification before a ledger can close. Triggered Pass B and any field-only adjudication require separately frozen manifests and fresh contexts.

One attempt is allowed per real model context in this gate. A retry, repaired output, post-hoc normalization, source hash mismatch, invalid structural invariant, or pending required audio check fails the clean gate.

## Acceptance thresholds

The gate passes only if:

- all three primary contexts validate on their first attempt;
- all three inventories contain four to seven weighted sections, both sides in every section, complete route coverage, and no unsupported source spans;
- all required audio verifications complete;
- all deterministic trigger fixtures fire and the clean fixture does not fire;
- every triggered Pass B and adjudication completes on its first attempt with no unresolved or mutated nondisputed field;
- the final v4 winner matches the v3.8.11 comparator in all three debates;
- every final v4 side score is within 5 points of its v3.8.11 comparator;
- burden-completion exclusion has zero violations;
- model-generated calculated totals equal zero and repository-calculator mismatches equal zero;
- the central 195-debate compute projection is at most 52 hours and the conservative projection is at most 60 hours;
- metered API cost is $0 and new transcription cost is $0 unless a separately estimated and approved targeted audio call is frozen before execution.

## Comparator values held outside model contexts

The deterministic post-score comparison uses Debate 55 pro 71/con 81, Debate 103 pro 76/con 67, and Debate 161 pro 68/con 78. The expected classifications are con, pro, and con respectively. These values may not be copied into any prompt, packet, schema, temporary execution directory, or model-readable gate file.

## Promotion meaning

A pass authorizes only a preregistered ten-debate held-out v4.0 end-to-end gate. A held-out pass plus explicit editorial approval is required before the 195-debate reassessment begins. A fail preserves all evidence and returns the workflow to design; thresholds may not be changed after outputs are visible.
