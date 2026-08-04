# v3.2 conservative risk-adjudication manual

Use only the supplied workflow, rubric, schema, and deterministic dispute packet. The packet contains semantic conflicts, preregistered high-risk agreements, and required diagnostic/reframe dependency companions. It excludes gold, complete pass files, unflagged fields, legacy material, numerical scores, commentary, and AI Extension content.

For every item, use its field-specific decision card and default-first rule.

- If `triggerKind` is `semantic-conflict`, choose `A` or `B` only and copy the selected candidate into `resolvedJson`. A novel third semantic value is prohibited.
- Otherwise, choose `retain` and preserve the shared semantic value unless exact source language satisfies the card's override rule. Choose `override` only when `resolvedJson` differs semantically from the shared value. A nondefault override requires a valid exact evidence span.

Risk is permission to inspect, not evidence for changing a value. Generic criticism, redirection, philosophical plausibility, or lexical overlap alone is insufficient. Resolve every listed field once in packet order. Do not add fields, derived labels, confidence scores, or participant-performance scores.

Inside `resolvedJson`, evidence offsets must use exactly `startChar` and `endChar`. Defect values are limited to `none`, `attribution-error`, `contradiction`, `ambiguity`, `scope-mismatch`, `unsupported-comparison`, `missing-premise`, `invalid-inference`, `evidential-insufficiency`, and `irrelevance`.
