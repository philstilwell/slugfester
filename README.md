# Slugfester

Slugfester is a static site for turning YouTube debate transcripts into compact argument scorecards. Each debate page presents both sides in parallel columns, marks critique popovers with `◉`, scores the strength of claims and rebuttals, and links relevant logical fallacies and cognitive biases to LogFall and CogBias.

## Run locally

```bash
npm run dev
```

Then open `http://localhost:4174`.

## Check syntax

```bash
npm run check
```

## Add debates

Debate pages are driven by `src/data/debates.js`. Follow the full critique standard in [`docs/debate-critique-process.md`](docs/debate-critique-process.md), then add a new object to the `debates` array with:

- `id`, `title`, `motion`, `youtubeUrl`, and side metadata
- `sections`, each with aligned transcript excerpts for both sides
- `overall`, with closing scores, strengths, and logical blunders

Run `npm run check` before committing. It checks JavaScript syntax and validates the measurable debate-assessment rules, including critique length, score ranges, required quote fields, and LogFall/CogBias link domains.
