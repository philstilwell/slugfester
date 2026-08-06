export const V4220_TOPIC_FAMILIES = Object.freeze(["resurrection-history", "evil-hiddenness", "morality-ethics", "mind-agency", "science-origins", "general-theism-religion"]);

const RULES = Object.freeze([
  ["evil-hiddenness", /problem of evil|\bevil\b|suffering|hiddenness|nonbelief|\bhell\b|salvation|damnation|horrendous|gratuitous pain/i],
  ["morality-ethics", /objective moral|moral values|moral duties|moral obligation|moral realism|moral truth|moral transformation|morality|\bethic|euthyphro|value theory/i],
  ["resurrection-history", /resurrection|gospel|historical person|historical jesus|new testament|early christian|historicity of jesus/i],
  ["mind-agency", /conscious|\bmind\b|free will|personal identity|\bagency\b|mental caus|genuinely available actions|control which of multiple|\bfreedom\b.*\bresponsib|\bresponsib.*\bfreedom\b/i],
  ["science-origins", /origin of life|evolution|cosmolog|fine-tun|\buniverse\b|\bphysics\b|big bang|scientific explanation/i]
]);

export function classifyV4220Motion(motion) {
  return RULES.find(([, pattern]) => pattern.test(motion))?.[0] ?? "general-theism-religion";
}
