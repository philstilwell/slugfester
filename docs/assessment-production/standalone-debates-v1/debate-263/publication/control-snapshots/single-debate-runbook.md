# Single-Debate Runbook

Use this runbook after loading the current repository controls and the `reassess-slugfester-debates` skill. Derive model settings, schemas, commands, and writable paths from those controls and the newest accepted standalone record; repository evidence wins if this runbook has aged.

For an explicitly authorized new two-team recording, also read [team-debate-runbook.md](team-debate-runbook.md). Its repository-backed approximation lane replaces the dyadic-only eligibility and assessment contracts; all unaffected safeguards below still apply. Do not apply that exception to an existing debate or the frozen campaign.

## 1. Repository and debate identity

1. Fetch `origin`, confirm the workspace is clean, switch to `main` if safe, and require equality among local `HEAD`, local `main`, and `origin/main`. Create a dedicated topic branch before the first write.
2. Canonicalize the supplied YouTube URL to its video ID. Ignore time fragments and other tracking parameters for identity.
3. Search debate data, production ledgers, standalone records, URLs, video IDs, slugs, and speaker/motion metadata for a duplicate. A duplicate is a successful no-op, not permission to rescore.
4. Establish the public title, event year, neutral central question, speakers, and each side's relation to that question. Use the exact same question in authorization, inventory, publication, and production; add a validator that compares all four values byte-for-byte. Never expand it into a stronger affirmative proposition during publication. `pro` affirms the frozen question; `con` denies or criticizes it. Stop if the mapping remains genuinely ambiguous.
5. Ordinarily confirm exactly one substantive speaker per side. Moderator logistics are permitted; a moderator who advances arguments is a third participant unless the repository's primary-speaker scope exception is fully satisfied and frozen before judgment.
   - The source must be explicitly organized around exactly two named primary opponents who alone carry the central motion burdens; a team, panel, roundtable, third side, or recurring co-advocate remains ineligible.
   - Enumerate every substantive non-primary intervention and every directly dependent primary-speaker response as exact source intervals. The combined substantive non-primary duration must be no more than 5% of the assessed window.
   - Establish that each non-primary argument merely duplicates or prompts a line independently developed by a primary speaker and introduces no unique load-bearing motion argument. Uncertainty fails the exception.
   - Freeze a `primarySpeakerScopeAudit` before judgment, use the dedicated registry validation profile, exclude the enumerated material from moves, response links, quotations, and judgment evidence, and disclose the exclusion in the published source note. Neither primary side may receive credit or penalty for excluded material.
6. Derive the next sequential debate number from the validated repository ordering. Use the repository's current padding rule. Create a stable unique slug and a concise speaker-free label.
7. Use the assessment and rendering date for the debate's `date` field. Keep the original event year in the title, slug, and appropriate metadata.
8. Add the debate to the standalone registry immediately after authorization. Treat that record's debate number, root, video ID, validation profile, and ledger path as the only routing authority for reusable tooling. Assign accepted older records an explicit frozen legacy profile; use the current semantic, balance-aware profile for new records.

## 2. Complete source acquisition

Prefer the repository's local caption acquisition path:

```bash
node scripts/acquire-youtube-captions.mjs "YOUTUBE_URL"
```

Require the cached transcript, timestamped events, and manifest under `.assessment-cache/captions/<videoId>/`. Validate video identity, language, duration, event ordering, event count, nonempty text, and all recorded hashes. Permit only light deterministic normalization that preserves words and timestamps.

Do not infer completeness merely because the chosen track is human-authored, nonempty, or internally valid. Compare its first timestamp, maximum event end, and material gaps with the source duration and the substantive debate window. When coverage is materially partial, enumerate the source's language-matching tracks and select the one that actually covers the full exchange, even if that means preferring an auto-generated track over an incomplete human track. Preserve the rejected partial acquisition separately when it matters to provenance, then rebuild and hash-lock the canonical cache from the complete track. Reach paid transcription only after the available public tracks have been exhausted.

If complete usable captions are unavailable:

1. Load the `transcribe` skill.
2. Obtain the current authorized transcription rate from an authoritative local or official OpenAI source.
3. Freeze the full-media and required-clip estimate, including the cost already incurred for this debate.
4. Report that estimate before the first paid call and proceed automatically only when the cumulative maximum is no more than $1.00.
5. Use one paid attempt per frozen media input or audio-verification clip and no paid retries unless the user grants a debate-specific exception.
6. Normalize a successful result with the repository's current transcript-normalization tool, presently `scripts/normalize-openai-diarized-transcript.mjs` where applicable.

