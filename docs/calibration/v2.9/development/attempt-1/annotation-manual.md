# v2.9 development attempt-1 annotation manual

Use only the responding excerpt, locked target packet, and burden context supplied in each case. The workflow and rubric are controlling; this manual specifies artifact mechanics.

## Evidence mechanics

All spans use zero-based, end-exclusive offsets into `sourceExcerpt`, and `text` must match that slice exactly. Use the shortest complete clause preserving controlling language. Every true, changed, or non-default primitive requires evidence; every false or default primitive uses null evidence.

## Target fields

- `originalTargetContact`: true if any exact clause bears on the locked claim or component.
- `connectedExample`: true only for an expressly linked example, analogy, counterexample, case, or model. It may coexist with original-target contact.
- `exclusiveObjectSubstitution`: true only when original-target contact is false and a changed subject, referent, comparison class, baseline, or question type answers instead.
- `objectChangeType`: required only for exclusive substitution, using the first applicable type in this order: subject, referent, comparison class, baseline, question type.

## Scope and burden adjustment

Scope is `same` unless evidenced as modality shift, narrowed, or strengthened. When original-target contact is false, scope must be `same`.

Burden adjustment starts `retained`. `reassigned` needs an express transfer of the same demand; `replaced` needs an express new governing success condition. Counterquestions, redirections, examples, and “my point is” remain retained without that statement.

## Component records

Return every indispensable component in input order. Each record contains its ID, a boolean `contacted`, and evidence when true. Do not classify how the response treats it. Exclusive substitution requires all component contacts false.

`relevantContraryMaterial` may be true only when all component contacts are false and exact material still bears on the original target. Supply evidence when true.

## Diagnostic fields

`defectType` is `none` or the first expressed defect in this order: attribution error, contradiction, ambiguity, scope mismatch, unsupported comparison, missing premise, invalid inference, evidential insufficiency, irrelevance. A non-none defect requires `defectCue`.

`consequenceStated` is independently true only when exact language says what fails, does not follow, is not established, does not explain, cannot carry the claim, or must be limited. It requires `consequenceCue`. Diagnostic status is code-derived from both primitives.

## Reframe fields

`malformedDemandExplained` and `replacementDemandStated` are separate booleans with separate spans. Both are required for a derived reframe. A response may answer the original target and reframe another demand.

## Burden contact

Return one `burdenContact` object. Use tier `none`, null bridge ID, and null evidence when no eligible bridge is contacted. Otherwise select the highest contacted eligible tier and supply that bridge's exact ID and evidence. Do not encode support versus attack.

## Rationale

Write one unique, content-grounded sentence per case. Mention the decisive target/coverage feature and any positive diagnostic, reframe, or burden-tier decision. Boilerplate is invalid.

## Completion floors

The challenge contains genuine non-default features. A pass is incomplete unless it contains at least 15 original-target contacts, 3 connected examples, 3 exclusive substitutions, 20 component contacts, 6 defect candidates, 3 derived diagnostics, 3 reframes, 10 non-none burden contacts, and 20 unique rationales. These floors are completion checks, not permission to guess.

