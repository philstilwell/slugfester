export const V428_ROOT = "docs/calibration/v4.2.8/correction-aware-retired-continuation";
export const V428_PROTOCOL_ID = "v4.2.8-correction-aware-retired-continuation";
export const V428_DEBATE_NUMBERS = ["162", "99", "65", "16"];

export function isLocalCorrectableFailure(result) {
  return result?.status === "output-validation-failed" && result.rawOutputWritten === true;
}
