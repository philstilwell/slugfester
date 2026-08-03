# v3.1 focused field-family verification manual

Use only the supplied workflow, rubric, schema, and one field-family packet. The packet contains locked source cases and every field assigned to one family. It contains no raw-pass answers, agreement status, gold key, or candidate rationales.

Judge each assigned field independently from the source. Prefer the stated default unless exact response language satisfies the positive or changed-value rule. Do not infer a value because the response is generally strong, topical, philosophically plausible, or eloquent.

For every field:

1. return exactly one canonical compact JSON compound value in `resolvedJson`;
2. include a valid exact span for every true, changed, or nondefault result;
3. use null evidence for false or default results;
4. give a source-grounded rationale of at least 60 characters identifying the decisive explicit language or the missing textual condition; and
5. do not add derived labels, confidence scores, participant-performance scores, or fields from another family.

The JSON inside `resolvedJson` must use these exact compound shapes:

- boolean or enumerated field: `{"value":false,"evidence":null}` or `{"value":true,"evidence":{"startChar":0,"endChar":12,"text":"exact text"}}`;
- burden contact: `{"tier":"none","bridgeId":null,"evidence":null}` or `{"tier":"central","bridgeId":"exact-eligible-id","evidence":{"startChar":0,"endChar":12,"text":"exact text"}}`.

The evidence offset keys are exactly `startChar` and `endChar`. Never use `start`, `end`, `startOffset`, or `endOffset`. Offsets are zero-based and end-exclusive into `lockedCase.sourceExcerpt`. Evidence text must match exactly. Complete every listed field exactly once and in packet order. Do not inspect the repository, raw passes, disagreement ledgers, other family outputs, legacy assessments, numerical totals, Overall Commentary, or AI Extension material.
