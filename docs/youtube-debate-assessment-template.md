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
9. A default-collapsed `AI Extension` after Overall Commentary, visibly identified as the assessment model's contribution rather than transcript content.

Landing-page design:

- The main landing hero image is the illustrated two-men debate crest at `assets/slugfester-logo.jpg`.
- The small image in the top bar is the boxing-gloves image at `assets/debate-gloves.png`.
- The LogFall and CogBias header links are grouped under the visible `External Sites` label.
- The LogFall and CogBias header links show short explanatory popovers on hover and keyboard focus.
- The header includes a `Search` link to `/search/`.
- The header includes a `Topics` link to `/topics/`, which groups debates by recurring topic.
- The header includes a `Rankings` link to `/rankings/`, whose page title is `Rankings & Flags`. It ranks interlocutors with at least three debate appearances by their average overall score; a multi-person side assigns its published side score to each listed participant. Each ranking row labels the speaker's average as `First name's avg.` and separately labels `Opponents' Avg.`; the speaker's most common topic and a subtle sample-confidence marker appear beneath their debate count. The `Overall score leaderboard` heading comes before its topic, minimum-appearance, and sort controls. Readers can filter by topic, set a higher appearance threshold, re-rank by `Opponents' Avg.`, and change sorting.
- The Rankings page also includes a compact, color-coded fixed topic distribution of named logical-fallacy and cognitive-bias tags, normalized per 100 scored moves. Its corpus overview summarizes all topic clusters, and distinctive row boundaries preserve scannability in the tightened layout. Each qualifying interlocutor row also shows compact coral fallacy and teal bias bars for that person's own tagged moves, normalized per 100 scored moves and recalculated from the currently filtered scorecards.
- On the Rankings page, place the Flags distribution at the very bottom, after the leaderboard controls, ranked interlocutors, and methodology note.
- The Rankings page includes a two-person head-to-head selector. Its score, opponents' average, fallacy-rate, and bias-rate comparisons follow the active topic filter and use all available appearances within that topic.
- Each ranking row opens a static `/interlocutor/<speaker>/` profile page. Profiles show sample confidence, averages, score-band distribution rather than an implied chronology, topic performance, opponents faced, and linked source scorecards.
- The header includes a `Backend` link to `/backend/`, whose page title is `Backend`; `/assessment/` remains a backwards-compatible legacy route.
- The Backend page's Limits section states that assessments use the transcript and Slugfester's published rubric; account personalization and private conversation history are not inputs to the site's assessment data, and AI-assisted results remain open to reader scrutiny and revision.
- The landing intro includes a divider line followed by a ` | `-delineated, linked list of the current page's compact debate number and title labels.
- Landing Debate cards and Search result cards show linked interlocutor portraits; each portrait opens that speaker's `/interlocutor/<speaker>/` profile. The speaker portraits in detailed debate headers use the same profile links.
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
4. Choose the debate's concise, speaker-free `label` as a human-readable general title for its compact card and secondary topic chips.
5. Set `topicCategory` to the exact primary category ID from `topicCategoryDefinitions` in `src/data/topics.js`. Every published debate requires an explicit primary category. Existing editorial assignments are maintained in `src/data/topic-assignments.js`; see [the category guide](topic-categories.md) for boundaries and correction rules. If a debate exposes a genuine new recurring theme, deliberately update the taxonomy.
6. Extract short representative quotes for each side.
7. Segment the debate into 4-7 topical sections.
8. For each section, align 1-3 exchange rows by topic rather than by every interruption. Under v2.1, either side may be omitted from a row when no genuine counterpart exists; the renderer leaves the opposite cell empty.
9. Write each `argument.words` as actual words or a tight transcript-grounded condensation.
10. Record the exact model that performed the assessment. Historical scorecards retain their original attribution; never relabel old work.
11. For a new reassessment, follow [`assessment-workflow-v2.1.md`](assessment-workflow-v2.1.md): build a source manifest and blind packet, lock burdens, argument inventory, move importance, and section weights, then run two isolated scoring passes.
12. Save calibration ledgers under `docs/calibration/v2.1/ledgers/`. Publish to `docs/assessment-ledgers/` and set `assessmentRubric: "Slugfester Reassessment Rubric v2.1"` only after a complete reassessment is explicitly promoted.
13. Run the repository calculator without manual overrides and complete any threshold-triggered adjudications.
14. Write each critique at 105-130 words.
15. Review every selected move for fallacy or bias tags only after scoring; add a tag only when the complete source supports the local catalog definition and it explains a material weakness already represented in the dimensions. Save accepted and plausible rejected candidate decisions, prefer no tag to a forced tag, and never tag to match corpus frequency.
16. Write Overall Commentary from the locked section-weighted record.
17. Add the visibly AI-authored accordion and record a novelty map for its strengthened and new arguments.
18. Run `npm run seo` and `npm run check`.

