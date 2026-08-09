# Side-partitioned, order-free inventory selection map

This development contract keeps every discovered candidate available while making candidate identity and repository-owned side visible in the output topology.

- `candidateSelectionsBySide.pro` contains every pro candidate ID exactly once as a required property.
- `candidateSelectionsBySide.con` contains every con candidate ID exactly once as a required property.
- Use `null` for an unselected candidate.
- For a selected candidate, author only `sectionId`, `moveId`, `moveKind`, and `proposition`.
- Do not author `side` or `orderWithinSide`. The candidate's side is fixed by its enclosing map, and repository chronology derives within-side order.
- Select one or two candidates from each side for every section, and eight to twenty-four candidates overall.
- Candidate IDs cannot be copied between the side maps or repeated as another property.

The repository still validates section-side cardinality, section membership, weights, move-ID uniqueness, chronology, reply legality, and the complete locked inventory. An invalid proposal is rejected without retry or semantic repair.
