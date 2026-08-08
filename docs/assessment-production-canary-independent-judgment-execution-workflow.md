# Slugfester production-canary independent-judgment execution workflow

## Authorized operation

Execute exactly twenty isolated performance-judgment contexts: Pass A and Pass B for each frozen production-canary debate. Use only the hash-locked preparation artifacts. Each future context receives `manual.md`, `source-packet.json`, `judgment-packet.json`, and `schema.json`; it receives no other debate, other-pass output, candidate-selection material, legacy assessment, score, winner, tag, Overall Commentary, AI Extension, or publication prose.

Run `5.6 Sol` at low reasoning effort through the ChatGPT subscription. Copy subscription authentication into a fresh temporary Codex home for each context, remove every frozen API-key environment variable, use a fresh temporary working directory, disable tools and plugins, and keep the sandbox read-only. Record the actual Codex CLI version, model label and slug, reasoning effort, authentication, copied-input size, timestamps, duration, output hashes, attempts, and fees.

## Scheduler and failure boundary

Each context receives one attempt, no retry, no semantic correction, and at most fifteen minutes. The complete gate has an absolute three-hour limit and maximum concurrency two.

1. Run context index 0 alone as the first-real-context operational canary. It must validate before expansion.
2. Run indexes 1 and 2 with maximum concurrency two. Both must validate before expansion.
3. Run indexes 3 through 19 with maximum concurrency two. A failure does not cancel other independent contexts already authorized in this steady phase.

A transport error, timeout, missing output, source-hash mismatch, CLI-version mismatch, schema failure, semantic-validator failure, isolation failure, model-authored score, or ramp failure stops authorization beyond the stated boundary. Preserve every returned judgment even when validation fails. Do not retry, repair, widen writable fields, access audio, extract disagreements during execution, adjudicate, derive scores, publish, or mutate production.

## Acceptance and next action

Accept only twenty untouched schema-valid responses that compile through the promoted v4.2.20 semantic validator with zero semantic repairs and zero scores. Pass A and Pass B for every debate must retain the same canonical locked-inventory hash and have separate pass-specific raw outputs.

After deterministic analysis, a fully passing gate authorizes disagreement extraction only. Any repository attribution below high confidence or either judgment's below-high assessment confidence enters the later audio-verification queue. Audio preparation, audio access, adjudication, score derivation, publication, production mutation, and remaining production batches remain unauthorized.