Topic categorization:

- The fifteen categories, their exact IDs, and their editorial boundaries are documented in [the category guide](topic-categories.md). Category definitions are shared by the site and publication validation.
- `/topics/` uses the explicitly assigned published `topicCategory` to determine the primary group; label keywords never supply a primary category. It continues to use the debate `label` to derive up to three supplementary topic chips alongside it, for four chips total, so the label should contain the clearest recurring subject terms without adding interlocutor names.
- After adding a debate, check that the new compact card appears under the intended `/topics/` category, that its card title remains a general topic title rather than a speaker-vs-speaker title, and that hover/focus reveals the full summary and compact speaker names within the card.

## Debate Data Skeleton

Use this shape when adding an object to `src/data/debates.js`.

```js
{
  id: "speaker-a-speaker-b-topic-year",
  number: "131",
  assessmentModel: "MODEL ACTUALLY USED",
  assessmentRubric: "Slugfester Reassessment Rubric v2.1", // Only after a full v2.1 production promotion.
  title: "Speaker A vs Speaker B: Debate Title",
  label: "Concise topic label for the card title and supplementary chips",
  topicCategory: "science-design",
  date: "YYYY-MM-DD",
  duration: "0 hr 00 min",
  youtubeUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
  motion: "State the central question the debate is assessing.",
  summary: "One concise sentence describing each side's main posture.",
  sourceNote:
    "Built from [transcript source]. Analytical summaries are condensed; direct quotes are kept short.",
  scoringNote:
    "Scores are AI-generated estimates under Slugfester Reassessment Rubric v2.1. Move, section, and overall totals are reproduced from a versioned two-pass ledger with documented adjudication.",
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
            ledgerMoveId: "stable-pro-move-id", // Required for a v2.1 reassessment.
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
            ledgerMoveId: "stable-con-move-id", // Required for a v2.1 reassessment.
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
  },
  logicalExtension: {
    pro: {
      finalArgument: {
        thesis: "AI-authored steelman thesis.",
        premises: [
          "Four to six explicit, fully stated premises that answer the strongest live objections."
        ],
        conclusion: "A proportionate conclusion supported by the premises."
      },
      newArguments: [
        {
          title: "New reinforcing argument",
          text: "A genuinely new argument in 45-130 words, not a restatement of the transcript."
        }
      ]
    },
    con: {
      finalArgument: {
        thesis: "AI-authored steelman thesis.",
        premises: [
          "Four to six explicit, fully stated premises that answer the strongest live objections."
        ],
        conclusion: "A proportionate conclusion supported by the premises."
      },
      newArguments: [
        {
          title: "New reinforcing argument",
          text: "A genuinely new argument in 45-130 words, not a restatement of the transcript."
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
- A reassessment explicitly records its actual model, rubric version, and saved scoring ledger.
- Every published reassessment score matches the deterministic formula for its ledger version.
- The AI Extension is immediately after Overall Commentary, default-collapsed, keyboard-operable, and explicitly AI-authored.
- LogFall links are used only for fallacies.
- CogBias links are used only for cognitive biases.
- Fallacy and bias pills show hover/focus popovers with basic definitions, contextual explanation, and the note `Click button for more info.`
- Fallacy and bias pills also open local reference pages with basic definitions, contextual explanation, and external in-depth links.
- Reference pages include `Back to debates | Back to this debate` navigation when opened from a debate page.
- Reference occurrence cards link back to the debate scorecard where the fallacy or bias appeared.
- Static SEO pages, `sitemap.xml`, `robots.txt`, and `404.html` are regenerated with `npm run seo`.
- `npm run check` passes before commit.