Raw media and transcript cache may remain ignored. Commit durable provenance: canonical video ID and URL, acquisition method, hashes, duration, event and word counts, timestamp coverage, speaker-attribution basis, and bounded representative excerpts allowed by repository policy.

## 3. Standalone evidence package

Never assign a batch number or create Batch 18. Follow the newest accepted standalone post-campaign precedent. If the repository has no standalone structure yet, create the smallest reusable structure under:

```text
docs/assessment-production/standalone-debates-v1/
  registry.json
  debate-NNN/
    authorization.json
    manifest.json
    source/
    inventory/
    judgments/pass-a/
    judgments/pass-b/
    disagreements/
    audio/
    adjudication/
    final-ledger/
    score-pass/
    publication/
    rendering/
    validation-summary.json
    report.md
```

Before model work, freeze an authorization record and manifest covering the URL, video ID, source hashes, rubric and workflow hashes, score policy and code hashes, exact model settings, cost cap, allowed paths, one-score-pass rule, repair limits, repository baseline, and expected artifacts. Hash-lock completed gates as the workflow progresses.

When the primary-speaker scope exception is used, additionally hash-lock the repository's active exception amendment, name the dedicated validation profile in the registry, and carry the identical assessed window and exclusion intervals through authorization, source lock, inventory, publication, production ledger, and final audit.

### Controller-reuse preflight

Treat a copied or recovered controller as untrusted scaffolding until it passes a current-debate identity sweep. Before executing any phase, search the controller's executable text and configuration for the prior debate's number, padded number, slug, video ID, title, motion, speakers, side labels, source timestamps, artifact roots, ledger path, expected section/move/dispute/tag counts, schema cardinalities, and manual override IDs or decisions. Also search for current-debate values and require each identity-bearing field to have exactly one explainable source of truth. A changed output directory is not enough: any stale executable value is a blocking failure.

Derive identities, paths, move IDs, and collection counts from the current standalone registry and already frozen artifacts wherever the phase permits. When a value must remain literal, assert it against those current artifacts before the first write. After each phase, recompute output identity and counts independently and reject any mismatch rather than repairing downstream files around it. Preserve a failed recovered controller and its diagnostic when repository controls require failure evidence; never treat its output as current-debate evidence.

For rhetorical review specifically, initialize all controller-level acceptance, rejection, relabeling, and context overrides to empty. A later deterministic correction must be introduced only after the two current blind passes and current anonymous adjudication exist; it may reference only move IDs in the current locked inventory, must quote the exact applicable local catalog definition, and must appear in the final authenticated rhetorical audit. Reject any copied override, even one that happens to reference a syntactically valid current path.

## 4. Score-blind assessment

1. Inventory the entire source before judging it. Freeze substantive moves, speaker, side, timestamps, exact source spans, section assignments, reply links, inferential bridges, importance, and rubric weights.
   - Under the primary-speaker scope exception, include `primarySpeakerScopeAudit` with the assessed window, every excluded substantive host interval, every excluded response-to-host interval, duration totals, the derived percentage, duplication and burden-impact rationales, and a mechanical intersection audit. The controller must independently recompute interval durations and prove that every selected move and quotation lies outside every excluded interval before either primary judgment runs.
   - When cross-talk prevents reliable word-level turn boundaries, conservatively treat the complete continuous host-led exchange as the host interval and count all of it toward the 5% ceiling. Still enumerate directly dependent primary replies separately, permit those reply intervals to overlap the conservative host interval, and compute total excluded duration as the interval union so overlapping time is not double-counted.
   - Make each move's source span the smallest contiguous passage that states the claim and its load-bearing reason or inference. Do not copy broad transcript neighborhoods into every move merely because the complete source was reviewed. Apply the current transport ceiling mechanically, and require a source-specific rationale when a genuinely complete argument needs a longer span.
   - Give every section a unique descriptive semantic ID before locking it; generic IDs such as `s1` are not publication-ready. Validate uniqueness and the lowercase-slug syntax `[a-z0-9]+(?:-[a-z0-9]+)*` in both the inventory and production record.
   - Add a `selectionBalanceAudit` object to the inventory. Record total selected-move counts by side and counts by side within every section. When the total difference is at least three or any section's side-count difference is at least two, record a source-based rationale identifying why every asymmetric move is load-bearing. Validate the counts, threshold, and required rationale before locking the inventory. Do not manufacture symmetry or omit a material move.
   - Run a deterministic publication-capacity gate before launching either primary judgment. Independently derive total and per-section side counts from the move array; never trust the worker's stated count or `withinCapacity` flag without recomputation. Require exact equality between derived counts and both audit objects. Each section must contain no more than four selected moves per side, and every section reaching four on either side must carry the frozen fourth-row authorization required below.
   - If a section exceeds capacity or any reported count is wrong, preserve the complete invalid inventory and validator failure. While still score-blind, prefer a semantic resection that moves a coherent paired exchange together and preserves chronology and reply meaning; do not merely shift one side to make the arithmetic pass. Lock the corrected inventory, recompute every count again, and rerun the full validator before judgment. Never merge, delete, or reassign scored moves afterward merely to satisfy the display contract.
