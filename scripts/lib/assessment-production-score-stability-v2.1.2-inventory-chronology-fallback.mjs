import { isDeepStrictEqual } from "node:util";

import {
  CANDIDATE_SHARDED_INVENTORY,
  buildCandidateShardedSideSelectionSchema,
  composeCandidateShardedInventoryProposal,
  validateCandidateShardedSideSelection,
} from "./assessment-production-score-stability-v2-inventory-candidate-sharded.mjs";
import {
  compileSidePartitionedSelectionMapInventory,
} from "./assessment-production-score-stability-v2-inventory-side-partitioned-selection-map.mjs";
import {
  assertV4,
  containsProhibitedCalculatedField,
} from "./v4-lean-production.mjs";

export const CHRONOLOGY_FALLBACK_INVENTORY = Object.freeze({
  schemaVersion:
    "4.2.21.16.6-score-blind-side-candidate-selection-chronology-fallback",
  protocolId:
    "v4.2.21.16.6-candidate-sharded-chronology-fallback-contract",
  reviewerRole: (side) =>
    `score-blind-${side}-candidate-evidence-selector-with-chronology-fallback`,
  fallbackMoveKind: "constructive",
});

const FALLBACK_AUDIT_KEY =
  "constructiveFallbackAuthoredForEveryNomination";
const clone = (value) => structuredClone(value);

function exactKeys(value, expected, label) {
  assertV4(
    value && typeof value === "object" && !Array.isArray(value),
    `${label}: expected object`
  );
  assertV4(
    isDeepStrictEqual(Object.keys(value).sort(), [...expected].sort()),
    `${label}: keys must be ${[...expected].sort().join(", ")}`
  );
}

export function buildChronologyFallbackSideSelectionSchema(args) {
  const schema = buildCandidateShardedSideSelectionSchema(args);
  const { side } = args;
  schema.$id =
    `slugfester-v4221166-score-blind-${side}-candidate-selection-chronology-fallback`;
  schema.title =
    `Slugfester v4.2.21.16.6 ${side} candidate selection with chronology fallback`;
  schema.properties.schemaVersion.const =
    CHRONOLOGY_FALLBACK_INVENTORY.schemaVersion;
  schema.properties.protocolId.const =
    CHRONOLOGY_FALLBACK_INVENTORY.protocolId;
  schema.properties.reviewerRole.const =
    CHRONOLOGY_FALLBACK_INVENTORY.reviewerRole(side);
  schema.properties.audit.required.push(FALLBACK_AUDIT_KEY);
  schema.properties.audit.properties[FALLBACK_AUDIT_KEY] = {
    type: "boolean",
    const: true,
  };
  const candidate = schema.$defs.candidateSelection;
  candidate.required = candidate.required.map((field) =>
    field === "moveKind" ? "preferredMoveKind" : field
  );
  candidate.required.splice(
    candidate.required.indexOf("preferredMoveKind") + 1,
    0,
    "orphanFallback"
  );
  const { moveKind, ...otherProperties } = candidate.properties;
  candidate.properties = {
    ...otherProperties,
    preferredMoveKind: moveKind,
    orphanFallback: {
      type: "object",
      additionalProperties: false,
      required: ["moveKind", "rationale"],
      properties: {
        moveKind: {
          type: "string",
          const: CHRONOLOGY_FALLBACK_INVENTORY.fallbackMoveKind,
        },
        rationale: {
          type: "string",
          minLength: 25,
          maxLength: 400,
        },
      },
    },
  };
  return schema;
}

