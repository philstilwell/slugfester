import {
  buildV422116JudgmentPacket,
  flattenV422116Bridges,
  makeV422116JudgmentSchema,
} from "./v422116-decomposed-consensus.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

const clone = (value) => structuredClone(value);
const ref = (name) => ({ $ref: `#/$defs/${name}` });
const same = (left, right) => canonicalJson(left) === canonicalJson(right);

export function stripV223SchemaDescriptions(value) {
  if (Array.isArray(value)) return value.map(stripV223SchemaDescriptions);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "description")
      .map(([key, child]) => [key, stripV223SchemaDescriptions(child)])
  );
}

export function makeV223CompactJudgmentPacket(lockedInventory, reviewerPass) {
  const packet = buildV422116JudgmentPacket(lockedInventory, reviewerPass);
  const bridges = new Map(
    flattenV422116Bridges(lockedInventory.routes).map((bridge) => [
      bridge.bridgeId,
      bridge,
    ])
  );
  let redundantLabelBytesRemoved = 0;
  packet.burdenContactOptions = packet.burdenContactOptions.map((option) => {
    if (option.burdenContact === null) {
      assertV4(
        option.label === "No express contact with an eligible burden bridge",
        "null burden-contact label is not deterministically redundant"
      );
    } else {
      const bridge = bridges.get(option.burdenContact.bridgeId);
      assertV4(
        bridge &&
          option.label ===
            `${option.burdenContact.polarity} ${bridge.tier} bridge ${bridge.bridgeId}: ${bridge.description}`,
        `${option.code}: burden-contact label is not deterministically redundant`
      );
    }
    redundantLabelBytesRemoved += Buffer.byteLength(
      `${JSON.stringify("label")}:${JSON.stringify(option.label)},`
    );
    const { label: _redundantLabel, ...retained } = option;
    return retained;
  });
  return {
    packet,
    audit: {
      transformation:
        "remove-only-deterministically-reconstructable-burden-contact-labels",
      burdenContactCodesChanged: 0,
      burdenContactMappingsChanged: 0,
      lockedInventoryChanged: false,
      judgmentBoundaryChanged: false,
      runtimeValidationChanged: false,
      redundantLabelBytesRemoved,
    },
  };
}

export function makeV223CompactJudgmentSchema({ packet } = {}) {
  const schema = makeV422116JudgmentSchema({ packet });
  const moveProperties = schema.properties.moveJudgments.properties;
  const moves = packet.lockedInventory.moves;
  assertV4(
    moves.length > 0 && Object.keys(moveProperties).length === moves.length,
    "compact judgment schema requires every locked move"
  );
  const firstMoveSchema = moveProperties[moves[0].moveId];
  const firstConstructive = moves.find((move) => move.moveKind === "constructive");
  const firstReply = moves.find((move) => move.moveKind === "reply");
  assertV4(firstConstructive && firstReply, "compact schema requires constructive and reply moves");
  const constructiveResponse =
    moveProperties[firstConstructive.moveId].properties.response;
  const replyResponse = moveProperties[firstReply.moveId].properties.response;

  const interned = {
    v223Importance: clone(firstMoveSchema.properties.importance),
    v223Ratings: clone(firstMoveSchema.properties.ratings),
    v223EvidenceBasis: clone(firstMoveSchema.properties.evidenceBasis),
    v223AssessmentConfidence: clone(
      firstMoveSchema.properties.assessmentConfidence
    ),
    v223ConstructiveResponse: clone(constructiveResponse),
    v223ReplyResponseMode: clone(replyResponse.properties.responseMode),
    v223ReplyIssueBearing: clone(
      replyResponse.properties.issueBearingContraryMaterial
    ),
    v223ReplyRationale: clone(replyResponse.properties.rationale),
    v223BurdenAdjustmentSide: clone(
      schema.properties.burdenCompletionAdjustment.properties.pro
    ),
    v223True: { type: "boolean", const: true },
    v223False: { type: "boolean", const: false },
  };
  Object.assign(schema.$defs, interned);

  let replacements = 0;
  for (const move of moves) {
    const properties = moveProperties[move.moveId].properties;
    for (const [property, definition] of [
      ["importance", interned.v223Importance],
      ["ratings", interned.v223Ratings],
      ["evidenceBasis", interned.v223EvidenceBasis],
      ["assessmentConfidence", interned.v223AssessmentConfidence],
    ]) {
      assertV4(
        same(properties[property], definition),
        `${move.moveId}.${property}: supposedly shared schema drifted`
      );
      properties[property] = ref(
        {
          importance: "v223Importance",
          ratings: "v223Ratings",
          evidenceBasis: "v223EvidenceBasis",
          assessmentConfidence: "v223AssessmentConfidence",
        }[property]
      );
      replacements += 1;
    }
    if (move.moveKind === "constructive") {
      assertV4(
        same(properties.response, interned.v223ConstructiveResponse),
        `${move.moveId}.response: constructive schema drifted`
      );
      properties.response = ref("v223ConstructiveResponse");
      replacements += 1;
    } else {
      for (const [property, definition, name] of [
        ["responseMode", interned.v223ReplyResponseMode, "v223ReplyResponseMode"],
        [
          "issueBearingContraryMaterial",
          interned.v223ReplyIssueBearing,
          "v223ReplyIssueBearing",
        ],
        ["rationale", interned.v223ReplyRationale, "v223ReplyRationale"],
      ]) {
        assertV4(
          same(properties.response.properties[property], definition),
          `${move.moveId}.response.${property}: supposedly shared schema drifted`
        );
        properties.response.properties[property] = ref(name);
        replacements += 1;
      }
    }
  }

  const adjustment = schema.properties.burdenCompletionAdjustment.properties;
  assertV4(
    same(adjustment.pro, interned.v223BurdenAdjustmentSide) &&
      same(adjustment.con, interned.v223BurdenAdjustmentSide),
    "burden adjustment sides are not semantically identical"
  );
  adjustment.pro = ref("v223BurdenAdjustmentSide");
  adjustment.con = ref("v223BurdenAdjustmentSide");
  replacements += 2;

  for (const property of Object.values(schema.properties.audit.properties)) {
    assertV4(same(property, interned.v223True), "audit assertion drifted");
    Object.keys(property).forEach((key) => delete property[key]);
    Object.assign(property, ref("v223True"));
    replacements += 1;
  }
  for (const [name, property] of Object.entries(
    schema.properties.isolation.properties
  )) {
    const definition =
      name === "contaminationDetected" ? interned.v223False : interned.v223True;
    assertV4(same(property, definition), `${name}: isolation assertion drifted`);
    Object.keys(property).forEach((key) => delete property[key]);
    Object.assign(
      property,
      ref(name === "contaminationDetected" ? "v223False" : "v223True")
    );
    replacements += 1;
  }

  return {
    schema,
    audit: {
      transformation: "identical-json-schema-subtree-interning-only",
      validationKeywordsRemoved: 0,
      validationKeywordsRelaxed: 0,
      modelWritableFieldsChanged: 0,
      targetEnumsChanged: 0,
      targetEnumsStillEarlierOpposingOnly: true,
      runtimeValidationChanged: false,
      internedDefinitions: Object.keys(interned),
      replacements,
    },
  };
}