2. Give two fresh isolated promoted-model contexts the same score-blind packet. Store their outputs in disjoint paths and validate each independently. Freeze a judgment-execution record containing the exact model label and slug, reasoning effort, isolation method, allowed input hashes, output hashes, writable paths, attempt and retry counts, and direct incremental cost for both passes.
3. Deterministically compare the judgments and extract every disagreement specified by the active workflow.
4. Perform every required below-high-confidence audio check before adjudication. Freeze clips, transcribe sequentially, never repeat successful calls, and record hashes, attribution decisions, and cost.
   - Require the triggered move IDs and completed check IDs to match the inventory's below-high-confidence move IDs exactly and in order.
   - Track `knownSuccessfulCallCostUsd` separately from the maximum possible total that includes a transport-uncertain or failed paid call. Never call an uncertain attempt free merely because no usable result arrived.
5. Give a fresh isolated adjudicator only the allowed dispute packet and frozen evidence. Validate every resolution.
6. Assemble the resolved final ledger. Freeze the score-pass manifest and run the repository calculator exactly once.
7. Preserve the calculator input, output, logs, hashes, and one-pass attestation. Never edit or rerun calculated scores.

On a transport or schema failure, preserve the artifact and diagnose it before using any recovery allowed by the active repository controls. Use the smallest fresh isolated field-disjoint recovery shard, one attempt per shard. A publication repair may modify only the explicitly listed unavailable fields and must pass the full contract again.

Preserve the exact rejected file and validator output before authorizing a worker to revise the same path. Prefer a new repair output followed by a validated atomic replacement; do not rely on an after-the-fact description of overwritten bytes.

## 5. Publication reconstruction

Use a fresh isolated publication context that sees only the locked source, resolved judgments, calculated scores, and current display contract. It may not change identity, inventory, adjudication, or scores.

Append one debate object to `src/data/debates.js` that follows the current repository schema. Normally include:

- Four to seven coherent topical sections with semantic IDs, allowing one-sided unpaired moves rather than empty placeholder cards.
- Exact timestamps and quote-eligible source strings.
- Current critique word counts and evidence requirements.
- Conservative, context-supported fallacy and cognitive-bias labels produced only after scoring through a move-complete review.
- At least three concrete overall strengths and two material overall blunders per side, all score-consistent and grounded in the locked record.
- The current AI Contribution structure and styling.
- A valid topic category and unique speaker-free label.
- A separate human-readable position label and frozen person identity for each side: `sides.<side>.name` is the position, while `sides.<side>.speaker` is the interlocutor. Validate both and reject records where the two fields are identical.
- For a primary-speaker exception, a reader-facing source note that names the excluded host participation and states that neither side was scored on the excluded intervention or its directly dependent replies.

Update `src/data/interlocutors.js` for genuinely new speakers without creating an avatar. Preserve fallback behavior and make later avatar integration straightforward.

When a new interlocutor profile is first created, also add a short, neutral, source-backed biography in `src/data/interlocutor-bios.js`, following `docs/interlocutor-biographies.md`. Verify the identity against a public biographical source, record the actual review date, and link the source. Do not infer credentials or beliefs from a portrait or debate-side label. Keep biography research out of judgment packets and score calculations. Generation and site validation must pass the biography-coverage check; verify the bio left of the graph on desktop and above it on mobile, including a standalone bio for team-only profiles.

