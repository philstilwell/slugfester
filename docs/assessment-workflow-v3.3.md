# Slugfester Anonymous Bundled Adjudication Workflow v3.3

Workflow v3.3 is an AI-only calibration bake-off. It reuses the frozen, source-verified v3.2 retired inputs and the two accepted independent raw passes. It changes only adjudication, comparing anonymous de novo judgments from 5.6 Terra and 5.6 Sol. It does not authorize held-out access, numerical scoring, production prose, or mutation of any of the 195 production debates.

## Frozen architecture

For each retired debate, deterministic code creates one model-visible blind packet and one sealed candidate map. The blind packet contains locked cases, field rules, allowed semantic values, and dependency bundles. It contains no raw-pass value, candidate, model provenance, agreement/conflict flag, gold key, legacy assessment, score, Overall Commentary, or AI Extension.

The candidate seal is never copied into a model workspace. It counterbalances anonymous labels X and Y across field order and records their v3.2 raw provenance for later deterministic mapping. Each adjudicator must first decide every routed field de novo. Only after its context exits does code compare the blind decision with the sealed candidates.

Exactly six fresh subscription-authenticated contexts are planned: one Terra and one Sol adjudication for each of three debates, at Extra High reasoning. There are no raw-pass reruns and no model-output retries. A schema or invariant failure is a failed variant execution, not permission to resample.

## Routing and bundles

Route every A/B semantic conflict. Also route every agreement in the fragile targeting/coverage, diagnostic, and reframe families. Dependency closure creates these case-local bundles:

- targeting/coverage: target contact, connected example, scope, every indispensable component, and relevant contrary material;
- diagnostic: defect and consequence;
- reframe: malformed demand and replacement demand;
- burden adjustment: only when the raw passes conflict; and
- burden contact: only when the raw passes conflict.

This is an active falsification test of shared agreement. A blind judgment that differs from a shared raw value becomes an auditable override if its evidence and complete bundle are valid.

## Decision and evidence sequence

1. Start at the field default.
2. Apply the exact positive rule and near-miss exclusions.
3. Choose one canonical semantic JSON value from the packet allowlist.
4. For a nondefault choice, copy an exact, complete supporting substring from the response. For a default, return null.
5. Complete every decision in a bundle before moving to the next bundle.
6. Deterministic code computes character offsets, validates the compound field, reconstructs the complete annotation, and enforces cross-field invariants.
7. Only after the isolated context finishes does code map the semantic judgment to X, Y, shared-retain, shared-override, or unmapped.

For raw conflicts, the blind judgment must match exactly one sealed candidate; a third value is unresolved and fails the variant. For raw agreements, matching preserves the value and differing supplies a possible correction. Unrouted burden agreements are copied mechanically and cannot change.

## Model-selection rule

Terra and Sol produce separate complete variants; results are never combined field by field. A variant qualifies only if it clears every inherited accuracy/recall threshold, has zero unresolved or unmapped fields, zero unflagged alterations, 100-percent audio verification of medium/low-confidence moves, no score leakage, and zero model schema/invariant retries.

- If only one variant qualifies, that model advances.
- If both qualify, Terra advances because it is the lower-cost production candidate.
- If neither qualifies, v3.3 stops and no held-out material opens.

An advancing model must next pass a second, disjoint retired confirmation before any held-out gate is preregistered.

## Classification and publication boundary

The gate remains classification-only. Derived coverage, diagnostic, reframe, burden relevance, and exact tuples are recomputed in code after adjudication. Participant scores are not calculated. Overall Commentary and the visibly AI-contributed, default-collapsed AI Extension remain downstream of a future validated score lock.

