# YouTube Debate Assessment Template

This is the canonical Slugfester template for future YouTube debate assessments. Keep this structure unless the site design is intentionally changed.

## Locked Debate Page Design

The debate page should keep this order and visual hierarchy:

1. Sticky site header with a small boxing-gloves mark, `Slugfester` wordmark, `Debates` link, and an `External Sites` capsule grouping the LogFall and CogBias links.
2. Debate hero with three columns on desktop:
   - Left: back link, `Debate NN · label · Last rendered: YYYY-MM-DD`, smaller title, motion, and source note.
   - Middle: `assets/debate-gloves.png` in `.debate-gloves-panel`.
   - Right: score summary card with average section score, side scores, and `Open YouTube source`.
3. Representative quote panel, with one quote-forward card per side.
4. AI-generated scoring note.
5. `◉ Deeper critiques` interaction guide.
6. Sticky side headings for the two debate columns.
7. Topic sections with paired argument/rebuttal cards.
8. Overall commentary with each side's strengths and logical blunders.

Landing-page design:

- The main landing hero image is the illustrated two-men debate crest at `assets/slugfester-logo.jpg`.
- The small image in the top bar is the boxing-gloves image at `assets/debate-gloves.png`.
- The LogFall and CogBias header links are grouped under the visible `External Sites` label.
- The LogFall and CogBias header links show short explanatory popovers on hover and keyboard focus.
- The header includes a `Search` link to `/search/`.
- The header includes an `Assessment` link to `/assessment/`, whose page title is `The Codex Assessment Process`.
- The landing intro includes a divider line followed by a ` | `-delineated list of unique current debate topics.
- The debate list is capped at three columns on wide screens, then steps down responsively.
- Landing-page debate card titles link directly to the debate assessment.
- Debate `label` values must be unique so landing cards, topic lists, and reference occurrence cards are unambiguous.
- Debate `number` values must be unique, sequential in debate-list order, and two-digit zero-padded, starting with `01`.
- Debate numbers should appear anywhere the site identifies a debate for tracking: landing cards, debate hero metadata, topic lists, and reference occurrence cards.
- Internal debate and reference links use clean path URLs, while old hash routes remain as backwards-compatible fallbacks.
- Fallacy and bias links inside debate argument sections must include a `#` occurrence anchor so readers land on the exact debate/interlocutor context card on the reference page.
- `/search/` lets users filter debates by text and interlocutor portraits.
- The search results eyebrow reads `Matches: ...` and names the active text query and selected interlocutors, falling back to `Matches: all debates`.
- Search-result debate titles link directly to their debate assessments.

Design constraints:

- Do not put the glove image below the `Open YouTube source` button.
- Keep the debate title smaller than the landing page title.
- Keep argument cards content-sized; do not restore a fixed card height that leaves extra whitespace below the `◉` row.
- Keep critique access marked with `◉`.
- Keep the top scorecard compact; it is a summary, not a second hero.

## Assessment Workflow

1. Capture the transcript from YouTube or a transcript tool and note the source in `sourceNote`.
2. Identify the motion or central question.
3. Identify the two sides and speaker names.
4. Extract short representative quotes for each side.
5. Segment the debate into 4-7 topical sections.
6. For each section, align 1-3 exchanges by topic rather than by every interruption.
7. Write each `argument.words` as actual words or a tight transcript-grounded condensation.
8. Score each move using the rubric in `debate-critique-process.md`.
9. Write each critique at 105-130 words.
10. Add fallacy or bias tags only when they explain a real weakness, and include a context note for each tag.
11. Write the overall strengths and logical blunders.
12. Run `npm run seo`.
13. Run `npm run check`.

## Debate Data Skeleton

Use this shape when adding an object to `src/data/debates.js`.

