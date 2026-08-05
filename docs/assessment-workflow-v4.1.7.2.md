# Assessment Workflow v4.1.7.2 — endpoint-compatible audio adjudication schema

This calibration-only amendment preserves the v4.1.7.1 endpoint failure as a failed attempt. The failure occurred in approximately two seconds, before a model judgment, because the output schema used the unsupported Structured Outputs keyword `uniqueItems` for an array. The runner made no paid call, produced no output, and authorized no downstream work.

Version 4.1.7.2 changes only the endpoint-facing schema identity and removes `uniqueItems`. The repository validator continues to enforce unique evidence-segment indexes deterministically after generation. All adjudication evidence, expected speakers, propositions, decision rules, isolation boundaries, model, reasoning effort, one-attempt/no-retry rule, and downstream stop rules remain unchanged.

The v4.1.7.2 runner records a bounded stderr tail if transport fails so a future failure is diagnosable without repeating the context. A valid output still must pass the exact repository validator. Success authorizes only analysis of the two disputed audio-attribution fields; scoring, legacy comparison, publication, production mutation, a held-out gate, and the 195-debate run remain blocked.