export function projectChronologyFallbackSideSelection(sideSelection) {
  const projected = clone(sideSelection);
  projected.schemaVersion =
    CANDIDATE_SHARDED_INVENTORY.sideSelectionSchemaVersion;
  projected.protocolId = CANDIDATE_SHARDED_INVENTORY.sideSelectionProtocolId;
  projected.reviewerRole = CANDIDATE_SHARDED_INVENTORY.sideReviewerRole(
    sideSelection.side
  );
  delete projected.audit[FALLBACK_AUDIT_KEY];
  projected.candidateSelections = Object.fromEntries(
    Object.entries(sideSelection.candidateSelections).map(
      ([candidateId, selection]) => [
        candidateId,
        selection === null
          ? null
          : {
              sectionId: selection.sectionId,
              priorityTier: selection.priorityTier,
              moveId: selection.moveId,
              moveKind: selection.preferredMoveKind,
              proposition: selection.proposition,
            },
      ]
    )
  );
  return projected;
}

export function validateChronologyFallbackSideSelection({
  sideSelection,
  side,
  ...validationInputs
}) {
  assertV4(
    sideSelection.schemaVersion ===
        CHRONOLOGY_FALLBACK_INVENTORY.schemaVersion &&
      sideSelection.protocolId === CHRONOLOGY_FALLBACK_INVENTORY.protocolId &&
      sideSelection.reviewerRole ===
        CHRONOLOGY_FALLBACK_INVENTORY.reviewerRole(side) &&
      sideSelection.side === side &&
      sideSelection.audit?.[FALLBACK_AUDIT_KEY] === true &&
      !containsProhibitedCalculatedField(sideSelection),
    `${side}: chronology-fallback identity or boundary drifted`
  );
  for (const [candidateId, selection] of Object.entries(
    sideSelection.candidateSelections
  )) {
    if (selection === null) continue;
    exactKeys(
      selection,
      [
        "sectionId",
        "priorityTier",
        "moveId",
        "preferredMoveKind",
        "orphanFallback",
        "proposition",
      ],
      candidateId
    );
    exactKeys(
      selection.orphanFallback,
      ["moveKind", "rationale"],
      `${candidateId}.orphanFallback`
    );
    assertV4(
      ["constructive", "reply"].includes(selection.preferredMoveKind) &&
        selection.orphanFallback.moveKind ===
          CHRONOLOGY_FALLBACK_INVENTORY.fallbackMoveKind &&
        typeof selection.orphanFallback.rationale === "string" &&
        selection.orphanFallback.rationale.trim().length >= 25 &&
        selection.orphanFallback.rationale.length <= 400,
      `${candidateId}: invalid preferred kind or constructive fallback`
    );
  }
  const projected = projectChronologyFallbackSideSelection(sideSelection);
  const validation = validateCandidateShardedSideSelection({
    sideSelection: projected,
    side,
    ...validationInputs,
  });
  return {
    ...validation,
    constructiveFallbacksAuthored: Object.values(
      sideSelection.candidateSelections
    ).filter(Boolean).length,
  };
}

function candidateChronology(candidateTransport) {
  const indexes = Object.fromEntries(
    [
      "qualifiedCandidateId",
      "side",
      "sourceSpan.startEvent",
      "sourceSpan.endEvent",
    ].map((column) => [column, candidateTransport.columnOrder.indexOf(column)])
  );
  assertV4(
    Object.values(indexes).every((index) => index >= 0),
    "chronology-fallback candidate columns missing"
  );
  return new Map(
    candidateTransport.candidateRows.map((row) => [
      row[indexes.qualifiedCandidateId],
      {
        side: row[indexes.side],
        startEvent: row[indexes["sourceSpan.startEvent"]],
        endEvent: row[indexes["sourceSpan.endEvent"]],
      },
    ])
  );
}

