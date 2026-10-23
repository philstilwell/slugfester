// Shared by the interactive Backend page and its initial, no-JavaScript HTML.
export function renderAssessmentFaq(tomJumpScores = []) {
  return `<details class="backend-objectivity-accordion assessment-faq" id="assessment-questions">
    <summary><img class="assessment-faq-art" src="/assets/assessment-process/qa-characters.webp" alt="" width="480" height="439" decoding="async"><span><strong>Questions &amp; answers</strong><small>Purpose, scores, evidence and corrections</small></span><i aria-hidden="true"></i></summary>
    <div class="assessment-faq-content">
      <dl class="assessment-faq-list">
        <div>
          <dt>What is Slugfester for?</dt>
          <dd><p>Slugfester helps readers examine the reasoning in public debates. Scorecards bring arguments, replies, critiques and source passages together so you can inspect an exchange, compare assessments and decide where a case needs more support. The project also explores how well artificial intelligence (AI) can perform this work. Its value rests on the usefulness and accuracy of the analysis.</p></dd>
        </div>
        <div>
          <dt>Why use AI?</dt>
          <dd><p>AI makes detailed, structured analysis across many debates practical. It can help identify overlooked replies, compare reasoning and suggest stronger arguments for either side. Readers can assess those contributions on their merits without endorsing AI in general. AI authorship alone neither establishes nor refutes a conclusion; Slugfester remains responsible for what it publishes.</p></dd>
        </div>
        <div>
          <dt>What does a score mean?</dt>
          <dd><p>A score estimates the quality of the reasoning presented under the assessment criteria. It considers support, logical coherence, responsiveness and related features explained in the <a href="#assessment-process">assessment guide</a>. An 80/100 score is not an 80% probability that the speaker is right. Seeking truth is the aim; scores help direct attention to the arguments and evidence. They do not settle a worldview or measure a person’s worth.</p></dd>
        </div>
        <div>
          <dt>What evidence is there that the assessments are accurate?</dt>
          <dd><p>The linked recordings let readers check whether quotations, summaries and critiques fit the actual exchange. Another encouraging sign is visible in an interlocutor’s score graph: when their scores cluster within a narrow range across several debates, the assessments repeatedly place their debating competence at a similar level.</p>
          <p>Under the standard blind-review workflow, the reviewers are independent AI agents called by the administrative AI. They do not receive earlier scorecards or published results, so those scores are not supplied as targets. Earlier assessments may use different controls.</p>
          <p>This consistency supports confidence that the assessments are identifying a recurring pattern in the person’s performance. Accuracy still depends on how well the assessments represent and evaluate the actual arguments; a consistent bias or misunderstanding can also recur.</p></dd>
        </div>
        <div>
          <dt>What does a tight cluster of one person’s scores show?</dt>
          <dd><p>It shows that the person was assessed as demonstrating <strong>a similar level of debating competence across those debates</strong>. On an interlocutor’s profile, the score graph groups their debate scores into five-point ranges. Taller bars mean more debates received scores in that range. When most scores sit in a few neighboring ranges, you can see the consistency at a glance.</p>
          ${renderTomJumpExample(tomJumpScores)}
          <p>To examine another person, select their name on the <a href="/rankings/">rankings page</a> and look at their score distribution and debate list. Read the cluster alongside the number of debates, topics and opponents. It describes their assessed performance in those debates; it does not establish identical ability in every setting or guarantee that each judgment is correct.</p></dd>
        </div>
        <div>
          <dt>How much weight should I give rankings and small score differences?</dt>
          <dd><p>Read an average alongside the number of debates, their topics, the opponents and the assessment procedures. The catalogue is curated, and speakers face different conditions. Repeated differences across several debates are more informative than one result; neighboring averages can be too close to support a confident ordering. The <a href="/insights/#ranking-confidence">ranking study</a> explains both the stable patterns and the uncertainty about exact places. A one-point lead by itself does not establish a reliable advantage.</p></dd>
        </div>
        <div>
          <dt>Can an assessment misunderstand an argument or reproduce bias?</dt>
          <dd><p>Yes. A transcript can omit a qualification, a speaker can be misidentified, or an assessment can miss a reply or misread a disputed term. Separate AI reviews and fixed criteria help check these problems, but review agents using the same model can share a mistake. A detailed explanation makes a judgment easier to examine; it does not guarantee that judgment is correct.</p></dd>
        </div>
        <div>
          <dt>Did the participants say everything shown on their scorecards?</dt>
          <dd><p>Distinguish the quoted source passages, the site’s summaries and critiques, and the explicitly labeled AI contributions. A steelman is a strengthened version of an argument; it can add reasoning the participant did not supply. These proposed improvements and new ideas are separate from the recorded performance and do not contribute to participant scores. An accurate account of the original argument is still essential.</p></dd>
        </div>
        <div>
          <dt>Can I inspect the prompts and instructions behind an assessment?</dt>
          <dd><p>The guide below explains the standard workflow, and scorecards provide source links and assessment notes. A model’s name alone does not specify the instructions or evidence it received. Exact prompts and complete run records are not currently presented as a download for each debate. Use <a href="/corrections/#report-scorecard-issue">Feedback</a> to identify the assessment and the materials you want to inspect. The current guide should not be assumed to describe every historical assessment.</p></dd>
        </div>
        <div>
          <dt>What if an assessment misrepresents me or contains another error?</dt>
          <dd><p>Use the scorecard’s “Report a possible scorecard issue” link, or the <a href="/corrections/#report-scorecard-issue">Feedback form</a>. Identify the page and disputed wording, explain the problem, and include the relevant source passage or timestamp where possible. You do not need to diagnose the AI or propose a replacement score. A specific objection can be valid regardless of whether its author likes the result. Errors may not be corrected immediately, and submission does not guarantee a reply or a change to the current scorecard.</p></dd>
        </div>
        <div>
          <dt>How can I contribute to the improvement of the scoring method?</dt>
          <dd><p>Suggest an improvement to the choice of arguments, scoring criteria, weights or assumptions, and explain how it would improve the assessment. A methodological objection can matter across many debates, even when no quotation is wrong. You can also <a href="/insights/#scoring-weights">explore alternative scoring weights</a> using the saved assessments.</p>
          <p>Errors identified may not be corrected immediately. All feedback will be considered, but only complaints judged valid will be incorporated into the prompts used for future reevaluations of the entire debate corpus. Valid complaints will be generalized into review instructions and safeguards that apply to every assessment and score. The reviewers are independent AI agents called by the administrative AI. They will be asked to check for the underlying problem across all debates, so a valid complaint about one case can improve the process throughout the collection.</p></dd>
        </div>
        <div>
          <dt>Will the debates be reassessed as AI improves?</dt>
          <dd><p>A site-wide reassessment is tentatively planned for spring 2027, subject to stronger AI agents being available. A newer model still needs to demonstrate better performance. Future improvements do not establish the accuracy of today’s assessments, and specific errors can be reported now.</p></dd>
        </div>
      </dl>
    </div>
  </details>`;
}