Create a production ledger under `docs/assessment-ledgers/<id>.json` and authenticate it against the standalone manifest, candidate inventory, final ledger, score output, and source hashes. Reuse the repository's generic standalone adapter. If no adapter exists, add the smallest reusable standalone adapter and validator route; never counterfeit a historical batch or calibration source.

Keep one to three exchange rows per section in ordinary cases. A general fourth-row rule may be used when exactly one side has four distinct locked cards and the other side has fewer, or when both sides have four distinct, independently scored, non-mergeable locked cards in one semantically coherent standalone section. Freeze either exception before judgment. For a balanced fourth row, require the inventory and final ledger to prove four unique moves per side and complete one-to-one publication mapping. Preserve the evidence-led rationale; never hard-code the debate number or section ID into the shared validator. Review the focused shared-validator diff and reject any newly added conditional keyed to a debate number or section ID.

Before accepting publication prose, compare it with recent published cards for specificity. Every visible argument description must state the locked claim and, when the source provides them, its supporting reason or comparison and the inference, consequence, or burden it is meant to establish. Aim for 22–28 words without padding or invented premises. Require the debate-wide argument-description mean to be at least `max(20, independent reference median mean - 1)` and require no more than 25% of cards below 20 words; an item may remain shorter only with a source-specific explanation. Every critique must discuss the locked move's actual inference, evidence, limitation, and remaining burden. Passing word, character, label, and sentence-count checks is necessary but does not excuse thin summaries or repeated generic templates.

Preserve ordinary punctuation when prose moves between model output, repair shards, the publication artifact, and `src/data/debates.js`. Before freezing production, audit the complete AI Contribution for every published debate and compare each entry's punctuation profile with the independent corpus. A severe low-punctuation outlier is a review trigger, not automatic proof: inspect its lists, introductory clauses, independent clauses, and qualifying phrases directly. If punctuation was stripped, preserve the rejected publication bytes, repair only the affected AI Contribution leaf strings in two-field shards, and verify that word tokens, structure, judgments, critiques, tags, and scores are unchanged. Never add commas merely to satisfy a count.

Use one explicit section-level disclosure to identify the AI Contribution. Within that disclosed section, make every thesis, conclusion, premise, and reinforcing argument read as direct philosophical prose. Do not make a field announce its own provenance or creative operation with phrases such as `AI-generated extension`, `AI-developed extension`, `AI reconstruction`, `possible extension`, or `one possible extension`. Avoid turning those phrases into a new template such as `a [named] model would`, `under a [named] constraint`, or `on a [named] account` across multiple cards. A substantive term such as *model*, *constraint*, or *account* remains legitimate when the reasoning needs it; the problem is repeated framing that could be exchanged among cards without changing their meaning.

Before freezing the AI Contribution, read both sides together and perform a nonformulaic-prose audit:

- Compare the opening 8–12 words, first-sentence grammar, paragraph progression, and conclusion form across all theses, conclusions, and reinforcing arguments. Repeated openings or mirrored sentence architecture are review triggers.
- Require every reinforcing argument to introduce a distinct inferential contribution and to begin with its actual claim, reason, contrast, thought experiment, or consequence. Reject generic setup language that merely says an argument could be developed.
- Check whether side labels, argument titles, or key nouns could be swapped while leaving the prose substantially usable. If so, replace the interchangeable scaffold with source- and objection-specific reasoning.
- Compare the complete section with the independent recent-production window for recycled six-word sequences and recurring rhetorical frames. Passing an exact-overlap threshold does not excuse obvious paraphrased boilerplate.
- Preserve logical parallelism when it clarifies a genuine conditional or premise structure. Do not manufacture surface variety, ornate vocabulary, or asymmetry merely to evade repetition checks.

Record this review in the publication audit. If formulaic prose is found after candidate bytes have been frozen, preserve those bytes and repair only the declared reader-facing AI Contribution leaves in shards of at most two fields, without changing argumentative substance, structure, evidence, judgments, critiques, tags, or scores.

