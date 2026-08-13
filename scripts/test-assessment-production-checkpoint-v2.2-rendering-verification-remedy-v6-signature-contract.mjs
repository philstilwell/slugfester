#!/usr/bin/env node

import assert from "node:assert/strict";

import {
  extractCheckpointV22RenderingRemedyV6SignatureHex
} from "./lib/assessment-production-checkpoint-v2.2-rendering-browser-runner-v6.mjs";
import {
  CHECKPOINT_V22_RENDERING_REMEDY_V6_IMAGE_CONTRACT
} from "./lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v6.mjs";

const contract = CHECKPOINT_V22_RENDERING_REMEDY_V6_IMAGE_CONTRACT;
const bytes = Buffer.from(`${contract.signatureHex}cafebabedeadbeef`, "hex");

assert.equal(contract.signatureBytes, 12);
assert.equal(contract.signatureHexCharacters, 24);
assert.equal(contract.signatureHex.length, contract.signatureHexCharacters);
assert.equal(
  extractCheckpointV22RenderingRemedyV6SignatureHex(bytes, contract),
  contract.signatureHex
);
assert.throws(
  () => extractCheckpointV22RenderingRemedyV6SignatureHex(
    bytes,
    { ...contract, signatureBytes: 8 }
  ),
  /contract is invalid/
);
assert.throws(
  () => extractCheckpointV22RenderingRemedyV6SignatureHex(
    bytes.subarray(0, 11),
    contract
  ),
  /contract is invalid/
);

console.log(JSON.stringify({
  status: "remedy-v6-jpeg-signature-contract-passed",
  signatureBytes: contract.signatureBytes,
  signatureHexCharacters: contract.signatureHexCharacters,
  extractedSignatureHex:
    extractCheckpointV22RenderingRemedyV6SignatureHex(bytes, contract)
}, null, 2));