```js
{
  id: "speaker-a-speaker-b-topic-year",
  number: "01",
  title: "Speaker A vs Speaker B: Debate Title",
  label: "Topic label",
  date: "YYYY-MM-DD",
  duration: "0 hr 00 min",
  youtubeUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
  motion: "State the central question the debate is assessing.",
  summary: "One concise sentence describing each side's main posture.",
  sourceNote:
    "Built from [transcript source]. Analytical summaries are condensed; direct quotes are kept short.",
  scoringNote:
    "Scores are AI-generated estimates based on conventional notions of logical coherence, relevance to the motion, evidential support, rebuttal quality, and absence of logical fallacies or cognitive-bias-driven overreach.",
  quotes: {
    pro: {
      text: "Short representative quote",
      context: "Explain why this quote captures the side's central posture."
    },
    con: {
      text: "Short representative quote",
      context: "Explain why this quote captures the side's central posture."
    }
  },
  sides: {
    pro: {
      name: "Side label",
      speaker: "Speaker A",
      color: "teal"
    },
    con: {
      name: "Side label",
      speaker: "Speaker B",
      color: "coral"
    }
  },
  score: {
    pro: 0,
    con: 0
  },
  sections: [
    {
      title: "Topical section",
      timebox: "00:00-00:00",
      score: {
        pro: 0,
        con: 0
      },
      exchanges: [
        {
          pro: {
            time: "00:00",
            role: "Argument role",
            words: "Transcript-grounded claim or rebuttal.",
            score: 0,
            critique:
              "About 120 words following the critique pattern: strength, weakness, and score justification.",
            tags: [
              {
                label: "Fallacy or bias name",
                type: "fallacy",
                url: fallacy("slug"),
                context: "Explain why this label applies to this specific argument."
              }
            ]
          },
          con: {
            time: "00:00",
            role: "Argument role",
            words: "Transcript-grounded claim or rebuttal.",
            score: 0,
            critique:
              "About 120 words following the critique pattern: strength, weakness, and score justification.",
            tags: []
          }
        }
      ]
    }
  ],
  overall: {
    pro: {
      score: 0,
      strengths: ["Specific strength.", "Specific strength."],
      blunders: [
        {
          text: "Specific logical blunder.",
          links: [
            {
              label: "Fallacy or bias name",
              url: fallacy("slug")
            }
          ]
        }
      ]
    },
    con: {
      score: 0,
      strengths: ["Specific strength.", "Specific strength."],
      blunders: [
        {
          text: "Specific logical blunder.",
          links: [
            {
              label: "Fallacy or bias name",
              url: bias("slug")
            }
          ]
        }
      ]
    }
  }
}
```

## Final Acceptance Checklist

- Page follows the locked debate-page design above.
- Debate numbers are two-digit, zero-padded, sequential, and displayed consistently site-wide.
- `date` is the Slugfester last-rendered scoring date, not the YouTube upload date.
- The sticky header uses the small boxing-gloves image.
- The top reference links are grouped as an `External Sites` cluster.
- The top reference links explain LogFall and CogBias with hover/focus popovers.
- The landing intro shows the current debate topics below a divider line.
- The landing hero uses the illustrated two-men debate crest.
- On debate pages, the larger glove image appears in the debate hero middle column.
- The representative quote cards are near the top.
- The `◉` guide appears before the two-column debate sections.
- Every critique is 105-130 words.
- Every score is justified by the critique text.
- `sourceNote` and `scoringNote` are present.
- `scoringNote` explicitly says the scores are AI-generated.
- The scoring-note band states that assessments were made by `GPT 5.5 Extra High`.
- LogFall links are used only for fallacies.
- CogBias links are used only for cognitive biases.
- Fallacy and bias pills show hover/focus popovers with basic definitions, contextual explanation, and the note `Click button for more info.`
- Fallacy and bias pills also open local reference pages with basic definitions, contextual explanation, and external in-depth links.
- Reference pages include `Back to debates | Back to this debate` navigation when opened from a debate page.
- Reference occurrence cards link back to the debate scorecard where the fallacy or bias appeared.
- Static SEO pages, `sitemap.xml`, `robots.txt`, and `404.html` are regenerated with `npm run seo`.
- `npm run check` passes before commit.
