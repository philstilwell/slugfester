# Validation and release

Read when the candidate is ready for local integration. Use the same maintained browser replay locally and live.

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

Run the repository's current SEO generator and check mode. Before the first publication commit, run `npm run site:standalone:check`: it checks the newest integrated standalone debate and every applicable scope notice with JavaScript disabled before replaying the interactive page, all graph buckets, and linked routes. Also prepare the target-specific local replay through `standalone-workflow.mjs browser --debate NNN`. The JavaScript-disabled notice must be visible before every score-bearing summary; the interactive notice must precede the top scoreboard. Confirm the new debate appears on the homepage, dedicated debate route, search, topic page, rankings where applicable, sitemap, and both interlocutor profiles.

Also reconcile the Backend section-score distribution with the full published catalogue. Independently collect the finite published `section.score.pro` and `section.score.con` values, retaining repeated values; compare each debate's list with generated analytics, then compare the total, observed range, and every two-point bucket with the rendered graph. Explicitly verify the new debate's contribution. These are existing section scores, not overall results, individual-move scores, or a new calculator pass. Repair stale generation at its source; do not manually alter chart counts, rescore debates, or change assessment rules. An already matching graph needs no edit.

Use the `playwright` skill to inspect at least 1440×1000 and 390×844. Preserve hashed screenshots of collapsed and opened states as required. Check:

- No clipping, horizontal overflow, overlap, empty argument cards, console errors, or failed resources.
- Correct metadata, source link, side labels, timestamps, scores, byline, and AI Contribution appearance.
- Accordion and popover behavior with pointer, Enter, and Space where applicable.
- On the mobile viewport, open one critique and immediately activate a distant control. Fail the page if the visible critique layer intercepts the next tap. After a stylesheet or JavaScript repair, bump the generator's asset-version string and regenerate every dependent page before the final replay.
- New-speaker fallback portraits and links.

Freeze rendering evidence before any compatibility classification. Close browser sessions and servers and remove temporary controller files afterward.

## 8. Validation, commit, and report

During editing, run the focused checks affected by the change. Once final, complete every mandatory gate below. Do not repeat a successful broad check merely because time passed; rerun when its inputs or implementation changed, a failure requires it, or the explicit precommit/committed-package/deployment boundary requires a fresh run. The earlier and immediate-precommit website checks remain mandatory. Record command, input revision, result, elapsed time, and log once per execution.

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

The first command authenticates the new debate. The second replays every registry record marked `published-and-frozen`; run it again before push from a clean checkout or export of the actual committed files, without ignored caches or untracked evidence. If the audit requires Git history, provide the authentic repository history read-only; do not copy missing working files into the replay to make it pass.

Before commit, compare the candidate with an independent 25-debate production window. Check motion-question consistency, per-card and mean argument depth, summary and other card lengths, section-row density, side-card imbalance, semantic section IDs, critique boilerplate, Overall Commentary depth, AI Extension depth, and AI Contribution nonformulaic prose across both sides. Correct accidental drift; retain evidence-led outliers only with an explicit metric-level audit rationale. Do not accept a thin or templated record merely because its means and overlap counts lie inside the reference range. When multiple standalone additions are being audited, exclude all of those targets from the benchmark.

Treat these as named machine gates rather than editorial reminders: authorization/inventory/publication/production motion equality byte-for-byte; publication speaker identity and distinct position labels; unique lowercase semantic section IDs; at least two material overall blunders per side; a valid `selectionBalanceAudit`; an authenticated judgment-execution record; a single score-input/output/attestation hash chain; AI Contribution punctuation integrity and nonformulaic-prose review; and the generic asymmetric-or-balanced fourth-row rule above.

Before committing, reconcile the required durable-evidence paths and hashes from the manifests and audits against the exact staged files, including previously tracked evidence. A file present locally is not proof it will be committed. Use `git check-ignore` to diagnose omissions; explicitly stage a required ignored log only after reviewing that exact file for scope, credentials, and signed media URLs. Never broadly force-add ignored caches, media, or transcripts or weaken ignore rules. Recheck the staged evidence after adding the immediate precommit test record; replay the committed package before pushing. Verify the pushed branch's exact commit against GitHub even when the clone fetches only `main` by default.

Commit the complete validated result on its topic branch. Run `npm run site:preflight` again immediately before the commit, fetch before pushing, never force-push, and push only the topic branch. Open a pull request into `main`, wait for the required `accessibility-and-performance` check on the current head, and merge only when it passes. Fetch afterward and verify that `origin/main` contains the merged publication changes; verify the actual merge commit rather than assuming a particular merge strategy.

Wait for both post-merge Site Quality and GitHub Pages deployment to succeed for that commit, retaining their run identities and outcomes. Then verify the live canonical debate page, its assessment data, and sitemap against the committed publication, and check the live Backend distribution against the catalogue totals and buckets established above. Account for ordinary deployment/cache propagation without rerunning assessment work. If either workflow fails, diagnose and fix only the authorized publication or deployment problem through the protected-branch process; do not weaken tests, bypass required checks, or report publication complete while deployment remains unverified. Require a clean workspace, report direct cost, any primary-speaker exception with its excluded-duration share, and all validation outcomes, and stop without starting another debate.

When this installed skill or runbook is edited during an active task, run the skill validator and then reread the complete `SKILL.md` and every changed reference in the same task before resuming. Treat that reread as the refresh boundary; do not require the user to start a new thread.
