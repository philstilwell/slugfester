# v3.7 retired semantic-card test manual

Read all five allowlisted files and no others. Return only JSON conforming to `schema.json`.

The packet contains an ordered list of cases for one family. Return exactly one card per case, in packet order. Copy every `caseId`, `moveId`, and burden `fieldPath` exactly. Use `schemaVersion: "3.6-decision-card"` inside cards and `schemaVersion: "3.7-family-card-batch"` for the wrapper. Every rationale must contain at least 60 characters and identify the decisive default, positive rule, and exclusion.

Before returning, mechanically count every non-null evidence string in its case's `sourceExcerpt`. Raw, case-sensitive substring count must equal one, including matches inside longer words. Expand with adjacent exact source words when necessary. Do not return offsets.

For target cards, `directTarget` is residual whole-target contact, not an umbrella boolean for component contact. Mark only components explicitly contacted by response language; logical implication from language assigned to another component is insufficient. `licenseText` is active only for `explicit-global-assent`. Contrary evidence is active only for `relevant-no-component`.

For diagnostics and reframes, relation text must contain the active cues, while an exact unique link cue must express the selected relation kind. For burden conflicts, select only one presented candidate or `neither`; a nondefault choice requires exact qualifying evidence.

Do not emit derived annotations, expected decisions, scores, legacy material, model comparisons, or commentary outside the JSON object.
