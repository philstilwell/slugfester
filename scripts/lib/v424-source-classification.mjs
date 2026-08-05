const RULES = Object.freeze([
  ["resurrection-history", /resurrection|gospel|historical|history|jesus|early christian|new testament/i],
  ["evil-hiddenness", /evil|suffering|hiddenness|nonbelief|hell|salvation|damnation|pain|horrendous/i],
  ["morality-ethics", /moral|morality|ethic|euthyphro|value theory/i],
  ["mind-agency", /conscious|\bmind\b|free will|personal identity|\bagency\b|mental caus/i],
  ["science-origins", /science|origin of life|evolution|cosmolog|fine-tun|universe|physics|naturalism|big bang/i]
]);

export const V424_TOPIC_FAMILIES = Object.freeze([...RULES.map(([name]) => name), "general-theism-religion"]);

export function classifyV424Motion(motion) {
  return RULES.find(([, pattern]) => pattern.test(motion))?.[0] ?? "general-theism-religion";
}
