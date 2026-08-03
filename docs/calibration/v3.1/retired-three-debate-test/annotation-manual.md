# v3.1 retired-test complete-pass manual

Use only the supplied workflow, rubric, schema, and one debate input. Annotate every case once. Do not inspect the repository, any gold key, another pass, any verifier packet or output, any legacy assessment, numerical scores, commentary, or AI Extension material.

All spans use zero-based, end-exclusive offsets into `sourceExcerpt`; `text` must match exactly. True, changed, and nondefault fields require evidence. False and default fields use null evidence.

- `originalTargetContact`: exact language bears on the locked target or an indispensable component.
- `connectedExample`: exact language expressly connects another case, analogy, counterexample, or model to the target.
- `scopeRelation`: `same`, `narrowed`, `strengthened`, or `modality-shift`; a non-same result requires target contact and exact comparative evidence.
- `burdenAdjustment`: retain by default. `reassigned` requires an express transfer of the same demand. `replaced` requires an expressly installed, materially different governing success condition.
- `componentContacts`: return every component in input order. Judge each independently; do not propagate contact through dependencies.
- `relevantContraryMaterial`: permitted only when target contact is true and every component is false.
- `defectType`: choose `none` or the first clearly expressed eligible defect. A non-none defect requires target contact and an exact cue.
- `consequenceStated`: true only when a separate exact clause states what fails or must be limited because of the defect.
- `malformedDemandExplained` and `replacementDemandStated`: decide independently and cite exact clauses.
- `burdenContact`: select the highest expressly evidenced eligible tier and bridge, otherwise `none`.
- `rationale`: one unique sentence of at least 60 characters naming the decisive coverage feature and any positive diagnostic, reframe, or burden tier.

Return JSON conforming exactly to the supplied schema. Do not include derived labels or any participant-performance score.
