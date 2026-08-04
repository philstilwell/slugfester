# v3.8.4 full-coverage proposal manual

## Role and boundary

Act only as the `coverage-proposer` for the debate in `packet.json`. Read `workflow.md`, `rubric.md`, this manual, `packet.json`, `transcript.txt`, and `events.json` completely. Return exactly one JSON object conforming to `schema.json`.

This is a score-blind source-inventory task. Do not score either participant, infer a winner, assign section weights or move importance, classify burden contact, reconstruct legacy assessment prose, write Overall Commentary, or write an AI Extension. The eight seed moves are resolved source anchors, not a complete inventory and not a truth key.

## What must be represented

Review the full transcript and build the smallest inventory that still captures all assessment-relevant material:

- each side's load-bearing constructive arguments;
- each side's major direct replies to the other side's load-bearing arguments;
- every material concession actually made;
- each accepted motion, central, and subsidiary route bridge; and
- any consequential missed response where a bridge is not actually represented.

Do not retain or add a move merely because it is memorable, rhetorically forceful, amusing, biographical, or topically adjacent. A move belongs in the final inventory only if excluding it could materially distort a section score, the overall assessment, a major strength or blunder, or the account of how a route succeeded or failed.

## Seed decisions

Return one `seedDecisions` entry for each packet seed, in packet order.

- `retain` a seed when it is needed for the complete assessment inventory.
- `exclude` it when it is only contextual or incidental. An excluded seed must use `selectionRole: contextual-only`, `moveKind: constructive`, and an empty `respondsToRefs` array.
- For a retained seed, assign exactly one selection role and move kind.
- A constructive move has no response target. A reply or concession must point to at least one selected seed ID or packet-local addition reference.

The decision concerns assessment coverage, not whether the move is true or well argued.

## Additions

Add every missing assessment-relevant move found in the full transcript. At least one addition is required because the inherited inventory is known to be incomplete. Return additions in nondecreasing `startEvent` order with sequential packet-local references `addition-01`, `addition-02`, and so on.

Each addition must:

- use a 20–220 normalized-word atomic span no longer than 150 seconds;
- state one clear proposition faithful to that span;
- identify the participant and side using the locked speaker map;
- record high, medium, or low attribution confidence and a concrete attribution basis;
- have one selection role and one move kind; and
- identify selected response targets when it is a reply or concession.

Prefer the narrowest continuous span that preserves the actual inference. Do not splice events. Do not copy an exact seed span. Do not emit a stable move ID or quote text: event coordinates are authoritative, and the repository derives the exact excerpt, context window, timestamps, and stable ID.

`medium` or `low` attribution is permitted when uncertainty is real. It will trigger mandatory audio verification before the move can proceed. Do not inflate confidence to avoid that check.

## Selection roles

- `load-bearing-constructive`: a premise, inference, or cumulative synthesis necessary to a participant's positive route.
- `major-direct-reply`: a substantive answer, rebuttal, undercutter, or counterexample directed at a load-bearing opposing move.
- `material-concession`: an explicit or functionally clear concession whose omission would make the speaker's performance look materially stronger or weaker.
- `contextual-only`: framing or ancillary content that does not belong in the final scored inventory. This role is permitted only for excluded seeds; do not add contextual-only moves.

Each side must finish with at least four selected moves, at least one load-bearing constructive, and at least one major direct reply. The entire inventory may contain at most 28 selected moves and 24 additions.

## Bridge coverage and omissions

Return every bridge in `packet.acceptedBridgeIds` order.

- Use `represented` only when one or more selected moves genuinely express, support, or directly operationalize that route bridge. Include at least one move from the bridge's route side. `omission` must be null.
- Use `consequential-omission` only when the participant did not adequately present the bridge or failed to make a response necessary to it. `moveRefs` must be empty. Identify the relevant speaker, a bounded opportunity span, the omitted response, and why the omission matters to assessment.

An omission record is not a substitute for a move that actually appears in the transcript. One selected move may represent multiple bridges only when the source really makes the combined inference.

## Concession audit

Return `pro` and then `con`.

- Use `represented` with references only for selected moves assigned `material-concession`.
- Use `none-found` with no references when the full transcript contains no material concession for that side.

Do not treat politeness, hypothetical grants, temporary assumptions, or restatements of an opponent's view as concessions unless they materially narrow the speaker's case.

## Final audit

Set the five fixed audit fields exactly as required by the schema only after reviewing the complete transcript and checking all references. `complete-proposal-pending-independent-review` means the proposal claims coverage completeness but remains provisional until a separate label-blind review and, where needed, dispute-only adjudication.
