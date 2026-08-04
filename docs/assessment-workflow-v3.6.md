# Slugfester Targeted Decision-Card Workflow v3.6

## Status and scope

Version 3.6 is a classification-only development workflow. Its first stage defines and tests family-specific decision cards without executing a model. It may not score interlocutors, draft assessment prose, open held-out material, or mutate production debate objects.

The v3.5 deterministic compiler remains the mandatory serialization layer. A v3.6 model, when separately authorized, returns semantic proposals and exact evidence text only; it never returns a complete annotation or character offsets.

## Decision-card families

Each case is divided into independent cards:

1. **Target/component/example:** direct target contact, one contact mode per locked component, example boundary, scope, and contrary-material boundary.
2. **Diagnostic bundle:** defect cue and label, followed by a separate consequence cue and explicit relation cue when present.
3. **Reframe bundle:** malformed-demand cue, replacement-demand cue, and an explicit relation cue when both are present.
4. **Burden conflict:** a small candidate-bound card used only for a frozen raw disagreement. Shared burden values remain locked.

Cards contain no raw agreement status, gold, scores, legacy prose, Overall Commentary, AI Extension, or production objects.

## Evidence-text and relation rules

Every active evidence string must occur exactly once in the source excerpt. Code computes offsets. Defaults require null evidence and no inactive relation fields.

A positive diagnostic consequence requires:

- a non-none defect with exact cue text;
- distinct exact consequence text stating what fails;
- exact relation text containing both cues; and
- an exact link cue inside that relation, classified as `because`, `therefore`, `contrastive`, `explicit-negation`, or `scope-limitation`.

A card fails if a consequence is paired with no defect, the two cues are identical, the relation omits either cue, the link cue lies outside the relation, or the relation exceeds 320 characters.

When both reframe fields are positive, the relation must similarly contain both cues and an explicit `because`, `contrastive`, `instead`, or `rather-than` link. Single-field reframes do not invent a relation.

## Burden conflict rule

The burden card sees exactly two blinded candidates and may choose `candidate-1`, `candidate-2`, or `neither`.

- `retained` and no-contact candidates require null evidence and their default qualifier.
- reassignment or replacement requires exact evidence and the matching explicit qualifier.
- a nondefault burden bridge requires exact evidence and either eligible-bridge support or attack.
- `neither` is unresolved and requires null evidence.

The card cannot introduce a third burden value. Shared burden values are never reviewed.

## Development fixture gate

Before any remote schema smoke test:

- all four schemas must be closed and recursively typed;
- every valid synthetic contrast must be accepted;
- every invalid mutation must fail for its preregistered reason;
- all retired target, diagnostic, and reframe cards must reproduce their frozen gold semantics;
- every retired burden-conflict card must select the frozen gold candidate;
- no score fields, model calls, fallbacks, discretionary repairs, held-out access, or production mutations may occur.

These are validator and schema tests, not model-accuracy evidence. Passing them authorizes only a separately cost-gated remote structured-output smoke test on a gold-free synthetic packet.
