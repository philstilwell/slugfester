// Shared by the interactive Feedback page and its initial, no-JavaScript HTML.
// Public screening guidance, not an assessment runner or a guarantee of acceptance.
export function renderDebateRecommendation({ sent = false } = {}) {
  return `<section class="correction-report-section feedback-recommendation-section" id="recommend-a-debate" aria-labelledby="feedback-recommendation-heading">
    <div class="correction-report-intro">
      <p class="eyebrow">Help shape the catalogue</p>
      <h2 id="feedback-recommendation-heading">Recommend a debate</h2>
      <p>Know an online debate worth a close look? Send the full recording and tell us what makes it worth assessing. We screen recommendations using these criteria:</p>
      <ul class="feedback-screening-list">
        <li><strong>Two clear opposing positions.</strong> Normally, one identifiable advocate on each side, with a moderator who facilitates the exchange. Panels, roundtables, and genuinely three-sided discussions do not fit the standard workflow.</li>
        <li><strong>A complete exchange.</strong> Link the full recording, or a complete, clearly bounded debate within a longer recording—not highlights, reaction clips, or excerpts that omit relevant arguments or replies.</li>
        <li><strong>Usable source material.</strong> A publicly accessible recording with clear enough audio and speaker identification to recover a reliable, complete transcript. YouTube is preferred by the current workflow. Captions help, but are not essential if the audio can be transcribed.</li>
        <li><strong>A clear topic fit.</strong> The central question should belong to one of our <a href="/topics/">listed topic categories</a>.</li>
        <li><strong>Substantive disagreement.</strong> Both sides should present reasons and respond to challenges. A solo lecture, promotional video, or interview without a real opposing case is not a suitable substitute.</li>
        <li><strong>Not already assessed.</strong> Please <a href="/search/">check the catalogue</a> first. To challenge an existing assessment, use the Corrections form above.</li>
      </ul>
      <p class="feedback-team-note"><strong>What about team debates?</strong> Recordings organized around two opposing teams require separate approval and review. If accepted, their shared side scores are kept out of individual one-on-one averages.</p>
    </div>
    <div class="backend-recommendation-card">
      <div>
        <h3>Send your recommendation</h3>
        <p>The debate URL and your email are required. Suggestions go directly to the site administrator for consideration.</p>
      </div>${sent ? '<p class="backend-recommendation-success" role="status"><strong>Recommendation sent.</strong> Thank you for the suggestion. Submission does not guarantee assessment or an individual reply.</p>' : ""}
      <form class="backend-recommendation-form feedback-recommendation-form" action="https://formsubmit.co/44a747882839a1240511c0b4bca3bd95" method="post" accept-charset="UTF-8" aria-label="Debate recommendation">
        <input type="hidden" name="_subject" value="Slugfester debate recommendation">
        <input type="hidden" name="_template" value="table">
        <input type="hidden" name="_next" value="https://slugfester.com/corrections/?recommendation=sent#recommend-a-debate">
        <label class="backend-recommendation-honey" aria-hidden="true">Leave this field empty<input type="text" name="_honey" tabindex="-1" autocomplete="off"></label>
        <label for="feedback-debate-url">Debate URL</label>
        <input id="feedback-debate-url" name="debate_url" type="url" inputmode="url" autocomplete="url" placeholder="https://www.youtube.com/watch?v=…" maxlength="500" required>
        <label for="feedback-recommender-email">Your email address</label>
        <input id="feedback-recommender-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" maxlength="254" required>
        <label for="feedback-debate-reason">Why is it worth assessing? (optional)</label>
        <textarea id="feedback-debate-reason" name="recommendation_reason" rows="5" maxlength="2500" placeholder="Name the speakers, the central question, a matching topic category, and what makes the exchange interesting. Mention transcript availability or a debate segment’s start and end times if useful."></textarea>
        <button class="button primary" type="submit">Send recommendation</button>
      </form>
      <p class="feedback-selection-note">Meeting these criteria makes a debate a candidate, not a guaranteed addition. Selection remains curated and somewhat arbitrary, and depends on source quality, topic fit, reader interest, and available assessment capacity.</p>
      <p class="backend-recommendation-privacy">Your recommendation and email are delivered privately to the site administrator through FormSubmit. Your email will be used only if follow-up about this recommendation is needed.</p>
    </div>
  </section>`;
}
