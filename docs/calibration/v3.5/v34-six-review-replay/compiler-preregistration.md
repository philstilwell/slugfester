# v3.5 deterministic compiler replay preregistration

This retrospective development replay uses the six immutable v3.4 Terra/Sol outputs as serialization fixtures. The compiler and replay policy are fixed in `docs/assessment-workflow-v3.5.md`, `docs/reassessment-rubric-v3.5.md`, and `scripts/lib/v35-semantic-compiler.mjs` before any replay lock is written.

The compiler receives only the frozen input cases, raw Pass A and Pass B annotations, and v3.4 review outputs. It does not receive gold. A separate evaluator may open the already frozen gold only after all compiled reviews and replay locks have been written and hashed.

Acceptance is deliberately split:

- structural acceptance requires six of six artifacts, 26 of 26 compiled reviews, and 13 of 13 replay locks to validate with zero discretionary repair or fallback;
- semantic readiness requires every frozen v3.4 classification threshold, including zero unresolved fields.

This is not a new independence test. It adds no model judgment and cannot establish generalization. A pass authorizes at most a separately preregistered, disjoint retired-development test; it never authorizes held-out access, scoring, or production mutation directly.
