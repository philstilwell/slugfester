# v3.0 dispute-only adjudication manual

Use only the supplied workflow, rubric, schema, and deterministic dispute packet. The packet contains every and only compound primitive fields on which Pass A and Pass B differ.

For each dispute:

1. read the locked response, target, components, and burden context included with that case;
2. compare the two candidate JSON values under the v3.0 rules;
3. return one valid canonical JSON value in `resolvedJson`;
4. set `selection` to `A` or `B` only when the resolved JSON is byte-for-byte the corresponding candidate JSON; otherwise use `novel`; and
5. give a source-grounded rationale of at least 60 characters explaining the decisive explicitness, component, diagnostic, reframe, or burden rule.

Resolve every listed dispute exactly once. Do not add cases, fields, derived labels, or scores. Do not reconstruct or opine on nondisputed fields. Do not inspect the repository, a gold key, legacy assessments, complete raw pass files, numerical totals, Overall Commentary, or AI Extension material.

