# Debate 254 candidate-1 source-scope notes

## Scope decision

- Frozen motion: **Is the Bible's treatment of slavery morally defensible?**
- Frozen affirmative team: Cliffe Knechtle and Stuart Knechtle.
- Frozen negative team: Matt Dillahunty and Joshua Bowen.
- The complete 6,175-event caption transcript was reviewed from 00:00 through 3:50:21, including all material after the debaters left.
- Assessed substantive window: **183,000–10,336,000 ms** (3:03–2:52:16). It begins when James Kunz gives the affirmative the floor and ends after Cliffe Knechtle's final substantive answer and the host's immediate acknowledgment.
- Excluded before the window: **480–183,000 ms**, consisting of the host introduction, channel promotion, format explanation, participant introductions, and pre-opening logistics.
- Excluded after the window: **10,336,000–13,824,780 ms**, consisting of the host's debate sign-off, music, solo post-debate commentary, chat interaction, future-show promotion, and outro. No team member is present in this interval.

## Moderator, host, and audience treatment

- James Kunz is the host/moderator. His introductions, time notices, requests to narrow or end exchanges, question reading, channel promotion, and closing remarks are not team moves.
- The Q&A begins at approximately 5,321,000 ms (1:28:41). Audience questions and super-chat statements are enumerated as third-party prompts, not arguments belonging to either team.
- Team answers during Q&A remain inside the assessed window when a named team member actually advances or adopts the reasoning. Candidate moves m20 and m21 retain the teams' own opposing Numbers 31 analyses; the audience prompt itself receives no credit.
- Audience topics that the teams did not substantively adopt are excluded from selection, including channel/show requests, healthcare, cosmology, rapture hypotheticals, personal-faith questions, sports jokes, and compliments or insults.
- Moderator paraphrases are not used as evidence for team ownership. Rapid exchanges and cross-talk remain subject to later audio confirmation.

## Attribution limitations

- No audio was heard or inspected in this pass. No selected move is represented as audio-confirmed.
- Every selected move is marked `medium` attribution confidence. Caption sequence, named addresses, explicit floor handoffs, and surrounding conversational continuity support the proposed ownership, but automatic captions do not independently identify voices.
- The highest-priority later audio checks are rapid exchanges and handoffs around m08–m10, m13–m17, and m20–m21. Audio review must confirm the speaker, exact start/end handoff, cross-talk, and any future quote-eligible wording.
- `quoteEligibleExactSpans` is intentionally empty for every move pending that audio gate.

## Selection and repetition

- Candidate structure: 5 semantic sections, weights totaling 100; 21 chronological moves; 9 affirmative and 12 negative.
- Each section contains both sides. Ordinary capacity is respected except the legal-status section, where four negative cards are prelocked because definition, legal particulars, lexical-context rebuttal, and property/runaway-law analysis are distinct contributions.
- The 3-move side asymmetry reflects Joshua Bowen's specialist textual contributions. Artificial parity would either omit distinct source material or repeat the affirmative's recurring canonical-trajectory inference.
- Five excluded repetitions map later restatements to retained moves. No selected move has `repeatedInferenceOnly: true`; repeated inference groups use `incrementalContribution` and `extendsMoveIds` as required.

## Execution provenance

- Direct incremental cost: **$0**. No network access, paid transcription, or paid model call was used.
- Inputs read: `authorization.json`, debate `manifest.json`, `source/source-lock.json`; caption `transcript.txt`, `events.json`, and caption `manifest.json`; `docs/assessment-standalone-team-debate-v1.md`; `docs/assessment-multi-speaker-approximation-workflow-v1.md`; inventory-validation portions of `assessment-production-multi-speaker-approximation-v1.mjs`; and `assessment-standalone-team-debate-v1.mjs`.
- Outputs written: `inventory/candidate-1.json`, this note, and preserved deterministic helper `inventory/generate-candidate-1.mjs`.
- Completion checkpoint: **2026-09-08T23:25:22Z**. Tool-reported read/generation/validation/checksum calls each completed in 0.1–0.2 seconds; the overall semantic review interval was not instrumented with a monotonic stopwatch, so no false exact end-to-end elapsed duration is asserted.
- Validation command outcome: `validateStandaloneTeamInventory` passed with 4 speakers, 5 sections, 21 moves, clear two-sided debate fitness, scorecard/winner eligibility true, pro 9/con 12, and 5 excluded repetitions.
- Candidate SHA-256 at the validation checkpoint: `53e2902b47bf8775f763b4aae8515fb542f3f66f463e04d7cc9c1d58e76a7fa4`.
- Helper SHA-256 at the validation checkpoint: `4083fa6125d686a51faec522159290d14abbb235f747330d97a373c713a082dc`.
