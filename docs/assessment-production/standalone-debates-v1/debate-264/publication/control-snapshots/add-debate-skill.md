---
name: add-slugfester-youtube-debate
description: Assess and publish one new YouTube debate to SLUGFESTER using locked evidence, isolated judgments, adjudication, deterministic scoring, publication review, and a quality-gated pull request. Use for a one-speaker-per-side exchange, qualifying primary-speaker exchange, or explicitly authorized two-team debate. Do not use for an existing debate, rescore, or panel.
---

# Add a SLUGFESTER YouTube Debate

Turn one YouTube URL into one audited, production-published standalone debate. Repository controls and the newest accepted standalone precedent are authoritative; older new-debate documents are not.

Read [references/single-debate-runbook.md](references/single-debate-runbook.md) before acting.

## Eligibility and standing authorization

- Ordinarily accept exactly one substantive advocate per side. Moderator logistics are allowed; panels, roundtables, and materially three-sided exchanges are not. For an explicitly authorized recording organized as two opposing teams, read [references/team-debate-runbook.md](references/team-debate-runbook.md) and use its separate approximation lane. Never force a team through the dyadic validator.
- A recording organized around exactly two primary opposing speakers may use the repository's locked primary-speaker scope exception when incidental host advocacy occupies at most 5% of the assessed window, introduces no distinct side or unique load-bearing motion argument, and can be cleanly excluded with every substantive host span and response-to-host span enumerated. Never silently ignore the material: freeze the exclusion audit before judgment, give neither side credit or penalty for it, disclose the scope in reader-facing source notes, and use the dedicated validation profile. If any condition is uncertain, treat the recording as non-dyadic and stop.
- Treat an existing video ID, canonical URL, or debate identity as a duplicate no-op. Never create a second entry or silently rescore it.
- Infer the canonical identity, neutral motion, speakers and sides, event year, title, label, topic, slug, and next sequential number from the source and repository.
- Complete a valid run through a checked topic branch, pull request, and green merge. Do not create avatars; add only the metadata required for the separate avatar workflow.
- Local computation and subscription-backed model work have $0 direct incremental cost. Up to $1.00 of cumulative paid OpenAI transcription is authorized only after reporting a frozen full-debate estimate at or below that cap. Do not use another paid service.
- Continue routine steps within the authorized debate without requesting approval again: source checks, required isolated reviewers, internal authentication releases, already-permitted bounded repairs, validation, and the checked publication sequence. Report progress instead. Ask only when a material user choice or new authority is necessary, such as changing scope or frozen assessment substance, exceeding the cost cap, or replacing an exhausted attempt. A preference for fewer approvals does not itself waive these safeguards; apply any specific exception only to its approved fields and attempt count.

## Load current controls

Before changing files:

1. Read applicable `AGENTS.md` files and the installed `reassess-slugfester-debates` skill.
2. Read the repository's active production workflow, rubric and amendments, publication contract, score policy, schemas, calculator, validators, package scripts, standalone registry, and newest published standalone record.
3. Fetch `origin`; require a clean `main` with local `HEAD`, local `main`, and `origin/main` equal. Create a dedicated topic branch before the first write. Preserve unrelated work and stop if safe isolation is impossible.
4. Freeze the exact model slug, display label, reasoning effort, authentication, source hashes, cost rule, scoring controls, and writable paths from the current repository controls. Never rely on a model or version remembered by this skill.

Use the `transcribe` skill only when transcript recovery or audio verification needs it. Use the `playwright` skill for desktop and mobile verification.

## Assessment invariants