export function composeChronologyFallbackInventoryProposal({
  plan,
  sideSelections,
  legacySchema,
  candidateTransport,
  candidateCensus,
  sideCandidateTransports,
}) {
  const projectedSelections = {};
  for (const side of ["pro", "con"]) {
    validateChronologyFallbackSideSelection({
      sideSelection: sideSelections[side],
      side,
      plan,
      legacySchema,
      candidateTransport,
      sideCandidateTransport: sideCandidateTransports[side],
      candidateCensus,
    });
    projectedSelections[side] =
      projectChronologyFallbackSideSelection(sideSelections[side]);
  }
  const composed = composeCandidateShardedInventoryProposal({
    plan,
    sideSelections: projectedSelections,
    legacySchema,
    candidateTransport,
    candidateCensus,
    sideCandidateTransports,
  });
  const chronology = candidateChronology(candidateTransport);
  const retained = ["pro", "con"].flatMap((side) =>
    Object.entries(composed.proposal.candidateSelectionsBySide[side])
      .filter(([, selection]) => selection !== null)
      .map(([candidateId, selection]) => ({
        candidateId,
        side,
        selection,
        ...chronology.get(candidateId),
      }))
  );
  retained.sort(
    (left, right) =>
      left.startEvent - right.startEvent ||
      left.endEvent - right.endEvent ||
      left.selection.moveId.localeCompare(right.selection.moveId)
  );
  const priorSides = [];
  const chronologyFallbacks = [];
  for (const retainedCandidate of retained) {
    if (
      retainedCandidate.selection.moveKind === "reply" &&
      !priorSides.some((side) => side !== retainedCandidate.side)
    ) {
      const authoredFallback =
        sideSelections[retainedCandidate.side].candidateSelections[
          retainedCandidate.candidateId
        ].orphanFallback;
      retainedCandidate.selection.moveKind = authoredFallback.moveKind;
      chronologyFallbacks.push({
        qualifiedCandidateId: retainedCandidate.candidateId,
        side: retainedCandidate.side,
        moveId: retainedCandidate.selection.moveId,
        preferredMoveKind: "reply",
        appliedMoveKind: authoredFallback.moveKind,
        rationale: authoredFallback.rationale,
        reason: "no-earlier-selected-opposing-move",
      });
    }
    priorSides.push(retainedCandidate.side);
  }
  return {
    proposal: composed.proposal,
    reduction: {
      ...composed.reduction,
      chronologyFallbackRule:
        "apply-model-authored-constructive-fallback-only-to-retained-replies-with-no-earlier-selected-opposing-move",
      chronologyFallbacks,
    },
  };
}

export function compileChronologyFallbackInventory({
  evidenceBundle,
  eventsDocument,
  ...inputs
}) {
  const composed = composeChronologyFallbackInventoryProposal(inputs);
  return {
    ...composed,
    ...compileSidePartitionedSelectionMapInventory({
      proposal: composed.proposal,
      candidateTransport: inputs.candidateTransport,
      legacySchema: inputs.legacySchema,
      evidenceBundle,
      eventsDocument,
    }),
  };
}

export function makeChronologyFallbackDevelopmentFixture(sideSelection) {
  const fixture = clone(sideSelection);
  fixture.schemaVersion = CHRONOLOGY_FALLBACK_INVENTORY.schemaVersion;
  fixture.protocolId = CHRONOLOGY_FALLBACK_INVENTORY.protocolId;
  fixture.reviewerRole = CHRONOLOGY_FALLBACK_INVENTORY.reviewerRole(
    fixture.side
  );
  fixture.audit[FALLBACK_AUDIT_KEY] = true;
  fixture.candidateSelections = Object.fromEntries(
    Object.entries(fixture.candidateSelections).map(
      ([candidateId, selection]) => [
        candidateId,
        selection === null
          ? null
          : {
              sectionId: selection.sectionId,
              priorityTier: selection.priorityTier,
              moveId: selection.moveId,
              preferredMoveKind: selection.moveKind,
              orphanFallback: {
                moveKind: CHRONOLOGY_FALLBACK_INVENTORY.fallbackMoveKind,
                rationale:
                  "Development fixture only: preserve the proposition as a standalone constructive move if no earlier opposing move survives deterministic reduction.",
              },
              proposition: selection.proposition,
            },
      ]
    )
  );
  return fixture;
}
