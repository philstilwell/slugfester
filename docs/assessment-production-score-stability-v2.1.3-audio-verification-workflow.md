# Score-stability v2.1.3 audio-verification workflow

This validation-only stage audio-verifies the five below-high-confidence moves frozen by the v2.1.3 independent-judgment gate. It uses the three locally normalized source files and five immutable clips recorded in `audio-source-preparation.json`.

Prepare two eight-second known-speaker references per debate from the midpoint of the longest high-attribution locked move for each substantive speaker. Selection is deterministic by duration, source chronology, and move ID. Measure every encoded reference and accept only 1.2–10 seconds.

Plan one sequential `gpt-4o-transcribe-diarize` call per clip with `diarized_json`, automatic chunking, English language, and both same-debate speaker references. Each call has one attempt. A request-level failure stops all remaining calls. A completed but deterministically unresolved transcript does not trigger a retry or correction.

Apply the promoted v4.1.6 deterministic thresholds without modification: full-clip excerpt recall at least 0.80; expected-speaker excerpt recall at least 0.80; expected-speaker recall margin at least 0.15; and expected-speaker duration at least five seconds. A lexical collision or any other failed check leaves that move unresolved and authorizes failure diagnosis only.

Planning uses the promoted production-canary rate of $0.006 per clip minute. Current official model pricing is also recorded in the preparation manifest because actual token-billed charges may vary. ChatGPT subscription billing does not apply. Freeze no paid execution manifest until the user explicitly approves the estimate and maximum cap.

This stage makes no 5.6 Sol judgment call and derives no score. Audio verification must pass for all five moves before adjudication packet preparation can be authorized. Adjudication execution, ledger assembly, score derivation, policy promotion, publication, production mutation, and remaining production batches remain unauthorized.