- This is a standalone post-campaign addition. Never call it Batch 18 or modify frozen campaign, calibration, closure, cost, source, judgment, rendering, or historical-failure evidence.
- Use the standalone registry as the only debate-number and path router. Pass `--debate NNN` to every reusable write or audit mode; do not add debate-specific constants to shared code.
- Before executing a copied, recovered, or adapted controller, scan its executable text for every prior debate number, slug, video ID, speaker, motion, source window, artifact path, expected item count, and manual override. Any stale identity or count is a blocker, even when the destination directory is correct. Prefer values derived from the current registry and frozen artifacts over copied literals.
- Treat the caption track selected by the acquisition tool as a candidate, not proof of completeness. Compare its timed coverage with the source duration and substantive debate window; if it is materially partial, inspect alternate language-matching tracks and prefer the complete track before considering paid transcription.
- Freeze a complete score-blind inventory with semantic section IDs, burden links, source spans, `selectionBalanceAudit`, and a publication-capacity audit before judgment. For a primary-speaker exception, also freeze `primarySpeakerScopeAudit` and mechanically prove that no selected move, response link, quotation, or evidence span enters an excluded interval. The controller—not the inventory worker—must recompute every total, per-section side count, capacity flag, fourth-row condition, and exception boundary from the selected moves. Every section must already fit the current row rule; preserve a failed inventory and restructure semantic section boundaries before judgment when it does not.
- Keep primary judgments isolated, score-blind, publication-blind, and mutually blind. Preserve authenticated execution records. Run a fresh adjudicator only on deterministically extracted disputes and complete required audio checks first.
- Assemble the resolved ledger before scoring. Run the repository calculator exactly once. A model never authors totals; a person never adjusts them.
- Let source coverage determine move counts. Keep each move's evidence span to the smallest complete transcript passage that proves its proposition; full-source review does not justify padded per-move excerpts. Three exchange rows are ordinary; a fourth must satisfy the repository's general locked-card rule without a debate-number or section-name exception. Never merge, drop, or reassign scored moves later to make publication fit.
- Keep the neutral authorized question byte-identical in authorization, inventory, publication, and production. Keep position labels distinct from speaker identities.

## Publication invariants

- Map every locked move exactly once and preserve exact source quotations. Meet the current argument-card, critique, Overall Commentary, AI Contribution, disclosure, and novelty-map contracts.
- Compare the candidate against an independent 25-debate production window. Formal limits and corpus-relative parity are separate gates; explain source-required outliers rather than padding or deleting evidence.
- Preserve normal written punctuation throughout reader-facing prose. Audit the complete AI Contribution against the published corpus for signs of punctuation loss, then inspect every flagged sentence directly. Treat punctuation density only as a drift detector, never as a comma quota.
- Write the AI Contribution as natural editorial argument, not a visible generation template. One section-level AI disclosure is sufficient: do not introduce individual theses, conclusions, or reinforcing arguments with provenance frames such as “AI-generated extension,” “AI-developed extension,” or “possible extension.” Reject repeated launchers such as “a … model would,” mirrored scaffolds between the two sides, interchangeable abstractions, and other formulaic prose even when length and punctuation gates pass. Let each item begin with its substantive claim, reason, contrast, or consequence; vary form only where the argument itself warrants it.
- Review fallacies and cognitive biases only after scores lock: two fresh blind move-complete passes, then fresh adjudication of the full anonymous candidate union. Accept only catalog-supported defects already represented in the critique, and never change a score because of a tag.
- Begin rhetorical-review overrides empty. If a source-specific deterministic correction is later necessary, it may name only current inventory move IDs, must be justified against the exact local catalog definition, and must be included in the authenticated audit rather than silently inherited from another debate.
- Before overwriting rejected publication bytes, preserve them exactly. A repair may touch at most two declared leaf fields per shard, receives one attempt, and cannot change identity, evidence, inventory, judgments, adjudication, critiques outside scope, or scores.

## Completion

Publish only after source, judgment, dispute, audio, score, publication, tag, ledger, generated-page, desktop/mobile interaction, historical, standalone, content-parity, AI Contribution nonformulaic-prose, punctuation-integrity, and full repository gates pass.

Run `npm run site:preflight` after generated pages are current and again immediately before the publication commit. Fix any failure at its source; do not silence the gate by casually rebasing its catalogue budget. Review the final diff and secrets. Fetch immediately before pushing, never force-push, push only the topic branch, and open a pull request against `main`. Wait for the required `accessibility-and-performance` check, merge only when it passes, then fetch and verify that `origin/main` contains the merged commit. Close temporary browsers and servers and remove temporary controller files while retaining required hashed evidence.

If this installed skill is revised during an active task, validate the skill and reread the complete `SKILL.md` plus every changed reference before continuing. That explicit reread refreshes the instructions for the current task; a new thread is not required.

Report the debate number and title, sides, scores, source and audio disposition, any primary-speaker scope exception and excluded material, known and maximum possible paid cost, recoveries, corpus-relative checks, rendering, validations, production files, commit, push synchronization, and cleanup status.

Stop when identity or complete evidence cannot be established, the exchange fits neither the dyadic rules nor the authorized two-team lane, the frozen paid estimate exceeds $1.00, a required gate remains invalid, repository history cannot be reconciled safely, or a proposed repair would alter frozen assessment substance.
