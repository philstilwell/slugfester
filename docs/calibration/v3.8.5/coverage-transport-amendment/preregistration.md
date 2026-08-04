# v3.8.5 Coverage Transport Amendment

## Purpose

The v3.8.4 coverage phase ended at its preregistered stop rule because Debate 161 exceeded the maximum of two same-request stream resumptions in three isolated attempts. All three Debate 161 responses nevertheless exited normally and passed the closed-schema and deterministic source validator. Debates 103 and 55 passed the original rule.

This amendment is prospective. It does not relabel or reuse any failed Debate 161 output. It preserves the valid Debate 103 and 55 artifacts and authorizes one fresh, isolated Debate 161 coverage-proposal context with unchanged semantic inputs.

## Transport rule

A recoverable subscription-stream resumption is an operational degradation signal, not by itself a semantic invalidation. The fresh context passes only when all of the following are true:

- the Codex command exits normally without timeout or termination signal;
- exactly one final response is written through the closed output schema;
- the existing v3.8.4 deterministic coverage validator passes;
- the complete-transcript audit remains true and no scoring or assessment prose appears; and
- no more than eight recoverable stream events are recorded.

Zero to two events are classified `clean`; three to eight are classified `recovered-degraded`. More than eight events, an unrecovered disconnect, timeout, nonzero command exit, missing output, schema failure, or deterministic validation failure blocks review.

Recovery evidence is extracted only from CLI transport lines in stderr, not from prompt, transcript, tool output, or the final proposal. Matching lines and stdout/stderr hashes are recorded. Independent coverage review remains mandatory for every accepted proposal, regardless of transport classification.

## Frozen scope

- Model: `5.6 Sol` (`gpt-5.6-sol`), high reasoning, ChatGPT subscription authentication.
- API keys removed; metered model API and transcription cost: $0.
- Fresh model contexts: exactly one, Debate 161 only.
- Previous Debate 161 proposals unavailable to the model.
- Debates 103 and 55 are not rerun.
- Packet, schema, transcript, events, rubric, manual, and semantic prompt requirements are unchanged.
- Model-output retries: zero; timeout: 60 minutes.
- Coverage review, adjudication, burden classification, scoring, prose, production changes, and the 195-debate rollout remain unauthorized until a later committed lock.

## Rationale for the ceiling

Eight is a conservative operational ceiling for this retired calibration pass: it is two events above the worst observed v3.8.4 Debate 161 run while still forcing a stop for markedly worse instability. The ceiling is frozen before the fresh response exists and cannot be raised within this amendment.
