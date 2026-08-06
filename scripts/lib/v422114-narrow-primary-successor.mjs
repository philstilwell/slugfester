import { assertV4 } from "./v4-lean-production.mjs";
import { compileAndValidateV422110Primary, makeV422110PrimarySchema, V422110_MODEL } from "./v422110-structural-partition-primary.mjs";

export const V422114_ROOT = "docs/calibration/v4.2.21.14/narrow-primary-successor";
export const V422114_PROTOCOL_ID = "v4.2.21.14-narrow-primary-successor";
export const V422114_OUTPUT_VERSION = "4.2.21.14-candidate-grounded-primary-a";
export const V422114_MODEL = V422110_MODEL;

const clone = (value) => structuredClone(value);

function selectionSchemas(schema) {
  const section = schema.properties.sectionJudgments.items.properties;
  return [section.proSelections.items, section.conSelections.items];
}

export function makeV422114PrimarySchema({ packet, candidateBundle } = {}) {
  const schema = makeV422110PrimarySchema({ packet, candidateBundle });
  schema.$id = "slugfester-v422114-narrow-candidate-grounded-primary-a";
  schema.properties.schemaVersion.const = V422114_OUTPUT_VERSION;
  schema.properties.protocolId.const = V422114_PROTOCOL_ID;
  for (const move of selectionSchemas(schema)) {
    move.required = [...move.required];
    move.required.splice(move.required.indexOf("moveId") + 1, 0, "moveKind");
    move.properties.moveKind = { type: "string", enum: ["constructive", "reply"], description: "Primary A's global classification; the discovery candidate kind is advisory only." };
    const response = move.properties.response;
    response.required = response.required.filter((key) => !["diagnosticConsequenceExplicit", "replacementDemandAnswered"].includes(key));
    delete response.properties.diagnosticConsequenceExplicit;
    delete response.properties.replacementDemandAnswered;
    response.required.push("specialResponseMode");
    response.properties.specialResponseMode = { type: "string", enum: ["none", "diagnostic-defeat", "justified-reframe"] };
  }
  return schema;
}

function transformResponse(response, moveId) {
  const transformed = clone(response);
  const mode = transformed.specialResponseMode;
  assertV4(["none", "diagnostic-defeat", "justified-reframe"].includes(mode), `${moveId}: invalid special response mode`);
  delete transformed.specialResponseMode;
  transformed.diagnosticConsequenceExplicit = mode === "diagnostic-defeat";
  transformed.replacementDemandAnswered = mode === "justified-reframe";
  return transformed;
}

function toLegacyProposal(proposal) {
  const transformed = clone(proposal);
  transformed.schemaVersion = "4.2.21.10-candidate-grounded-primary-a";
  transformed.protocolId = "v4.2.21.10-structural-partition-primary";
  for (const section of transformed.sectionJudgments) for (const selection of [...section.proSelections, ...section.conSelections]) {
    selection.response = transformResponse(selection.response, selection.moveId);
    delete selection.moveKind;
  }
  return transformed;
}

function authoredMoveKinds(proposal) {
  const result = new Map();
  for (const section of proposal.sectionJudgments) for (const selection of [...section.proSelections, ...section.conSelections]) {
    assertV4(["constructive", "reply"].includes(selection.moveKind), `${selection.moveId}: invalid Primary A move kind`);
    assertV4(!result.has(selection.qualifiedCandidateId), `${selection.qualifiedCandidateId}: selected more than once`);
    result.set(selection.qualifiedCandidateId, selection.moveKind);
  }
  return result;
}

export function compileAndValidateV422114Primary(proposal, args) {
  assertV4(proposal?.schemaVersion === V422114_OUTPUT_VERSION && proposal?.protocolId === V422114_PROTOCOL_ID, "narrow Primary A successor identity mismatch");
  const kinds = authoredMoveKinds(proposal);
  const discoveryKinds = new Map(args.candidateBundle.candidates.map((candidate) => [candidate.qualifiedCandidateId, candidate.moveKind]));
  const sourceCandidates = new Map(args.candidateBundle.candidates.map((candidate) => [candidate.qualifiedCandidateId, candidate]));
  const compatibilityBundle = clone(args.candidateBundle);
  for (const candidate of compatibilityBundle.candidates) if (kinds.has(candidate.qualifiedCandidateId)) candidate.moveKind = kinds.get(candidate.qualifiedCandidateId);
  const inherited = compileAndValidateV422110Primary(toLegacyProposal(proposal), { ...args, candidateBundle: compatibilityBundle });
  const provenance = inherited.output.moves.map((move) => {
    const inheritedItem = inherited.provenance.find((item) => item.moveId === move.moveId);
    const authoredKind = kinds.get(inheritedItem.qualifiedCandidateId);
    const source = sourceCandidates.get(inheritedItem.qualifiedCandidateId);
    const immutableCandidateFieldsPreserved = move.side === source.side && move.speaker === source.speaker && move.sourceSpan.startEvent === source.sourceSpan.startEvent && move.sourceSpan.endEvent === source.sourceSpan.endEvent && move.attributionConfidence === source.attributionConfidence;
    assertV4(immutableCandidateFieldsPreserved, `${move.moveId}: immutable discovery candidate field changed`);
    return { moveId: move.moveId, qualifiedCandidateId: inheritedItem.qualifiedCandidateId, repositoryOwnedFields: ["sectionId", "side", "speaker", "sourceSpan", "attributionConfidence"], primaryAuthoredFields: ["moveKind"], discoveryMoveKind: discoveryKinds.get(inheritedItem.qualifiedCandidateId), primaryAuthoredMoveKind: authoredKind, moveKindChangedFromDiscovery: discoveryKinds.get(inheritedItem.qualifiedCandidateId) !== authoredKind, immutableCandidateFieldsPreserved };
  });
  return { ...inherited, validation: { ...inherited.validation, narrowPrimarySuccessor: { status: "passed", outerStructuralContractRetained: true, primaryAAuthoredMoveKind: true, discoveryMoveKindAdvisoryOnly: true, specialResponseEnumExpandedByRepository: true, mutuallyExclusiveResponseFlagsGuaranteed: true, unchangedV4220ValidatorPassed: true } }, provenance };
}

export function buildV422114FixtureProposal(predecessorProposal, candidateBundle) {
  const candidates = new Map(candidateBundle.candidates.map((candidate) => [candidate.qualifiedCandidateId, candidate]));
  const proposal = clone(predecessorProposal);
  proposal.schemaVersion = V422114_OUTPUT_VERSION;
  proposal.protocolId = V422114_PROTOCOL_ID;
  for (const section of proposal.sectionJudgments) for (const selection of [...section.proSelections, ...section.conSelections]) {
    const candidate = candidates.get(selection.qualifiedCandidateId);
    assertV4(candidate, `${selection.qualifiedCandidateId}: fixture candidate missing`);
    const { diagnosticConsequenceExplicit, replacementDemandAnswered, ...response } = selection.response;
    assertV4(!(diagnosticConsequenceExplicit && replacementDemandAnswered), `${selection.moveId}: predecessor booleans cannot migrate without semantic choice`);
    selection.moveKind = candidate.moveKind;
    selection.response = { ...response, specialResponseMode: diagnosticConsequenceExplicit ? "diagnostic-defeat" : replacementDemandAnswered ? "justified-reframe" : "none" };
  }
  return proposal;
}
