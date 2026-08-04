# v3.7.3 atomic-bundle correction-smoke manual

Read the five allowlisted files and no others. Return only schema-conforming JSON.

The packet contains all atomic bundles for one debate and reviewer pass. Process bundles in order. Select exactly one anonymous `optionId` for each complete bundle. Candidate origins are hidden. Copy bundle IDs exactly and provide one exact, case-sensitive evidence substring that occurs once in the bundle's source excerpt. Each rationale must contain at least 80 characters and identify the governing positive rule, default, and exclusion.

Do not emit scalar subfield decisions, derived contrary judgments, candidate origins, retired expectations, model comparisons, scores, participant assessments, Overall Commentary, AI Extension, or prose outside the JSON object.
