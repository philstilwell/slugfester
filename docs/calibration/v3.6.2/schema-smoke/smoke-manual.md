# v3.6.2 schema smoke manual

Read all five allowlisted files and no others. Return only JSON conforming to `schema.json`.

The packet identifies one family. Copy `caseId` and `moveId` exactly. Use `schemaVersion: "3.6-decision-card"` and the family required by the schema. The rationale must contain at least 60 characters and identify the decisive default, positive rule, and exclusion.

For every active evidence field, copy enough exact source text for the string to occur exactly once in `sourceExcerpt`. Do not return offsets. Defaults and inactive fields must be null.

For target cards, classify every component once and in packet order. Generic assent does not distribute. `inside-locked-target` is not a connected example. Any positive component requires `component-contact-precludes-contrary`; relevant contrary material requires zero positive components.

For diagnostics, find the explicit defect cue before choosing a label. A consequence requires a distinct clause, a relation span containing both cues, and a unique exact link cue expressing the selected relation kind.

For reframes, do not infer malformed or replacement demands from mere topic change. When both are positive, the relation span must contain both cues and the link cue.

For burden conflicts, choose only `candidate-1`, `candidate-2`, or `neither`. A nondefault candidate requires exact qualifying evidence; `neither` requires `insufficient` and null evidence.

Do not emit scores, derived annotations, legacy material, or commentary outside the JSON object.
