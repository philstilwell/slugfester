# v3.6.3 correction-smoke manual

Read all five allowlisted files and no others. Return only JSON conforming to `schema.json`.

Copy `caseId` and `moveId` exactly. Use `schemaVersion: "3.6-decision-card"` and the schema's fixed family. The rationale must contain at least 60 characters and name the decisive default, positive rule, and exclusion.

For every non-null evidence string, mechanically count raw, case-sensitive occurrences in `sourceExcerpt` before returning. The count must be exactly one. Occurrences inside longer words count: a bare cue such as `so` is invalid if those letters also occur inside another word. Expand the cue with adjacent exact source words until unique. Do not return offsets.

For target cards:

- `licenseText` is non-null only for `explicit-global-assent`; every other contact mode requires null.
- `contrary.evidenceText` is non-null only for `relevant-no-component`; `none` and `component-contact-precludes-contrary` require null.
- A source instance already inside the locked target is `inside-locked-target`, not `none` or a distinct connected example.
- Any positive component requires `component-contact-precludes-contrary`; relevant contrary material requires zero positive components.

For diagnostics, first identify an explicit defect cue. A consequence requires a distinct clause, a relation span containing both cues, and a unique expanded link cue expressing the selected relation kind.

For reframes, do not infer malformed or replacement demands from mere topic change. When both are positive, the relation span must contain both cues and the unique link cue.

For burden conflicts, select only `candidate-1`, `candidate-2`, or `neither`. A nondefault candidate requires exact qualifying evidence; `neither` requires `insufficient` and null evidence.

Do not emit scores, derived annotations, legacy material, or commentary outside the JSON object.
