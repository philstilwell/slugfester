# v3.0 retired-test pass manual

Use only the supplied workflow, rubric, schema, and one debate input. Annotate every case once. Do not inspect the repository, any gold key, another pass, any legacy assessment, numerical scores, commentary, or AI Extension material.

All spans use zero-based, end-exclusive offsets into `sourceExcerpt`; `text` must match exactly. True, changed, and nondefault fields require evidence. False and default fields use null evidence.

- `originalTargetContact`: exact language bears on the locked target or component.
- `connectedExample`: exact language connects another case, analogy, counterexample, or model to the target.
- `scopeRelation`: `same`, `narrowed`, `strengthened`, or `modality-shift`; a non-same result requires target contact and exact evidence.
- `burdenAdjustment`: retain by default. `reassigned` requires an express transfer of the same demand. `replaced` requires an expressly installed, materially different governing success condition.
- `componentContacts`: return every component in input order. Contact includes granting, using, denying, restricting, distinguishing, explaining, questioning the warrant of, or expressly challenging that component.
- `relevantContraryMaterial`: permitted only when target contact is true and every component is false.
- `defectType`: choose `none` or the first expressed eligible defect. A non-none defect requires target contact and an exact cue.
- `consequenceStated`: true only when a separate exact clause states what fails or must be limited because of the defect.
- `malformedDemandExplained` and `replacementDemandStated`: decide independently and cite separate exact clauses.
- `burdenContact`: select the highest evidenced eligible tier and bridge, otherwise `none`.
- `rationale`: one unique sentence of at least 60 characters naming the decisive coverage feature and any positive diagnostic, reframe, or burden tier.

Return JSON conforming exactly to the supplied schema. Do not include derived labels or any participant-performance score.

