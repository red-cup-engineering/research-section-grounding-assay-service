import assert from "node:assert/strict";
import test from "node:test";
import { assayResearchSections } from "../src/assay.mjs";
import { RESEARCH_SECTION_GROUNDING_CARRIER_ASSERTIONS, validateResearchSectionGroundingResult } from "../src/schemas.mjs";

test("admits exact grounded model judgments and refuses invented references", () => {
  const base = { role: "risk", sections: [{ symbol: "BLK", horizonDays: 20, expectedExcessReturn: 0.02, confidence: 0.5, evidenceReferences: ["urn:evidence"], basisFactIds: ["fact:ir"], thesis: "bounded" }], assumptions: ["bounded"], falsifiers: ["loss"], nonClaims: ["not an order"] };
  const committee = {
    type: "InvestmentResearchCommitteeResult", version: 1,
    contextProduct: "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    seats: [
      { provider: "urn:p:a", role: "risk", candidate: base, receipt: null },
      { provider: "urn:p:b", role: "quant", candidate: { ...base, role: "quant", sections: [{ ...base.sections[0], evidenceReferences: ["urn:invented"] }] }, receipt: null },
    ],
    residues: [], providerDistinct: true, committeeComplete: false,
    customerAcceptanceEstablished: false, allocationEstablished: false, executionEstablished: false,
    effect: "untrusted-research-sections-only",
  };
  const result = assayResearchSections({ committee, allowedEvidenceReferences: ["urn:evidence"], evidenceFacts: [{ id: "fact:ir" }], universe: ["BLK"], horizonDays: 20, observedAt: "2026-07-22T23:00:00Z" });
  assert.equal(result.admittedSections.length, 1);
  assert.equal(result.residues.length, 1);
  assert.deepEqual(result.four, { positiveEvidence: true, negativeEvidence: true });
  assert.equal(result.truthEstablished, false);
  assert.equal(validateResearchSectionGroundingResult(result).ok, true);
  assert.ok(RESEARCH_SECTION_GROUNDING_CARRIER_ASSERTIONS.length > 50);
});

test("refuses malformed receiver JSON before grounding", () => {
  assert.throws(() => assayResearchSections({ committee: {}, allowedEvidenceReferences: [], evidenceFacts: [], universe: ["BLK"], horizonDays: 20, observedAt: "not-a-date" }), /research-section-grounding-request-invalid/);
});
