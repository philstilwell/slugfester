# Slugfester multi-speaker approximation workflow v1

## Purpose and disclosure

This is a deliberately pragmatic production lane for the 16 published debates that contain three or more substantive interlocutors. It preserves the ordinary Slugfester Reassessment Rubric v2 dimensions and side-score formula, but it does not claim the calibration pedigree of the promoted one-speaker-per-side workflow.

Published records produced by this lane must identify themselves as `Slugfester Reassessment Rubric v2 — Multi-Speaker Approximation`. They must not be relabeled as ordinary v2 reassessments. The result is an AI-generated estimate of the two sides' transcript performance, not a ground-truth judgment of the participants or their views.

## Why this lane is simpler

The retired v2.7 multi-speaker experiment was structurally sound but failed repeatability gates for fine-grained target identity, response-coverage categories, defect types, diagnostic objects, and diagnostic consequences. Speaker ownership and burden-route contact were comparatively stable.

This lane therefore does not ask primary judges to classify those unstable fields. It freezes a chronological move inventory, explicit response links, side burdens, source spans, importance values, and speaker ownership before scoring. The two primary judges then rate only the six familiar numerical dimensions and provide short rationales.

## Source and identity gate

1. Require the complete local `transcript.txt`, `events.json`, and `manifest.json` chain under `.assessment-cache/captions/<videoId>/`.
2. Verify the recorded SHA-256 hashes before semantic work.
3. Freeze exactly two scorecard sides and an explicit speaker allowlist for each side. Moderators, hosts, audience members, and quoted third parties are not interlocutors unless they substantively adopt and defend a position.
4. Keep every legacy score, critique, quotation selection, tag, winner, Overall Commentary, AI Extension, and ranking outside all inventory, judgment, and adjudication contexts.
5. Stop if a substantive speaker cannot be assigned to one side, if the format is not meaningfully two-sided, or if the transcript cannot support reliable speaker ownership.

## Inventory contract

Create four to seven topical sections whose positive integer weights total 100. Select 12–40 load-bearing moves from the complete debate. A move contains:

- its actual speaker and scorecard side;
- an exact chronological source span and optional exact quote-eligible substrings;
- a concise proposition, move kind, importance from 1–3, and one side-burden bridge;
- zero or more earlier opposing move IDs that it answers; and
- zero or more earlier same-side move IDs that it explicitly adopts or strengthens.

A teammate's claim remains that teammate's claim. Side membership alone never transfers individual credit. Same-side adoption requires explicit transcript evidence. Every substantive interlocutor must appear in the coverage record; if a speaker has no selected move, the inventory must explain why. The inventory must not manufacture paired moves merely to equalize speaker or side counts.

Every scored section must contain at least one selected move from each side. If the source does not support that minimum, merge or remove the section rather than inventing an answer.

## Independent judgments and adjudication

Use two fresh, isolated 5.6 Sol contexts at low reasoning effort through the ChatGPT subscription. Both receive the same score-blind inventory and the v2.1 scoring anchors. Neither may see the other pass, calculated totals, legacy material, publication prose, other debates, or winner labels.

Each pass rates every move from 0–100 on:

- logical coherence — 25%;
- evidence and warrant — 20%;
- responsiveness — 20%;
- relevance and burden — 15%;
- precision and clarity — 10%; and
- calibration and charity — 10%.

Constructive moves are rated for responsiveness to the motion and their known burden. Replies are rated against the frozen opposing targets. A judge may not lower a speaker's rating merely because a teammate was weak, silent, or inconsistent; those effects enter only through the teammate's own moves or the bounded side-level burden adjustment.

Code extracts disputes when a dimension differs by more than eight points, when a move total differs by more than four points and that dimension differs, when assessment-confidence labels differ, or when the side-level burden adjustments materially differ. A third isolated context sees only the disputed source evidence and anonymous existing options. It selects an existing option; it cannot write a compromise score.

Every below-high-confidence speaker attribution is audio-verified before the final ledger. Any unresolved attribution or dispute stops the debate.

## Mechanical scores

Repository code derives scores exactly once after the final ledger is fully resolved.

`move = .25L + .20E + .20R + .15B + .10P + .10C`

For each side in each section, the section score is the importance-weighted mean of that side's selected move scores. The overall side score is the prelocked section-weighted mean plus a side-level burden-completion adjustment from −5 to +5, bounded to 0–100.

The calculator also reports a non-published `speakerContributionScore`: the importance-weighted mean of only that speaker's selected moves, with no burden adjustment. It is diagnostic context, not a substitute for the side score and not eligible for the public interlocutor rankings unless a later ranking policy explicitly authorizes it.

Use the active v2.2 score-stability limits: mean absolute final-score distance from both primary passes at most four points, maximum distance at most eight, and maximum excursion outside the two-pass range at most three. Preserve failures; do not rerun or tune scores to obtain a preferred winner.

## Publication

After scores lock, reconstruct the ordinary summary, exact representative quotations, four-sentence critiques, Overall Commentary, and separately labeled AI Extension under the current publication controls. Publication prose cannot change inventory, speaker ownership, judgments, or scores.

Display exactly:

`Assessments made by 5.6 Sol. — Rubric: Slugfester Reassessment Rubric v2 — Multi-Speaker Approximation.`

The page must state that the displayed totals assess the two sides collectively. It may identify the actual speaker responsible for each argument card. It must not present a side total as the individually calculated score of every teammate.

## Staging and stop rules

Begin with Debates 71, 84, and 154 as a three-format checkpoint: two-versus-one, one-versus-two, and a mixed inquiry panel. These are production checkpoint inputs, not a new held-out reliability test. If they independently pass source, ownership, judgment, audio, adjudication, scoring, prose, and rendering checks, process the remaining 13 debates in frozen batches of four, four, and five.

Stop a debate on a source-hash mismatch, ambiguous substantive speaker, unresolvable side assignment, contaminated model context, invalid judgment, unresolved dispute, required audio failure, score-stability failure, non-exact quotation, publication-integrity failure, or rendering regression. One failed debate does not replace or silently alter another debate's place in the frozen census.

## Cost checkpoint

The 16 canonical transcript chains currently validate locally, so no paid transcription is expected. Subscription-backed model execution has an expected direct incremental dollar cost of $0, with roughly 7–10 aggregate model-context hours based on the completed dyadic campaign. Model execution remains a separate checkpoint so the actual model label, authentication, elapsed time, and any unexpected paid fallback can be recorded honestly.
