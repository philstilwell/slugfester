# v2.9.1 development attempt-2 annotation manual

Use only each supplied response, target packet, and burden context. Workflow v2.9.1 and Rubric v2.9.1 control.

All evidence uses zero-based, end-exclusive offsets into `sourceExcerpt`, and `text` must match exactly. True, changed, and non-default fields require evidence; false and default fields use null evidence.

- `originalTargetContact`: exact language bears on the locked claim or component.
- `connectedExample`: exact language links another example, analogy, counterexample, case, or model to the target.
- `scopeRelation`: `same`, `narrowed`, `strengthened`, or `modality-shift`; non-same requires target contact and evidence.
- `burdenAdjustment`: default `retained`; `reassigned` needs express transfer of the same demand, and `replaced` needs an express replacement success condition.
- `componentContacts`: return every component in input order with boolean contact and evidence when true.
- `relevantContraryMaterial`: permitted only when target contact is true and every component is false; cite the relevant material.
- `defectType`: `none` or the first expressed defect in the workflow order; non-none requires a cue and target contact.
- `consequenceStated`: true only when a separate clause states what fails or is limited; requires a non-none defect and exact evidence.
- Reframe: record `malformedDemandExplained` and `replacementDemandStated` independently with separate evidence.
- `burdenContact`: select the highest evidenced eligible tier and bridge; otherwise use tier `none`, null bridge, and null evidence.
- `rationale`: one unique sentence of at least 60 characters naming the decisive coverage feature and any positive diagnostic, reframe, or burden tier.

The retired packet is pre-inventoried under these exact semantics. A complete artifact contains at least 17 target contacts, 3 connected examples, 20 component contacts, 6 defect candidates, 3 diagnostics, 3 reframes, 10 burden contacts, and 22 unique rationales. These are validation floors, not permission to guess.

