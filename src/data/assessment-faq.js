// Shared by the interactive Backend page and its initial, no-JavaScript HTML.
export function renderAssessmentFaq() {
  return `<details class="backend-objectivity-accordion assessment-faq" id="assessment-questions">
    <summary><span><strong>Questions &amp; answers</strong><small>Purpose, scores, evidence and corrections</small></span><i aria-hidden="true"></i></summary>
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
          <dd><p>The linked recordings let readers check whether quotations, summaries and critiques fit the actual exchange. A further encouraging sign is the tendency for an interlocutor’s scores to cluster across different debates. Under the standard blind-review workflow, reviewers do not receive earlier scorecards or published results, so those scores are not supplied as targets. Earlier assessments may use different controls.</p>
          <p>The <a href="/insights/#ranking-confidence">October 9, 2026 ranking study</a> tested this consistency by splitting each of 31 interlocutors’ records, all with at least six assessed debates, into two halves. Across 3,000 random splits, the typical agreement between the two rankings was <strong>0.87</strong>, where 1.00 means identical order. This is strong evidence of repeatable differences in assessed performance. It does not mean “87% accurate”: a judging system can repeat a bias or misunderstanding. Consistency supports confidence in the pattern; accuracy also requires checking the reasoning against the source. Independent expert assessment would provide an additional check.</p></dd>
        </div>
        <div>
          <dt>Could the scores cluster this tightly if they were assigned arbitrarily?</dt>
          <dd><p>A random-assignment check used the same 31 interlocutors, covering 314 appearances. It kept every debate’s two participants and two awarded scores, then randomly swapped who received which score. This preserves the actual matchups and each participant’s debate count and mix of assessment procedures.</p>
          <p><strong>None of 100,000 random assignments produced clustering as tight as the published scores.</strong> Under this specific model, the chance of clustering at least this strong has a 95% simulation upper bound of about <strong>1 in 33,000</strong>. That supports a systematic pattern beyond this form of arbitrary assignment. It is a result for the group, not a separate probability for each person.</p>
          <p>The figure is conditional on that model; it is not the probability that an assessment is wrong. Stable bias or shared assumptions can also produce consistent scores. <a href="/docs/qa-support/score-clustering-2026-10-22/">Read the methods, results and limits</a>.</p></dd>
        </div>
        <div>
          <dt>How much weight should I give rankings and small score differences?</dt>
          <dd><p>Read an average alongside the number of debates, their topics, the opponents and the assessment procedures. The catalogue is curated, and speakers face different conditions. Repeated differences across several debates are more informative than one result; neighboring averages can be too close to support a confident ordering. The <a href="/insights/#ranking-confidence">ranking study</a> explains both the stable patterns and the uncertainty about exact places. A one-point lead by itself does not establish a reliable advantage.</p></dd>
        </div>
        <div>
          <dt>Can an assessment misunderstand an argument or reproduce bias?</dt>
          <dd><p>Yes. A transcript can omit a qualification, a speaker can be misidentified, or an assessment can miss a reply or misread a disputed term. Separate reviews and fixed criteria help check these problems, but reviewers using the same model can share a mistake. A detailed explanation makes a judgment easier to examine; it does not guarantee that judgment is correct.</p></dd>
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
          <dt>Can I challenge the scoring method itself?</dt>
          <dd><p>Yes. The choice of arguments, scoring criteria, weights and assumptions can all be questioned. Explain which choice you dispute and how it affects the assessment. A methodological objection can matter across many debates, even when no quotation is wrong. You can also <a href="/insights/#scoring-weights">explore alternative scoring weights</a> using the saved assessments.</p>
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
