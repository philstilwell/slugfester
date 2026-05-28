# Slugfester

Slugfester is a static site for turning YouTube debate transcripts into compact argument scorecards. Each debate page presents both sides in parallel columns, marks critique popovers with `◉`, scores the strength of claims and rebuttals, and links relevant logical fallacies and cognitive biases to LogFall and CogBias.

## Run locally

```bash
npm run dev
```

Then open `http://localhost:4173`.

## Check syntax

```bash
npm run check
```

## Add debates

Debate pages are driven by `src/data/debates.js`. Add a new object to the `debates` array with:

- `id`, `title`, `motion`, `youtubeUrl`, and side metadata
- `sections`, each with aligned transcript excerpts for both sides
- `overall`, with closing scores, strengths, and logical blunders

The included debate is synthetic demonstration content so the UI has realistic material without copying a YouTube transcript. Replace it with licensed or user-provided transcript excerpts when adding real debates.
