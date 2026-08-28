# Slugfester

Slugfester is a static site for turning YouTube debate transcripts into compact argument scorecards. Each debate page presents both sides in parallel columns, marks critique popovers with `◉`, scores the strength of claims and rebuttals, and routes logical fallacy and cognitive bias pills to local reference pages with contextual explanations and in-depth LogFall/CogBias links. The `/search/` page filters scorecards by text and interlocutor portrait, while `/backend/` explains the assessment process behind the scores.

## Run locally

```bash
npm run dev
```

Then open `http://localhost:4174`.

## Check syntax

```bash
npm run check
```

The reassessment campaign is complete through Batch 17. The normal check now finishes with a repository-only replay of the frozen campaign-closure audit. A fresh checkout can run that replay directly:

```bash
npm run assessment:campaign:closure:repository:check
```

The stricter local replay also rehashes the ignored transcript, compact-ledger, and paid-audio transcript files when they are present:

```bash
npm run assessment:campaign:closure:check
```

See the [post-campaign operator guide](docs/assessment-production/post-campaign-handoff-v1/operator-guide.md) for the immutable-evidence boundary, validation details, historical limitations, and safe maintenance procedure. The frozen continuation pool is exhausted; do not create or select Batch 18.

## Regenerate SEO pages

```bash
npm run seo
```

This writes the lightweight browser summary module, static `index.html` files for clean debate and reference URLs, plus `sitemap.xml`, `robots.txt`, and `404.html`. Run it after adding, removing, renumbering, or renaming debates.

## Add debates

Debate pages are driven by `src/data/debates.js`. Follow the full critique standard in [`docs/debate-critique-process.md`](docs/debate-critique-process.md) and the locked YouTube assessment template in [`docs/youtube-debate-assessment-template.md`](docs/youtube-debate-assessment-template.md), then add a new object to the `debates` array with:

- `id`, `title`, `motion`, `youtubeUrl`, and side metadata
- `sections`, each with aligned transcript excerpts for both sides
- `overall`, with closing scores, strengths, and logical blunders

Run `npm run seo` and then `npm run check` before committing. The checks cover JavaScript syntax, generated SEO page freshness, measurable debate-assessment rules, and the locked debate-page design, including critique length, score ranges, required quote fields, local reference definitions, LogFall/CogBias link domains, title sizing, glove placement, and argument-card spacing.
