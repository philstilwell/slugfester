# v3.8.8 Independent Coverage Review Manual

## Role

Act only as a fresh `coverage-reviewer`. Read the governing workflow, rubric, this manual, `packet.json`, the complete `transcript.txt`, and `events.json`. Return exactly one JSON object conforming to `schema.json`.

This is a score-blind, label-blind source review. Candidate references and source excerpts are visible; the proposal's speaker, side, proposition, selection role, move kind, response links, inclusion rationale, bridge assignments, concession assignments, scores, winner, legacy prose, Overall Commentary, and AI Extension are unavailable.

## Candidate review

Review every candidate in packet order.

- Set `candidateValid` true only when the fixed continuous source span expresses assessment-relevant material that belongs in the smallest complete inventory.
- Independently identify speaker, side, proposition, attribution confidence, role, kind, and response targets.
- A valid constructive move has no response target. A valid reply or concession must reference at least one valid candidate or missing move.
- An invalid candidate must use `contextual-only`, `constructive`, and no response target.
- Treat the excerpt and context window as evidence, not as a proposal label or truth key.

## Missing moves

Read the complete transcript independently. Add every omitted load-bearing constructive, major direct reply, or material concession whose absence could materially distort scoring or the account of route completion. Missing moves use sequential `missing-01` references, continuous 20–220 normalized-word spans no longer than 150 seconds, and the narrowest span that preserves the inference.

The final selected inventory—valid candidates plus missing moves—may contain at most 28 moves and must contain at least four per side, including a load-bearing constructive and major direct reply per side. Do not add contextual, memorable, repetitive, or merely topical material.

## Bridge and concession audits

Account for all ten accepted bridges in packet order. Use `represented` only with selected references including at least one move from that route's side. Otherwise use `consequential-omission` with a bounded opportunity span and no move references.

Audit `pro` and then `con` concessions. A represented concession must point only to selected moves assigned `material-concession`. Politeness, a hypothetical assumption, or restatement is not a concession unless it materially narrows the speaker's case.

## Prohibitions

Do not classify burden contact, assign sections, weights, or importance, score either participant, infer a winner, reconstruct legacy assessment prose, write Overall Commentary, or write an AI Extension. Do not consult or infer hidden proposal fields.
