# Slugfester Reassessment Workflow v2.8.2

This patch version incorporates the failed v2.8 development challenge without changing any reliability threshold or numerical-scoring prohibition. Except where this document replaces a rule, Slugfester Reassessment Workflow v2.8 remains controlling.

## Attempt isolation

The original v2.8 development manifest, input, key, passes, and analysis are immutable failed attempt-1 artifacts. v2.8.2 uses a new attempt-2 directory, schema version, selection ledger, input, independently readjudicated key, manifest, pass files, and analysis. No attempt-1 result is recomputed.

## Primitive-only annotation

Annotators record primitives and exact evidence only. They do not enter target disposition, substitution cause, coverage, diagnostic, reframe, or burden-relation labels. The validator and analyzer derive those fields from the same shared semantics module.

Every evidence object uses zero-based, end-exclusive offsets into the responding excerpt and includes the exact matching text. A positive primitive without required evidence is invalid, not merely a reliability disagreement.

## Target mapping

Every target decision declares one mapping basis:

- `direct`: the response predicates something directly of the target subject, referent, comparison, baseline, or question;
- `connected-example`: the response introduces another case, analogy, example, or model and expressly maps it to the target proposition or inference; or
- `object-change`: the response answers by changing the first applicable mapped element in this fixed order: subject, referent, comparison class, baseline, question type.

`connected-example` requires an exact connection span. Mere adjacency, topic overlap, or an annotator-supplied analogy is insufficient. `object-change` requires an exact span naming the changed element. A direct counterclaim or direct attack on the target remains `direct`, even if it uses illustrative material.

## Scope precedence

Scope is applied only to a preserved target. Classify a change on the modal scale—possibility, probability, actuality, necessity, certainty—as `modality-shift` before considering other restrictions. Otherwise a reduction in range, population, time, strength, quantification, or conditions is `narrowed`; an increase is `strengthened`. “Cannot” answered by “does not normally” is a modality shift because impossibility is replaced by typicality, even though the response also narrows practical range.

## Burden exclusion

Burden remains `retained` unless an exact clause either transfers the same live demand to another bearer or states a materially different success condition. “My point is,” a counterquestion, a historical restatement, an example, and a competing argument do not suffice. Non-retained burdens require a burden-evidence span; validators reject them without one.

## Component operation

Each indispensable component receives exactly one record and explicit null when untouched. Use the first satisfied rule:

1. `denies`: directly asserts the exact component proposition is false. Attacking its evidence is not denial.
2. `qualifies`: preserves the component subject and predicate while restricting its truth conditions, range, strength, modality, population, time, or conditions.
3. `distinguishes`: explicitly partitions the component by meaning, case, referent, comparison, or category.
4. `explains`: treats the component as a datum and supplies why or how it obtains.
5. `accepts`: expressly grants or relies on the component without performing one of the more specific operations above.
6. `undermines`: attacks warrant, inference, baseline, analogy, or evidential force without directly asserting the component false.
7. null: no exact clause performs an operation.

Every non-null operation requires its own exact evidence span. One clause may support multiple records only when its grammatical scope expressly ranges over each component. Contact does not propagate through graph dependencies.

## Diagnostic and impact primitives

A non-none defect requires an exact diagnostic-cue span. Select the first satisfied row:

1. `attribution-error`: expressly disowns the attributed proposition.
2. `contradiction`: expressly says identified commitments cannot jointly hold or are the opposite of one another.
3. `ambiguity`: identifies two or more readings, meanings, scopes, or referents as unstable.
4. `scope-mismatch`: says a demand or conclusion exceeds a stated range, modality, population, or condition.
5. `unsupported-comparison`: says the named baseline, rival, or analogy is missing or does not transfer.
6. `missing-premise`: names support required by an inference and says it is absent.
7. `invalid-inference`: says the identified conclusion does not follow while allowing the cited premises to stand.
8. `evidential-insufficiency`: says identified evidence does not warrant the claim.
9. `irrelevance`: says the identified material does not bear on the conclusion or burden.

A disagreement, counterexample, alternative explanation, analogy, ridicule, or bare claim of falsity supplies no defect by itself.

Diagnostic-object selection is mechanical. Use a component only when the cue grammatically names or unmistakably refers to that one component. Use the packet only when the cue expressly ranges over the argument as a whole or over multiple indispensable components. If neither condition is met, the positive defect is invalid.

Impact is independently evidenced. `inferential-consequence` requires a clause stating what fails, does not follow, is not established, does not explain, is incompatible, is not attributable, or must be limited. `verdict` is a bare negative evaluation. Otherwise impact is `none`. A non-none impact requires an exact impact span.

## Reframe and bridge evidence

A reframe requires both an exact explanation of why the original demand is malformed and an exact statement of the replacement demand. Redirection or a new answer without both clauses is not a reframe. Each true primitive requires its own evidence span.

Every credited bridge contact requires exact evidence from the responding excerpt. Route tier and burden relation remain code-derived.

## Attempt-2 challenge and stop rule

Attempt 2 uses retired material only. Its selection ledger excludes cases whose attempt-1 disagreements exposed unresolved semantic ambiguity and adds clear retired rare-feature fixtures as needed. The hidden key is newly readjudicated under v2.8.2 without access to either attempt-1 pass.

All v2.8 thresholds remain unchanged. Challenge failure keeps held-out selection and all numerical scoring locked. Challenge success authorizes executable preflight only; fresh lane manifests may be selected and committed only after preflight passes.

## Non-degenerate challenge completion

The retired attempt-3 fixture set is intentionally known, before annotation, to contain at least three genuine instances of each rare feature needed for preflight. A pass is structurally incomplete unless its own annotations contain at least three object changes, three connected examples, twenty component contacts, six non-none diagnostic candidates, three derived diagnostic positives, three derived reframe positives, ten bridge contacts, and twenty unique case rationales. These are completion floors, not reliability thresholds and not permission to guess: every positive still requires exact evidence and must satisfy the semantic rule.

The validator calculates these counts without reading the hidden key and requires the pass audit to match. Repeated boilerplate or an all-default annotation is invalid. A read outside the five-file allowlist also invalidates the pass regardless of JSON validity.
