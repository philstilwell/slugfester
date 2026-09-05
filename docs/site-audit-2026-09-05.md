# Slugfester site audit — September 5, 2026

The audit found seven clear defects or misleading presentation issues. These were corrected without changing assessment judgments or published scores. The most consequential defect prevented recommendation and correction forms from submitting when readers reached them through ordinary internal navigation.

## Coverage and evidence

| Area | Coverage and result |
| --- | --- |
| Catalogue | 253 published debates; 237 eligible one-on-one debates and 16 team/panel records |
| Profiles | All 172 generated profiles checked; 158 have an eligible individual record, 14 have team/panel records only |
| Rankings | 50 people meet the default three-debate minimum; averages, opponents, eligibility, and comparison values agree with source records |
| Small samples | 76 individual profiles contain only one eligible debate |
| Section scores | 2,750 section-side scores, observed range 48–95; source and generated analytics validated |
| Argument cards | 5,492 displayed scored moves, with 354 fallacy tags and 132 bias tags; these are displayed-card counts, not an assertion about the number of underlying transcript utterances |
| Generated pages | All 444 sitemap routes, 253 debate-detail modules, 172 profiles, avatars, canonical addresses, metadata, structured data, feed, and local resources validated |
| Browser audit | Home, search, topics, rankings/comparison, Backend, corrections, two profiles, a recent debate, a team debate, a reference page, and an unknown URL; widths 320, 390, 768, and 1440 pixels |
| Browser structure | One main heading on each sampled page; no duplicate IDs, missing in-page anchors, broken loaded images, or application exceptions in the sample |
| Forms | Reproduced a blocked recommendation reached from Home. After correction, recommendation and correction submissions reached an intercepted FormSubmit endpoint with the expected fields; no test email sent |
| Accessibility | Existing automated accessibility, keyboard, enlarged-text, forced-color, and phone-layout checks passed; added manual verification of focus after internal navigation |
| External resources | All 13 LogFall/CogBias definition links and all seven research PDFs returned HTTP 200; HTTP and www addresses redirect to the canonical HTTPS site |
| Publishing | Recent GitHub quality and deployment runs were successful at audit start |
| Regression suite | All 52 existing site checks passed after the fixes |

## Corrections implemented

1. **Forms failed after internal navigation — high impact.** Pages such as Home allowed forms to submit only to the site itself. Internal navigation displayed Backend without loading its more permissive document policy, so the browser blocked FormSubmit. The approved form destination is now permitted in every generated document. This also covers correction reports reached through the footer and legacy internal routes. Other external form destinations remain disallowed.
2. **Published pages could mix fresh code and stale data — high impact.** Browser data modules retained a September 3 query string despite later additions; live responses allowed four hours of browser caching. The generator now derives a content fingerprint from application code, styles, catalogue data, supporting modules, and the generator. All pages and nested imports receive the matching version automatically. Generation is repeatable, and validation rejects inconsistent versions. HTML itself can still be cached briefly under the hosting provider's policy.
3. **Landing cards overflowed narrow phones — medium impact.** The live page measured 393 pixels wide at both 320- and 390-pixel viewport widths. A grid column expanded to its content's minimum size. Cards now use shrinkable columns and wrap their metadata; the corrected 320-pixel viewport measures exactly 320 pixels, with readable card contents.
4. **Single-debate profiles implied consistency — medium impact.** A one-score record displayed “Tight score spread.” All such profiles now say “One scorecard; too early to assess consistency.” The recorded score and histogram remain intact.
5. **Score spread was presented as evidence of rubric quality — medium impact.** A wide score distribution alone cannot establish accurate or consistent measurement. The chart now describes what it actually demonstrates and directs readers to worked examples and the consistency studies.
6. **Reassessment plans differed across pages — low impact.** Backend's approximate twice-yearly statement was aligned with the landing page's tentative spring 2027 reassessment. The Backend and corrections modification dates were refreshed.
7. **Keyboard focus was lost on internal navigation — medium impact.** The application replaced the focused link along with the page contents. Navigation now places focus on the new main content, including browser back/forward navigation without an anchor. An obsolete empty-state reference to a nonexistent model filter was also removed.

## Recommended improvements, in priority order

1. **Give research its own “Insights” page.** The seven papers currently sit far down Backend. Present each as an intriguing question, a short finding, one annotated figure, a clear limitation, and links to the full paper and relevant debates. Readers should be able to understand the finding without opening a PDF.
2. **Add a brief “What decided this assessment?” introduction to each debate.** Explain the central disagreement, the strongest contribution from each side, and the main reason for the score difference. Link each point to its relevant section or timestamp. Draft this only from the existing approved assessment and check it against that source.
3. **Create useful ways into the archive.** Offer curated routes such as “Start here,” “Closely matched debates,” “Strong arguments on both sides,” and “One question, several viewpoints.” Define selection rules visibly and avoid treating a tiny score difference as an objective verdict.
4. **Make ranking uncertainty visible beside the rankings.** Show the difference from nearby scores and link to the reliability study. Add a short note about changes between assessment periods. The first two current averages are about 0.17 points apart; their exact positions should not look more certain than the evidence supports. Do not invent statistical error bars or apply a blanket score adjustment.
5. **Offer “You assess it first” argument exercises.** Let readers consider a short, sourced argument, then reveal the existing critique and score explanation. Use the assessed reasoning, not speaker popularity, as the learning objective. Begin with a small reviewed set of examples.
6. **Add related debates at the end of each scorecard.** Show three relevant next reads: the same question, a different opponent, and a contrasting argument. Use topic assignments and eligible participant records to make recommendations explainable.
7. **Improve discovery through fuller crawlable page text.** Current fallback HTML contains a concise summary and links while most explanation arrives through JavaScript. Render richer method, insight, and debate-summary content into the initial page so readers with limited scripting support and search tools can access more substance. Keep it generated from the same source as the interactive view.

## Scope limits

This was an operational, presentation, and calculation audit, not a new assessment campaign. It did not rewatch all 253 videos, independently rejudge every argument or bias label, or establish that every source video still plays in every region. Existing published-score and ledger validation passed. External-link success means the destination responded; it does not certify every statement on that destination. Form submission was intercepted before contacting the delivery service, so final inbox delivery was not retested. No paid assessment, transcription, image generation, or hosting migration was performed.
