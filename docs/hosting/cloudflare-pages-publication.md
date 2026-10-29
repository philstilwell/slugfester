# Publishing Slugfester through Cloudflare Pages

Since 29 October 2026, the production website is hosted by **Cloudflare Pages**, not GitHub Pages. GitHub remains the source repository and review system. These are controller/release instructions, not inputs for assessing a debate.

## Current deployment contract

- Repository: `philstilwell/slugfester`; production branch: `main`.
- Cloudflare account: `35f54f15edb91fa1d38da7b8eb7583f5`; Pages project: `slugfester`.
- Canonical public origin: `https://slugfester.com`. `https://www.slugfester.com` redirects there, preserving the path and query string.
- Preview origin: `https://slugfester.pages.dev`; branch previews are not proof of production publication. Keep preview origins out of search indexes.
- Git integration automatically builds merged `main` changes. Build command: `node --test tests/build-cloudflare-pages.test.mjs && node scripts/build-cloudflare-pages.mjs`. Output directory: `dist/cloudflare`. Build environment: `NODE_VERSION=22`, `SKIP_DEPENDENCY_INSTALL=1`.
- The build copies public pages, source data, assets, and explicitly linked research/PDF downloads. It does not upload the entire repository or internal assessment folders. It checks the free-plan limits of 20,000 files and 25 MiB per file; do not weaken those checks to get a deployment through.
- The build generates `/_slugfester-deployment.json`, containing `site`, `host`, `sourceCommit`, and `publicFiles`. Do not commit or hand-edit a marker at the repository root; its commit identity must come from Cloudflare's build environment. Do not hard-code a catalogue or file count in release checks.

## Before committing a public change

Retain the assessment, source-integrity, biography, generated-page, browser, and protected-branch checks required by the active workflow. In addition, run:

```sh
node --test tests/build-cloudflare-pages.test.mjs
node scripts/build-cloudflare-pages.mjs
```

Check that the generated debate route, changed public data, and any new images or public downloads are included in `dist/cloudflare`. If a new public path is outside the builder's supported paths, repair the builder and its tests through the normal reviewed branch; do not publish the repository root as a shortcut. Keep generated `dist/` output uncommitted and preserve all required assessment evidence in Git separately.

## Production release gate

1. Push only the topic branch. Require the current pull-request head's `accessibility-and-performance` check to pass before merging. Preserve branch protection and other active review requirements.
2. Fetch after the merge and identify the actual merged publication commit on `origin/main`; do not assume a particular merge strategy or use a pull-request test-merge revision.
3. For that production commit, wait for both post-merge Site Quality (`accessibility-and-performance`) and the native **Cloudflare Pages** check to finish successfully. Retain the checked commit, check/run identities, and Cloudflare deployment link for project `slugfester`. A green pull-request preview alone is insufficient. The legacy GitHub Pages workflow or its expired origin certificate is not the production deployment gate.
4. Request the public deployment marker over normally verified HTTPS, with caching bypassed. Require `site` to be `slugfester.com`, `host` to be `cloudflare-pages`, and `sourceCommit` to identify the authenticated production revision. A successful check without the expected live marker is not enough.
5. Verify the canonical debate page and its data against that committed publication, including the initial HTML without JavaScript and the interactive rendering required by the assessment runbook. Check the affected homepage/search/topic/ranking/profile links, sitemap, images and biography coverage, and Backend graph totals where applicable. For avatar-only work, verify the published image and its actual use on affected live pages. Keep the existing desktop/mobile and accessibility gates.

For read-only inspection, set `slugfester_publish_sha` to the actual full production commit SHA, then use:

```sh
gh api "repos/philstilwell/slugfester/commits/$slugfester_publish_sha/check-runs?per_page=100" \
  --jq '.check_runs[] | select(.name == "accessibility-and-performance" or .name == "Cloudflare Pages") | {id,name,status,conclusion,details_url}'
curl --fail --show-error --silent -H 'Cache-Control: no-cache' \
  https://slugfester.com/_slugfester-deployment.json
```

If another addition has already deployed a newer `main` revision, authenticate that the live revision descends from the merged publication commit and that the target debate/changed assets remain correct in that newer revision. Record both revisions and perform the same live checks; do not roll back other work merely to make a SHA match. A changed shared data file is not itself proof that the target debate changed: compare its actual committed record and rendered contents.

Allow ordinary deployment and DNS/cache propagation, using spaced, bounded status checks. On failure or a marker mismatch, inspect the specific Cloudflare build/deployment and preserve valid completed assessment work. Resume only the authorized publication/deployment repair; never rerun judgment, scoring, or paid work to fix hosting. If verification remains pending or access is unavailable, report publication as unverified rather than declaring completion.

## Configuration and permission boundaries

Routine debate, reassessment, and avatar releases do **not** require DNS changes, certificate resets, new Cloudflare projects, API tokens, paid services, or changes to email records. Do not edit the repository's `CNAME`, reconfigure GitHub Pages, delete the retained GitHub site, weaken HTTPS verification, or bypass branch protection as a publication step. If exceptional configuration work is needed, inspect it separately and obtain any new authority required by the task.

The `www` redirect is a Cloudflare **zone Redirect Rule**, recorded in `config/cloudflare/domain-redirect.json`. Pages `_redirects` supports path rules, not hostname-level redirects. Leave this rule and `config/cloudflare/_headers` intact during ordinary additions. Retain the default noindex protection on Pages preview hosts without applying it to `slugfester.com`.

The former GitHub Pages origin certificate can remain expired without affecting the Cloudflare-hosted site. It must be repaired before any future DNS rollback to GitHub Pages. The temporary certificate-recovery monitor stopped after verified recovery; do not re-enable it for routine publication checks.

Report the actual published revision, successful Site Quality and Cloudflare deployment evidence, live-check result, cost, and any remaining limitation. Close owned temporary browsers/servers and remove disposable build/replay files while preserving the required evidence.
