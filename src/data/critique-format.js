// Presentation only: preserve published wording and never infer new section labels.
const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

export function renderCritiqueText(critique = "") {
  return String(critique)
    .split(/(?:^|\s+)(?=(?:Strongest feature|Principal limitation|Live burden|Locked score):)/g)
    .map((section) => section.trim())
    .filter(Boolean)
    .map((section) => {
      const label = section.match(/^(?:Strongest feature|Principal limitation|Live burden|Locked score):/)?.[0];
      const content = label
        ? `<strong>${escape(label)}</strong>${escape(section.slice(label.length))}`
        : escape(section);
      return `<span class="critique-section">${content}</span>`;
    })
    .join("\n");
}
