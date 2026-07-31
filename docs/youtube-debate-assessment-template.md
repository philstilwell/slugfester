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
8. Overall commentary with each side's `Landed` and `Whiffed` points.

Landing-page design:

- The main landing hero image is the illustrated two-men debate crest at `assets/slugfester-logo.jpg`.
- The small image in the top bar is the boxing-gloves image at `assets/debate-gloves.png`.
- The LogFall and CogBias header links are grouped under the visible `External Sites` label.
- The LogFall and CogBias header links show short explanatory popovers on hover and keyboard focus.
- The header includes a `Search` link to `/search/`.
- The header includes a `Topics` link to `/topics/`, which groups debates by recurring topic.
- The header includes a `Rankings` link to `/rankings/`, which ranks interlocutors with at least three debate appearances by their average overall score; a multi-person side assigns its published side score to each listed participant. Readers can filter by topic, set a higher appearance threshold, re-rank by the average published scores of opponents faced, change sorting, and expand a speaker's performance details.
- The header includes a `Backend` link to `/backend/`, whose page title is `Backend`; `/assessment/` remains a backwards-compatible legacy route.
- The landing intro includes a divider line followed by a ` | `-delineated, linked list of the current page's compact debate number and title labels.
- The debate list is capped at three columns on wide screens, then steps down responsively.
- Landing-page debate card titles link directly to the debate assessment.
- Debate `label` values must be unique so landing cards, topic lists, and reference occurrence cards are unambiguous.
- Debate `number` values must be unique, sequential in debate-list order, and at least two digits, zero-padded below 100, starting with `01`.
- Debate numbers should appear anywhere the site identifies a debate for tracking: landing cards, debate hero metadata, topic lists, and reference occurrence cards.
- Internal debate and reference links use clean path URLs, while old hash routes remain as backwards-compatible fallbacks.
- Fallacy and bias links inside debate argument sections must include a `#` occurrence anchor so readers land on the exact debate/interlocutor context card on the reference page.
- Section ranges and argument timestamps link to the YouTube source with a `t=...s` timestamp query generated from the visible time; `MM:SS`, long-minute `MMM:SS`, and `H:MM:SS` formats are supported.
- `/search/` lets users filter debates by text and interlocutor portraits.
- Search-page interlocutor portraits live inside a default-closed accordion clearly labeled `Interlocutor filters`.
- `/topics/` categorizes debates by recurring topic clusters and uses compact linked cards with general topic titles, topic chips, and interlocutor photos without visible interlocutor names by default; hovering or focusing a standard-height card reveals a full-card panel with the debate summary and compact speaker names.
- Landing topic snippets and landing debate cards share one paired 84-debate pagination state; search results paginate separately in batches of 84 debates.
- Search-page interlocutor portraits render in a scrollable panel inside the accordion.
- The search results eyebrow reads `Matches: ...` and names the active text query and selected interlocutors, falling back to `Matches: all debates`.
- Search-result debate titles link directly to their debate assessments.

Design constraints:

- Do not put the glove image below the `Open YouTube source` button.
- Keep the debate title smaller than the landing page title.
- Keep argument cards content-sized; do not restore a fixed card height that leaves extra whitespace below the `◉` row.
- Keep critique access marked with `◉`.
- Keep the top scorecard compact; it is a summary, not a second hero.

## Debate Assessment Workflow

1. Capture the transcript from YouTube or a transcript tool and note the source in `sourceNote`.
2. Identify the motion or central question.
3. Identify the two sides and speaker names.
4. Choose the debate's concise `label` as both a human-readable general title and the basis for `/topics/` categorization.
5. Assign the debate to the best recurring topic cluster by making sure the label maps cleanly to one of the topic category keyword sets in `topicCategoryDefinitions` in `src/app.js`; if the debate exposes a genuine new recurring theme, update that taxonomy rather than letting the debate fall into the fallback category.
6. Extract short representative quotes for each side.
7. Segment the debate into 4-7 topical sections.
8. For each section, align 1-3 exchanges by topic rather than by every interruption.
9. Write each `argument.words` as actual words or a tight transcript-grounded condensation.
10. Set `assessmentModel` to `5.6 Terra Extra High` for Debate `131` and every later debate. Debates `01` through `130` retain their original `GPT 5.5 Extra High` attribution.
11. Score each move using the rubric in `debate-critique-process.md`.
12. Write each critique at 105-130 words.
13. Add fallacy or bias tags only when they explain a real weakness, and include a context note for each tag.
14. Write the overall `Landed` and `Whiffed` points.
15. Run `npm run seo`.
16. Run `npm run check`.

Topic categorization:

- The current topic clusters are `Cosmological & Contingency Arguments`, `Science and design`, `Scripture, Jesus, and resurrection`, `Meaning and purpose`, `Morality and ethics`, `Evil, suffering, and hiddenness`, `Mind, consciousness, and free will`, `Logic, reason, and presuppositions`, `Religion, society, and public reason`, and `God, theism, and atheism`.
- `/topics/` uses the debate `label` to determine the primary group and topic chips, so the label should contain the clearest recurring subject terms without adding interlocutor names.
- After adding a debate, check that the new compact card appears under the intended `/topics/` category, that its card title remains a general topic title rather than a speaker-vs-speaker title, and that hover/focus reveals the full summary and compact speaker names within the card.

## Debate Data Skeleton

Use this shape when adding an object to `src/data/debates.js`.

```js
{
  id: "speaker-a-speaker-b-topic-year",
  number: "131",
  assessmentModel: "5.6 Terra Extra High",
  title: "Speaker A vs Speaker B: Debate Title",
  label: "Concise topic label that maps to the intended /topics/ category",
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
- Debate numbers are at least two digits, zero-padded below 100, sequential, and displayed consistently site-wide.
- The debate `label` has been checked against the `/topics/` taxonomy and places the compact card under the intended topic cluster.
- The `/topics/` card title stays topic-forward and does not include visible interlocutor names.
- The `/topics/` compact card uses the standard minimum height and reveals the full debate summary plus compact speaker names on hover or keyboard focus.
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
- The scoring-note band states the model actually used: `GPT 5.5 Extra High` through Debate `130`, or `5.6 Terra Extra High` from Debate `131` onward.
- New debate objects from `131` onward explicitly include `assessmentModel: "5.6 Terra Extra High"`.
- LogFall links are used only for fallacies.
- CogBias links are used only for cognitive biases.
- Fallacy and bias pills show hover/focus popovers with basic definitions, contextual explanation, and the note `Click button for more info.`
- Fallacy and bias pills also open local reference pages with basic definitions, contextual explanation, and external in-depth links.
- Reference pages include `Back to debates | Back to this debate` navigation when opened from a debate page.
- Reference occurrence cards link back to the debate scorecard where the fallacy or bias appeared.
- Static SEO pages, `sitemap.xml`, `robots.txt`, and `404.html` are regenerated with `npm run seo`.
- `npm run check` passes before commit.
