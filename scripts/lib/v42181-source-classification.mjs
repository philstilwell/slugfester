import { V424_TOPIC_FAMILIES, classifyV424Motion } from "./v424-source-classification.mjs";

export { V424_TOPIC_FAMILIES as V42181_TOPIC_FAMILIES };

export function classifyV42181Motion(motion) {
  if (/genuinely available actions|control which of multiple|\bfreedom\b.*\bresponsib|\bresponsib.*\bfreedom\b/i.test(motion)) return "mind-agency";
  return classifyV424Motion(motion);
}