After scores and critiques are frozen, run two fresh isolated blind reviews of every selected move against the local LogFall fallacy definitions and CogBias cognitive-bias definitions. Hide all existing production tags and the other review from each pass. Give a fresh adjudicator the anonymous union of every candidate from both passes, including one-reviewer candidates, and require an explicit decision for each. A tag must name a material defect actually present in the complete source and already reflected in the critique; it is descriptive metadata, never a new numerical penalty. Do not treat weak support, an unfinished mechanism, an incomplete analogy, or failure to exclude alternatives as automatically constituting argument from ignorance, begging the question, equivocation, or another nearby label. A contested premise is not automatically begging the question, a weak analogy is not automatically equivocation, and citation alone is not appeal to authority. Do not assign two labels to one defect unless the exact catalog definitions identify two distinct failures. Compare the result with the independent 25-debate window to detect inconsistent leniency, but do not target its tag rate: a fully reviewed debate may legitimately contain no tags.

Construct the rhetorical-review packet and both blind-pass `reviewedMoveIds` in final publication order: section order, exchange order, then `pro` followed by `con` when present. Do not use inventory chronology when it differs. Validate every accepted tag context against the production contract's current 8–35-word range before replacing publication bytes; the context must identify the source-specific conduct that instantiates the catalog definition, not merely repeat the label.

After each blind pass, make its authenticated review table represent the complete set of serious candidates that pass considered, including accepted candidates, while preserving each candidate's actual accepted or rejected decision; keep `acceptedTags` as the publication-ready accepted subset. Build the anonymous adjudication union from those complete review tables. Derive the adjudication prompt count and JSON-schema `minItems`/`maxItems` from the actual deduplicated union length, never from the move count or another hard-coded estimate, and assert that the adjudicator returns every union key exactly once in packet order. If a packet-order or candidate-cap defect is found after model execution, quarantine those outputs as invalid, correct the deterministic controller, and rerun the affected fresh isolated contexts before any tag is published.

Save a rhetorical-tag audit that lists every reviewed move ID, the baseline counts, both blind outputs, their complete candidate union, every accepted tag with its exact local reference URL and source-specific context, and a reasoned adjudication for every rejected candidate. Preserve an execution record with the model, reasoning setting, isolation method, authenticated inputs and outputs, attempts, retries, and direct cost. The audit and production tags must match exactly. If the review corrects an already published candidate, preserve its exact prior bytes or immutable Git object, shard the correction into no more than two writable fields per shard, and authenticate the before/after output plus audit without changing judgments, critiques, inventory, calculated scores, or winner. Write separate audit-compatible correction records for publication-depth repair and rhetorical-tag application; point each registry field to the corresponding record, and require the depth repair's authenticated `after` bytes to equal the rhetorical correction's authenticated `preservedPriorOutput` bytes.

Run the repository's standalone content-parity audit against 25 earlier non-target production debates. Measure both total structure and reader-facing item depth: summary and motion words, sections, display rows, mapped moves, per-card and mean argument lengths, critique lengths, quotation and context lengths, Overall Commentary item lengths, AI Extension thesis/premise/conclusion/new-argument lengths, and repeated normalized six-word phrasing. Keep the formal publication limits as hard gates and separately enforce the argument-description mean and short-card-share gates above. Use the recent range as a drift detector, not as a pass condition or permission to alter assessment substance: preserve a concise frozen question or a source-required move count with an explicit rationale, but repair underlength exposition or templated prose before freezing the adapter.

For critique repetition, reject a debate when six-word sequences appearing in at least one quarter of its critiques cover more than 15% of critique words on average or more than 25% in any critique. This margin sits above the observed recent-production range while detecting partial boilerplate that exact-component uniqueness misses. Preserve the rejected output before rewriting it, and keep every repair shard within the authorized two-field limit.

Before freezing the production adapter, temporarily integrate the candidate and run the current production debate validator as well as the standalone candidate validator. Resolve every reader-facing production rule—including scoring-note disclosure, quote-context length, AI Extension premise and conclusion depth, and reinforcing-argument length—while changes remain confined to score-neutral publication fields.

## 6. Historical-audit compatibility

Frozen campaign manifests, reports, hashes, scores, totals, and the five promoted calibration records are immutable. A standalone debate is neither a campaign item nor a calibration promotion.

When the first standalone addition exposes a living audit assumption that every ledger beyond the campaign set must be one of the five calibrations:

