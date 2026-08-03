# v2.8.1 attempt-2 annotation manual

Annotate only the responding excerpt supplied in each case. Use the target packet and burden context exactly as locked. Do not infer debate-performance scores, speaker rankings, Overall Commentary, or AI Extension content.

## 1. Target mapping

First paraphrase the target as “X about Y under comparison or baseline Z” and the response as “X′ about Y′ under comparison or baseline Z′.”

Choose one mapping basis:

- `direct`: the response predicates something directly of the target object;
- `connected-example`: a new example, analogy, counterexample, case, or model is expressly mapped to the target proposition or inference; or
- `object-change`: answering the response's proposition would change the target's subject, referent, comparison class, baseline, or question type.

For `connected-example`, cite the shortest clause that performs the connection. For `object-change`, cite the shortest clause naming the new mapped element and choose the first applicable change type in this order: subject, referent, comparison class, baseline, question type. `direct` uses null mapping evidence.

Mere topic overlap or adjacency is not an express connection. A direct attack may contain an illustration and remain `direct` when the target is named or unmistakably referred to outside the illustration.

## 2. Scope

Apply scope to the mapped proposition. Use this order:

1. any change among possibility, probability, actuality, necessity, or certainty → `modality-shift`;
2. smaller range, population, time, strength, quantifier, or added condition → `narrowed`;
3. larger or stronger nonmodal commitment → `strengthened`;
4. otherwise → `same`.

“Cannot” answered by “does not normally” is a modality shift. A non-same scope requires exact evidence. On a preserved target it also requires at least one `qualifies` or `distinguishes` component.

## 3. Burden

Start with `retained`.

- `reassigned` requires an exact clause transferring the same demand to another bearer.
- `replaced` requires an exact clause stating a materially different success condition.

A counterquestion, example, historical restatement, new argument, or “my point is” retains the burden unless the transfer or replacement condition is stated. A non-retained burden requires exact evidence.

## 4. Component records

Return one record for every indispensable component in input order, even when the target is substituted. Use explicit null operation and null evidence when untouched. For a substituted target every operation must be null.

For a preserved target, test each component in this order and stop:

1. `denies`: directly says the exact component proposition is false. Attacking evidence for it is not denial.
2. `qualifies`: restricts its truth conditions, range, strength, modality, population, time, or conditions.
3. `distinguishes`: explicitly partitions meanings, cases, referents, comparisons, or categories within it.
4. `explains`: treats it as a datum and supplies why or how it obtains.
5. `accepts`: expressly grants or relies on it without a more specific operation above.
6. `undermines`: attacks warrant, inference, baseline, analogy, or evidential force without direct falsity.
7. null: no exact operation.

Every non-null operation requires its own exact evidence. Do not propagate contact through dependencies. One span may support several records only if its grammar expressly ranges over each.

Only when every component is null may `relevantContraryMaterial` be true; cite material that bears on the preserved target without performing a listed operation.

## 5. Diagnostic cue

Diagnostics apply only to preserved targets. A non-none defect requires an exact cue. Choose the first satisfied row:

| Order | Defect | Required expressed cue | Component kinds allowed |
| --- | --- | --- | --- |
| 1 | attribution-error | expressly disowns the attributed proposition | any attributed component; otherwise packet |
| 2 | contradiction | says identified commitments cannot jointly hold or are explicitly opposite | inference or conclusion; otherwise packet |
| 3 | ambiguity | identifies unstable readings, meanings, scopes, or referents | affected component or packet |
| 4 | scope-mismatch | says a demand or conclusion exceeds a stated range, modality, population, or condition | rule-comparison, burden, modality, conclusion, or packet |
| 5 | unsupported-comparison | says a named baseline, rival, or analogy is absent or nontransferable | rule-comparison, inference, conclusion, or packet |
| 6 | missing-premise | names support required by an inference and says it is absent | inference, burden, conclusion, or packet |
| 7 | invalid-inference | says a conclusion does not follow while allowing cited premises to stand | inference, conclusion, or packet |
| 8 | evidential-insufficiency | says identified evidence does not warrant the claim | fact-premise, inference, conclusion, or packet |
| 9 | irrelevance | says identified material does not bear on the conclusion or burden | burden, conclusion, or packet |

A disagreement, counterexample, alternative explanation, analogy, ridicule, skepticism, or bare falsity claim is not automatically a defect.

Use a component object only when the cue grammatically names or unmistakably refers to that one component. Use the packet only when the cue expressly ranges over the whole argument or multiple indispensable components. Do not broaden the object merely because a local criticism has downstream effects.

## 6. Impact

Classify impact independently:

- `inferential-consequence`: exact words state what fails, does not follow, is not established, does not explain, is incompatible, is not attributable, or must be limited;
- `verdict`: exact words provide only a bare negative evaluation such as wrong, absurd, inadequate, or unpersuasive; or
- `none`: neither is expressed.

Non-none impact requires its own evidence. Do not reconstruct an unstated consequence.

## 7. Reframe

Set `malformedDemandExplained` true only when exact language explains the defect in the original demand. Set `replacementDemandStated` true only when exact language states the replacement demand or success condition. Each true primitive requires evidence. Redirection is not enough.

## 8. Burden bridges

Credit only a bridge listed as eligible in the case. Each contact requires exact evidence and `supports` or `attacks`. Do not transfer ownership between teammates.

## 9. Evidence and defaults

Every span uses zero-based, end-exclusive offsets into the responding excerpt and exact matching text. Choose the shortest complete clause retaining controlling negation, modality, quantifier, comparison, condition, and named referent; if tied, choose the earlier.

When an explicitness test is not met: preserve direct target mapping, retain burden, use null operation, no defect, no impact, no reframe, and no bridge contact. Downstream labels are derived by code and must not appear in pass annotations.

