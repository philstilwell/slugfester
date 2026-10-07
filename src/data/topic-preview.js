// Topic browsing describes the discussion, never its assessment or outcome.
// Derive previews from the motion and section headings so new debates inherit this rule.
export function topicPreviewText(debate) {
  const question = String(debate.motion || "").trim();
  const themes = [...new Set((debate.sections || [])
    .map((section) => String(section.title || "").trim()).filter(Boolean))];
  // Detailed motions already describe the main arguments. Supplement short, general
  // questions with complete theme headings, without shortening words or adding judgments.
  if (question.length >= 90 || themes.length === 0) return question;
  return `${question}${question ? " " : ""}Themes include: ${themes.slice(0, 3).join("; ")}.`;
}