1. Preserve the frozen historical artifacts exactly.
2. Keep the original campaign total and five calibration identities exact.
3. Register new ledgers only in the standalone registry.
4. Change only the living audit code or derived documentation so it partitions campaign, calibration, and standalone ledgers explicitly.
5. Add deterministic standalone-manifest validation to the normal zero-cost validation path.
6. Do not weaken checks, edit old evidence, relabel the debate as Batch 18, or alter historical totals.

## 7. Generated pages and rendering

Run the repository's current SEO generator and check mode. Confirm the new debate appears on the homepage, dedicated debate route, search, topic page, rankings where applicable, sitemap, and both interlocutor profiles.

Use the `playwright` skill to inspect at least 1440×1000 and 390×844. Preserve hashed screenshots of collapsed and opened states as required. Check:

- No clipping, horizontal overflow, overlap, empty argument cards, console errors, or failed resources.
- Correct metadata, source link, side labels, timestamps, scores, byline, and AI Contribution appearance.
- Accordion and popover behavior with pointer, Enter, and Space where applicable.
- On the mobile viewport, open one critique and immediately activate a distant control. Fail the page if the visible critique layer intercepts the next tap. After a stylesheet or JavaScript repair, bump the generator's asset-version string and regenerate every dependent page before the final replay.
- New-speaker fallback portraits and links.

Freeze rendering evidence before any compatibility classification. Close browser sessions and servers and remove temporary controller files afterward.

## 8. Validation, commit, and report

Run, at minimum, the current equivalents of:

```bash
node scripts/validate-debates.mjs
node scripts/validate-corpus-transcripts.mjs
npm run seo
node scripts/generate-seo-pages.mjs --check
npm run check
npm run site:preflight
```

If the corpus replay reports a stale count, update only the living transcript-corpus inventory with the new source path, retrieval metadata, word/event counts, and exact hashes. Do not modify frozen scoring, calibration, or campaign evidence to silence the check.

Also run the new debate's evidence audit, standalone registry audit, relevant historical campaign and closure audits, `git diff --check`, and a focused final-diff review. Exact deterministic repair of stale derived SEO, indexes, summaries, sitemaps, tests, or living audit classifications is allowed only when it does not change frozen evidence or assessment substance.

`node scripts/validate-debates.mjs` includes the corpus-wide AI Contribution punctuation-drift gate. Treat any reported outlier as requiring direct prose review before publication.

For the generic standalone route, use the registry-driven commands rather than debate-specific scripts:

```bash
node scripts/audit-assessment-production-standalone-v1.mjs --audit --debate NNN --repository-only
node scripts/audit-assessment-production-standalone-v1.mjs --audit --repository-only
npm run assessment:standalone:content-parity:check
npm run assessment:standalone:rhetorical-tags:check
```

The first command authenticates the new debate. The second replays every registry record marked `published-and-frozen`; run it again from a clean checkout before push.

Before commit, compare the candidate with an independent 25-debate production window. Check motion-question consistency, per-card and mean argument depth, summary and other card lengths, section-row density, side-card imbalance, semantic section IDs, critique boilerplate, Overall Commentary depth, AI Extension depth, and AI Contribution nonformulaic prose across both sides. Correct accidental drift; retain evidence-led outliers only with an explicit metric-level audit rationale. Do not accept a thin or templated record merely because its means and overlap counts lie inside the reference range. When multiple standalone additions are being audited, exclude all of those targets from the benchmark.

Treat these as named machine gates rather than editorial reminders: authorization/inventory/publication/production motion equality byte-for-byte; publication speaker identity and distinct position labels; unique lowercase semantic section IDs; at least two material overall blunders per side; a valid `selectionBalanceAudit`; an authenticated judgment-execution record; a single score-input/output/attestation hash chain; AI Contribution punctuation integrity and nonformulaic-prose review; and the generic asymmetric-or-balanced fourth-row rule above.

Commit the complete validated result on its topic branch. Run `npm run site:preflight` again immediately before the commit, fetch before pushing, never force-push, and push only the topic branch. Open a pull request into `main`, wait for the required `accessibility-and-performance` check, and merge only when it passes. Fetch afterward and verify that `origin/main` contains the merged commit. Require a clean workspace, report direct cost, any primary-speaker exception with its excluded-duration share, and all validation outcomes, and stop without starting another debate.

When this installed skill or runbook is edited during an active task, run the skill validator and then reread the complete `SKILL.md` and every changed reference in the same task before resuming. Treat that reread as the refresh boundary; do not require the user to start a new thread.
