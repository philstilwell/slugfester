// Keep approval history in the frozen assessment records. Readers need the scope itself.
export function readerScopeLanguage(text = "") {
  return text
    .replaceAll("By explicit editorial approval, this assessment", "This assessment")
    .replaceAll("By explicit editorial approval, ", "");
}
