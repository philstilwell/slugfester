# Slugfester Primary-Recovery Workflow v4.2.19

This development-only workflow implements the recovery authorized by the preserved v4.2.18.3 failure diagnosis. It does not retry or repair the failed v4.2.18.2 gate, derive scores, modify a published assessment, or authorize the 195-debate run.

## Direct-versus-partition routing

Route a primary context directly only when both preregistered transport measures pass: no more than 1,800 compact-ledger events and no more than 150,000 copied input bytes. Route every context exceeding either ceiling to the partition lane. Video duration is recorded but has no routing authority. The byte count must be calculated from the exact files that will be copied into the isolated model context before source hashes are frozen.

## Source evidence contract

The model no longer writes the final excerpt. For every selected move it supplies the inclusive source-event range and an exact 6-to-20-token evidence cue, at most 180 characters, copied from that range and beginning and ending at lexical-token boundaries.

Before substantive validation, the repository verifies the cue against the local timestamped transcript and expands it deterministically into a contiguous, verbatim window of 12 to 90 lexical tokens and no more than 450 characters. Expansion stops only at whole-word boundaries, never changes the chosen event range, retains the cue, and derives timestamps from the original event file. A missing, inexact, overlong, or unexpandable cue fails the context; there is no post-hoc model correction.

## Chronology contract

The repository orders moves by `startEvent`, then `endEvent`, then `moveId`. Only after that ordering does it validate every response edge. A reply targeting a move that is not earlier in canonical order fails. Sorting changes presentation order only; it cannot change a proposition, source range, target, component finding, rating judgment, or participant attribution.

## Responsiveness contract

The model records response targets, all indispensable target components, contact findings, issue-bearing contrary material, an explicit diagnostic consequence, and an answered replacement demand. It does not select a response class and cannot emit an absolute responsiveness rating.

The repository derives the class in this order:

1. A constructive move is `constructive-opening`.
2. Mutually exclusive exceptional findings produce `diagnostic-defeat` or `justified-reframe` only when their existing structural requirements pass.
3. Contact with every indispensable component is `full-answer`; contact with some but not all is `partial-answer`.
4. With no component contact, issue-bearing contrary material is `relevant-nonanswer`; otherwise the move is `nonanswer`.

The model supplies only a 0-to-100 position within the not-yet-numeric derived class, plus a rationale. The repository maps that position linearly and deterministically into the locked class band. This eliminates the former impossible tuple in which the model could select one class, report component findings implying another, and provide an absolute number compatible only with its selected class.

## Preserved controls

All prior source-chain hashes, scoreblindness rules, one-pass schema discipline, burden-adjustment exclusion rules, speaker attribution requirements, and escalation rules remain in force. Medium-confidence attribution remains a mandatory audio-verification trigger before adjudication or score derivation. Raw model judgments and repository-compiled outputs are stored separately.

The v4.2.19 fixture re-encodes the two preserved invalid raw outputs only to exercise the new compiler and mutation tests. Those synthetic fixtures are not accepted gate results and do not replace the recorded timeout or validation failures.

## Authorization boundary

A passing code-only fixture authorizes preparation of a new disjoint recovery sample and frozen execution manifest. It does not by itself authorize model execution. Any new Sol run requires a fresh cost estimate, an explicit execution authorization in the preregistration artifact, and the unchanged no-retry/no-correction policy.
