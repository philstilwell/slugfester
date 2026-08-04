# v3.8.8 Nonanswer-Summary Representation Recovery

## Status and scope

This is a post-hoc recovery rule, not a preregistered clean-gate pass. The six validated-recovery model contexts completed on 2026-08-04 and all six produced full schema-conforming JSON objects, but the packet-aware validator rejected each object because at least one `relevant-nonanswer` move used `contactedComponentSummary` to describe topically relevant contrary material. Under the locked response tuple, both `relevant-nonanswer` and `nonanswer` have zero contacted indispensable components, so that field must be the empty string.

The raw outputs and failed execution record remain immutable evidence. Recovery may create separate derived copies only.

## Permitted transformation

For a move whose response class is exactly `relevant-nonanswer` or `nonanswer`, whose `contactedComponents` value is exactly `0`, and whose `contactedComponentSummary` is nonempty, replace only `contactedComponentSummary` with `""`.

No response class, target ID, component count, missed-component summary, rationale, rating, confidence, burden contact, burden adjustment, audit field, or other text may change. The transformation must be expressed as an exact path-level diff and the derived object must pass the unchanged packet-aware validator. A context with any remaining validation failure is not recovered.

## Evidential interpretation

The deleted strings describe topical relevance, not contact with an indispensable target component. Their content is already represented by the locked `relevant-nonanswer` class, response rationale, missed-component summary, and responsiveness rating. Emptying the prohibited field therefore enforces the response tuple without changing a substantive judgment.

This rule is frozen after observing the shared serialization failure and must be reported as such. A recovered six-context set may authorize deterministic A/B disagreement extraction because that stage compares substantive response tuples and ratings. It does not convert the original run into a clean pass, authorize score derivation, authorize prose, or validate a 195-debate rollout.

## Production correction

Future clean gates must remove the ambiguity before model execution: the scoring manual and prompt must state that topically relevant contrary material belongs in the response rationale, while `contactedComponentSummary` must be exactly empty whenever `contactedComponents` is zero. A deterministic pre-score canonicalizer should enforce this invariant before validation while retaining the raw model artifact.
