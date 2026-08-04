# v3.2 hybrid complete-pass manual

Use only the supplied workflow, rubric, schema, and one debate input. Annotate every case once. Do not inspect the repository, gold, another pass, adjudication material, legacy assessments, numerical scores, Overall Commentary, or AI Extension material.

All evidence spans use zero-based, end-exclusive offsets into `sourceExcerpt`; `text` must match exactly. True, changed, and nondefault fields require evidence. False and default fields use null evidence.

Apply the rubric default-first. Judge each component independently. Use only the ten listed defect values. Require a defect and a separate linked consequence for a complete diagnostic. Judge malformed framing and replacement demand independently. Select the highest evidenced eligible burden bridge, counting both support and attack.

Return JSON conforming exactly to the schema. The rationale must be a unique sentence of at least 60 characters identifying the decisive coverage feature and any positive diagnostic, reframe, or burden tier. Do not return derived labels or participant-performance scores.
