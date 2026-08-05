# v4.2.1 primary-gate failure assessment

The preregistered v4.2.1 fresh-six primary gate failed on its first context, Debate 07. The runner stopped immediately, made no retry, and did not execute the remaining five contexts.

## What passed

- All frozen source hashes matched before execution.
- The lossless compact ledger passed exact replay preflight against the local normalized events.
- 5.6 Sol/low returned an endpoint-schema output in 4.25 minutes, inside the 30-minute limit.
- Transport was clean: zero recoverable stream events, no timeout, and no command failure.
- Metered API and transcription cost remained $0.

These facts preserve the v4.2 compact-transport result. Input transport is not the implicated failure mechanism.

## What failed

Deterministic validation rejected one response edge. `pro-trial-reply`, beginning at event 2846, named `con-trial-presupposition`, beginning at event 2877, as its target. A reply cannot target a later move. The immediately preceding opponent material at events 2828–2845 prompted the reply, but the model did not select that earlier material as a move; it instead linked the reply to a later restatement.

The raw output is preserved unchanged. No compiled output, trigger artifact, score, winner, legacy comparison, or publication prose was created. Because validation stopped at the first error, no claim is made that all later validators would have passed.

## Workflow judgment

This is a low-effort semantic-linkage failure encouraged by the nested section layout: moves are emitted under topical pro/con arrays while chronology is reconstructed only afterward. The prompt and manual already required earlier targets, so simply repeating the instruction is not a strong remedy. Automatic retargeting would alter the model's judgment and remains prohibited.

The next development revision should retain compact transport and all rubric anchors but replace nested move arrays with one explicitly chronological move inventory. Each move will retain a section ID and side, and every reply may reference only target IDs already emitted above it. Deterministic chronology rejection, one attempt, no retry, no normalization, and repository-owned timestamps remain unchanged.

Debate 07 may be used only as a retired diagnostic for that structural revision. All six v4.2.1 sample identities are excluded from any later fresh gate.
