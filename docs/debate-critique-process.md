# Slugfester Debate Critique Process

Use this process for every debate assessment so each page feels like the same product: quote-forward, compact, logically serious, and explicit about the limits of AI scoring.

For the locked page design and fill-in data skeleton, use [`youtube-debate-assessment-template.md`](youtube-debate-assessment-template.md). That template is canonical for future YouTube debate assessments.

## Goal

Create a condensed debate scorecard, not a full transcript replacement. Each page should help a reader see what each side actually said, how strong the argument or rebuttal was, and where fallacies, bias, weak evidence, or burden-shifting affected the score.

## Required Inputs

- YouTube URL and debate title.
- Transcript source, noted in `sourceNote`.
- Last rendered date in `YYYY-MM-DD` format: the last date this project ran the critique and scores, not the YouTube upload date.
- Two-digit zero-padded debate number, speaker names, unique debate label, side labels, duration, motion, and a one-sentence summary.
- Short representative quotes for both sides.

Never invent direct quotations. If transcript text is lightly cleaned for readability, say so in `sourceNote`.

## Page Structure

Every debate object should produce this order:

1. Sticky header with Slugfester branding, a `Debates` link, and an `External Sites` capsule for LogFall and CogBias.
2. Hero metadata: `Debate NN` plus debate label plus `Last rendered: YYYY-MM-DD`.
3. Smaller debate title and motion.
4. Representative quotes from both sides.
5. AI-generated scoring note.
6. `◉` interaction guide.
7. Parallel argument columns, aligned by topic and time.
8. Overall commentary with strengths and logical blunders for each side.

## Segmentation

- Use 4-7 topical sections for a long-form debate.
- Each section should cover one clear argumentative movement.
- Use the YouTube/transcript time range in `timebox`; keep upload timing separate from the `date` field.
- Each exchange should align the two sides on the same issue whenever possible.
- Prefer 1-3 exchanges per section rather than exhaustive coverage.

## Quote Standard

- `quotes.pro.text` and `quotes.con.text` should be short, direct quotes or faithful fragments that encapsulate each side's position.
- `argument.words` should stay quote-forward: use the speaker's actual words where short enough, or a tight transcript-grounded condensation when the original is too long.
- Keep excerpts short enough to be legally and visually compact.
- Do not use a quote because it is entertaining if it is not representative.

## Scoring Rubric

Scores are AI-generated estimates based on conventional standards of argument quality:

- Logical coherence.
- Relevance to the stated motion.
- Evidential support and source quality.
- Responsiveness to the opponent's strongest point.
- Burden-of-proof discipline.
- Clear definitions and stable terms.
- Absence of logical fallacies or cognitive-bias-driven overreach.
- Charitable treatment of the opposing position.

Score bands:

- `90-100`: exceptional; clear, relevant, well-supported, and resilient under rebuttal.
- `80-89`: strong; persuasive with limited gaps or remaining uncertainty.
- `70-79`: solid; coherent and relevant, but compressed, under-sourced, or only partially developed.
- `60-69`: mixed; understandable but reliant on weak warrants, speculative links, or incomplete rebuttal.
- `50-59`: weak; important gaps, misframing, or poor engagement with the live objection.
- `<50`: seriously defective; fallacious, irrelevant, self-undermining, or unsupported.

## Critique Popovers

Each `◉` critique should target about 120 words. The validator allows 105-130 words.

Use this pattern:

1. Name the argumentative move.
2. State what is strongest or fairest about it.
3. Identify the main weakness, missing warrant, fallacy, bias, or unanswered burden.
4. Explain why the numerical score follows from that balance.

Tone rules:

- Be analytical, not snide.
- Do not psychoanalyze motives.
- Do not say a speaker "proved" more than the argument supports.
- Use fallacy names only when the flaw affects the inference.
- Use bias names only when the tendency plausibly shaped the framing or evaluation.

## Fallacies And Biases

Use LogFall for logical fallacies and CogBias for cognitive biases:

- Fallacy links must use `https://logfall.com/fallacies/...`.
- Bias links must use `https://cogbias.site/biases/...`.
- A tag should explain a real weakness, not merely decorate a low score.
- Each tag needs a short context note explaining why that label applies to the specific argument or rebuttal.
- Pills should show a hover/focus popover with the basic definition, contextual explanation, and the note `Click button for more info.`
- Pills should also open a local Slugfester reference page first; that page gives the basic definition, debate context, and the in-depth LogFall or CogBias link.
- Prefer no tag over a forced tag.

## Overall Commentary

Each side needs:

- One overall score.
- At least two strengths.
- At least one logical blunder.
- Links for named fallacies or biases in the blunder list.

The overall score should reflect the whole performance, not the average of every local score. Weight central issues, successful rebuttals, and burden-of-proof posture more heavily than minor side exchanges.

## Manual Checklist

Before committing a new debate:

- Representative quotes are actual or transcript-grounded.
- Critiques average near 120 words and are not repetitive.
- Scores match the written criticism.
- Each section compares like with like.
- Fallacy/bias tags are warranted and linked to the correct site.
- The scoring note makes clear that scores are AI-generated.
- The scoring-note band identifies `GPT 5.5 Extra High` as the assessment model.
- `sourceNote` identifies how the transcript was obtained or cleaned.
- The page follows the locked design in `youtube-debate-assessment-template.md`.
- The debate number is two-digit, zero-padded, unique, and sequential in debate-list order.
- The debate label is distinct from every other listed debate.
- `npm run seo` has regenerated clean URL pages, sitemap, robots, and fallback HTML.
- `npm run check` passes.
