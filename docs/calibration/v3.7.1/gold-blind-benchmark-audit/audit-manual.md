# v3.7.1 gold-blind audit manual

Read all five allowlisted files and no others. Return only JSON conforming to `schema.json`.

The packet contains every disputed field for one debate and one reviewer pass. Process decisions once and in packet order. For each decision, choose exactly one displayed `optionId`. Candidate origins are deliberately hidden; judge only the source context, field question, candidates, workflow, and rubric.

Copy `debateNumber`, `reviewerPass`, and every `auditId` exactly. Provide one nonempty `evidenceText` copied exactly from `sourceExcerpt`. It must occur exactly once as a raw, case-sensitive substring, including matches inside longer words; expand it with adjacent exact source words if necessary. A rationale must contain at least 80 characters and state the decisive positive rule, default, and exclusion.

Do not infer identities behind option ordering. Do not emit offsets, derived cards, retired expectations, model comparisons, participant scores, winners, Overall Commentary, AI Extension, or prose outside the JSON object.
