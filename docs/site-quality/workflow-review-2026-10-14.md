# Workflow usability review — 14 October 2026

Reviewed against main commit `0591ae4b` (308 published debates). An earlier reproduction used the older local debate-238 branch; the fixes are based on current main and preserve work on that branch. This review used the existing browser tool and local checks. GStack was not installed or executed because its scan findings remain unresolved.

## Fixed findings

1. A focused or hovered critique stayed open after Escape. Dismissal now hides the popover while leaving focus on the trigger. Enter, a new click, focus re-entry or mouse re-entry opens it again. Clicking outside dismisses it. Assessment text and scores are unchanged.
2. On `/search/` at 390 × 844 with root text enlarged to 200%, the search form extended to 407 pixels. Its grid columns now shrink within the available width; the page remains 390 pixels wide and the controls are usable.

## Verification

- Text search for `cosmology`, combined with Alex O'Connor: three results in the current 308-debate catalogue. Clear restored all 308 results.
- Mobile critique test on `/debate/craig-oconnor-god-debate-2026/`: Escape hid the 93/100 constructive critique, kept focus on the trigger, and Enter reopened it. Its bounds remained within the 390 × 844 viewport.
- Mobile search at normal and 200% text size; screenshots inspected.
- JavaScript syntax, generated-page consistency and public-site validators passed.
- Campaign closure check: 174 reassessments and 174 ledgers passed. Supplemental calibration check: five promoted debates passed. These historical records are a subset of the current catalogue. Repository-only checks verify tracked frozen hash claims without reading ignored local evidence bytes.
- Regenerated browser cache references are required by the site's content-version mechanism. Outside `src/app.js` and `src/styles.css`, generated changes were checked to be version references only. No assessment content was edited or rescored.

An initial local preview briefly reset six portrait-image connections while loading the filter list. Those images loaded on retry; the local preview server's connection queue was increased. This is separate from the two reproducible product defects above.

This is a focused browser review, not a full accessibility certification or a fresh evaluation of debate evidence. No paid judgments or external-model review ran.
