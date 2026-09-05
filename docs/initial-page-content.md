# Substantive initial page content

The page generator includes readable HTML before JavaScript runs. This is ordinary visible content for everyone, not crawler-only text or hidden search keywords. The interactive application replaces it after loading; no-JavaScript readers retain it. On matching initial routes, the summaries also remain visible during data loading and after a failed data request, with a retry message in the latter case. Internal navigation still shows the normal loading state rather than retaining the previous page's summary.

- Debate pages: question, source and scoring caveats, original video link, all published overall strengths and weaknesses, and every section's scores with one representative move and its critique per side. Excerpts are explicitly labeled; this is not the complete interactive scorecard.
- Profiles: sourced biography, eligible one-on-one average, summaries of linked records, and separately labeled excluded appearances.
- Landing page: 12 newest debate summaries and a link to the complete catalogue.
- Search and Topics: every published debate summary, with topic grouping on Topics. Browser Find works without JavaScript; the interactive search controls still need it.
- Rankings: complete eligible one-on-one averages table with sample counts and comparison caveats.
- Backend: a plain-language method and selection-limits summary.
- Insights and Data and Methods: their existing complete static content is preserved.

`scripts/lib/initial-page-content.mjs` uses published data at build time. It does not alter assessments or add content to the browser's JavaScript downloads. Run `npm run seo` after relevant edits. `scripts/validate-initial-content.mjs`, included in the public-site check, detects missing or stale content. Review representative pages with JavaScript disabled at desktop and phone widths before publishing layout changes.