// Both page versions supply the same eligible individual scores used by profiles.
function renderTomJumpExample(scores) {
  if (scores.length < 2) return "";
  const ordered = [...scores].sort((a, b) => a - b);
  const scoreList = `${ordered.slice(0, -1).join(", ")} and ${ordered.at(-1)}`;
  const spread = ordered.at(-1) - ordered[0];
  const bands = Array.from({ length: 10 }, (_, index) => {
    const minimum = 50 + index * 5;
    const maximum = index === 9 ? 100 : minimum + 4;
    return { label: `${minimum}–${maximum}`, count: scores.filter(score => score >= minimum && score <= maximum).length };
  });
  const maximumCount = Math.max(1, ...bands.map(band => band.count));
  return `<p>For example, <a href="/interlocutor/tom-jump/#profile-distribution-heading">Tom Jump’s ${scores.length} published one-on-one scores</a> are ${scoreList} out of 100. They span ${spread} points. ${spread <= 7 ? "That cluster indicates broadly similar assessed performance across these debates." : "The graph below shows how closely these scores cluster."}</p>
    <figure class="profile-score-histogram assessment-faq-score-graph">
      <figcaption><strong>Tom Jump · ${scores.length} debates</strong><span>Overall score / 100 · bar height counts debates</span></figcaption>
      <div class="profile-score-chart">
        <ol class="profile-score-bars" aria-label="Tom Jump’s overall scores, grouped in five-point ranges from 50 to 100">
          ${bands.map(band => `<li class="${band.count ? "has-score" : "is-empty"}" data-score-bucket="${band.label}" data-score-count="${band.count}" aria-label="${band.label}: ${band.count} ${band.count === 1 ? "debate" : "debates"}"><strong class="profile-score-bar-count" aria-hidden="true">${band.count || ""}</strong><span class="profile-score-bar" aria-hidden="true"><i style="--bar-height: ${(band.count / maximumCount * 100).toFixed(2)}%"></i></span><span class="profile-score-bucket-label" aria-hidden="true">${band.label}</span></li>`).join("")}
        </ol>
      </div>
    </figure>`;
}
