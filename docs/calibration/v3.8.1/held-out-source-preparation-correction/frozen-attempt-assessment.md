# v3.8.1 frozen source-preparation attempt assessment

**FAIL — STOPPED AT THE PROPOSAL BOUNDARY.** All three source-proposal contexts produced schema-valid raw outputs and passed deterministic enrichment, but the frozen transport-recovery detector was unsound. Review, disagreement extraction, adjudication, audio verification, burden-contact classification, scoring, assessment prose, and production mutation therefore remained blocked.

The three proposal contexts used the frozen 5.6 Sol/high configuration through ChatGPT subscription authentication with API keys removed. Debate 103 completed in 307.676 seconds, Debate 55 in 2,926.735 seconds, and Debate 161 in 299.549 seconds. Each context used one inference attempt, returned eight candidate moves, contained no scoring field, exited normally, and passed the proposal validator. All raw and deterministically enriched outputs are retained with SHA-256 hashes.

The execution record nevertheless marked Debates 103 and 161 `stream-recovery-limit-exceeded`. That classification is invalid because the detector searched the entire model log with an unanchored semantic-text expression:

```text
(reconnect|resum(?:e|ing)|stream[^\n]{0,50}recover|retrying[^\n]{0,50}stream)
```

Its reported counts are explained by ordinary model-visible text, not structured transport records:

- The manual contains “reconnection,” contributing one false match to every context.
- Debate 103's final JSON contains “resumes,” which was echoed in the log; together with the manual this produced the recorded count of three.
- Debate 161's transcript and event file contain two instances of “presume.” The `resume` substring occurs in both representations; together with the manual this produced the recorded count of five.
- Debate 55 recorded one match—the manual's “reconnection”—even though the terminal exposed one genuine Codex transport retry. The actual warning used the order `stream ... retrying`, which the frozen expression did not match.

The genuine Debate 55 warning was:

```text
2026-08-04T08:58:15.849538Z WARN codex_core::responses_retry: stream disconnected - retrying sampling request (1/5 in 181ms)... turn_id=019fcbd6-c20b-7280-8b58-d448de9e1494 retries=1 max_retries=5 sampling_error=stream disconnected before completion: WebSocket protocol error: Connection reset without closing handshake
```

This retry remained inside the same request and turn ID, so it was not a second inference attempt. The output subsequently completed and passed deterministic validation.

## Required correction

- Parse only anchored structured `codex_core::responses_retry` warning lines; record timestamp, turn ID, retry ordinal, and retry maximum.
- Prove with a detector fixture that manual-like “reconnection,” transcript-like “presume,” and proposal-like “resumes” produce zero events, while the exact structured warning produces one parsed event.
- Separate semantic validation from transport diagnostics. A transport defect may block a stage under a frozen policy, but it must not rewrite a validator pass as semantic invalidity.
- Continue under a separately frozen v3.8.2 manifest. Reuse the three raw/enriched proposal pairs only by exact path and SHA-256, rerun their deterministic validators, and forbid regeneration or semantic normalization.
- Keep downstream review label-blind and isolated, adjudicate only deterministic disagreements, require audio verification for any move whose attribution is below high in either initial pass or the resolved field, and derive no scores until source preparation and burden-contact adjudication are complete.

Metered API cost was **$0**. Transcription cost was **$0**. Existing local transcript/event chains were used; no new transcript was requested.
