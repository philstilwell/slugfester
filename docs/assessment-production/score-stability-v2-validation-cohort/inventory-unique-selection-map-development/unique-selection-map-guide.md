# Unique Candidate Selection Map

Every discovered candidate is a required property of `candidateSelections`.

- Leave an unselected candidate's value as `null`.
- For each selected candidate, replace `null` with its `sectionId`, `orderWithinSide`, `moveId`, `moveKind`, and source-faithful `proposition`.
- A candidate property can hold at most one selection, so the same candidate cannot be used in multiple sections or moves.
- `sections` defines four to six issue sections totaling 100 percent. Every section must receive one or two pro candidates and one or two con candidates.
- `orderWithinSide` is `1` for the first selection on that side in a section and `2` only when that side has a second selection.

All candidates and source evidence remain available in the separate lossless columnar candidate transport. This map changes selection serialization only. It does not authorize ratings, response topology, scoring, winners, publication prose, semantic repair, or candidate downselection.
