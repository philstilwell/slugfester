# Slugfester assessment workflow v4.2.21.17.41

## Purpose

This stage closes the five-debate hard-route publication gate, records browser evidence, and decides whether the adjudicated-consensus workflow may be consolidated for a staged 195-debate production run.

## Rendering gate

Verify Debates 51, 63, 90, 153, and 165 at 1440×1000 and 390×844. Each page must:

- render without horizontal overflow or console errors;
- show the exact byline `Assessments made by 5.6 Sol. — Rubric: Slugfester Reassessment Rubric v2.`;
- place `AI Extension` immediately after `Overall commentary`;
- identify the section as an AI contribution and omit the word `unassailable`;
- use styling visibly distinct from Overall Commentary;
- use a native `details` accordion that is collapsed on load;
- open by pointer and toggle by keyboard;
- contain a strengthened final argument and new reinforcing arguments for both sides.

## Production publication controls

- Generate one score-blind publication reconstruction per debate with 5.6 Sol/low through the ChatGPT subscription.
- Target 112–118 words for every four-sentence critique; accept 105–130 words with at least 880 characters, exact ordered labels, terminal punctuation, and no unexpected CJK/Hangul or replacement characters.
- Target 6–14 words for representative quotations; accept only 3–18 word exact substrings from quote-eligible locked spans.
- Do not impose a critique maximum-character schema constraint. Repository validation, not transport truncation, enforces the word boundary.
- Partition invalid publication fields deterministically into isolated repair packets containing at most two writable fields. Permit one attempt per packet and no recursive automatic retry. A failed repair stops that debate for audit.
- Keep identity, structure, moves, judgments, scores, tags outside the repair packet, Overall Commentary, and AI Extension immutable unless the failed field itself is explicitly authorized.
- Derive scores only after adjudication and before publication prose. AI Extension never affects scores.

## Launch decision rule

A passing gate authorizes production workflow consolidation and preparation of a frozen 195-debate manifest. Production execution must be stage-batched, dyadic-only, and begin with a mandatory ten-debate checkpoint. It must fail closed on a missing or invalid local transcript, source-hash mismatch, speaker-count ambiguity, invalid model output, unresolved audio trigger, non-exact quotation, score mutation, publication-integrity failure, or projected schedule breach.

This stage does not itself mutate production debate records or launch paid transcription.

