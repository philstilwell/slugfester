# v3.8.10 preflight assessment

## Result

**Failed at the expanded synthetic preflight.** No real debate context was authorized or executed.

The endpoint accepted the exact v3.8.10 shared schema and produced seven structured move judgments covering all seven response classes, tested and untested charity, component-count boundaries, and zero burden adjustments. Packet-aware validation then rejected the first move because the model copied an invented section ID, speaker, and source span rather than the synthetic packet's locked identity fields.

## Root cause

The preflight runner copied `schema.json` into the isolated model directory but did not copy `packet.json`. Its prompt named the seven move IDs and semantic values but did not enumerate every locked identity and source-span field. The model therefore had no access to the authoritative synthetic packet and filled those schema-permitted identity fields itself.

This is an input-boundary defect in the preflight harness, not a scoring-model or response-class defect. The seven-class schema itself was endpoint-compatible, and no lexical rationale validator rejected the output.

## Preserved boundary

- One synthetic context made one attempt.
- The raw synthetic output and execution record are preserved unchanged.
- No retry or repair counts toward v3.8.10.
- Debate judgments, adjudication, scores, assessment prose, production data, rankings, and the held-out gate remain untouched.
- Metered model API cost was $0 and new transcription cost was $0.

## Required v3.8.11 remediation

1. Copy the frozen synthetic packet into the isolated preflight directory alongside the exact schema.
2. Require the model to read `packet.json` and copy every locked identity, source-span, burden-contact, and move-kind-dependent field exactly.
3. Hash the packet-copy behavior and prompt in a separately versioned preflight lock.
4. Run one fresh seven-class synthetic context. Only a first-attempt packet-aware pass may authorize fresh debate contexts.

v3.8.10 is permanently failed and cannot be reinterpreted as a pass.
