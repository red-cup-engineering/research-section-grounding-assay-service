import assert from "node:assert/strict";
import test from "node:test";
import { assayResearchSections } from "../src/assay.mjs";
import { createInvestmentResearchCommittee } from "@red-cup-engineering/investment-research-work-lot-service";
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


function sourceBoundRequest({
  citedReferences = ["urn:evidence:a"],
  facts = [{ id: "fact:x", sourceEvidenceId: "urn:evidence:b", availableAt: "2026-07-21T23:00:00Z" }],
} = {}) {
  const section = {
    symbol: "BLK", horizonDays: 20, expectedExcessReturn: 0.02, confidence: 0.5,
    evidenceReferences: citedReferences, basisFactIds: ["fact:x"], thesis: "bounded",
  };
  const candidate = {
    role: "risk", sections: [section], assumptions: ["bounded"],
    falsifiers: ["source mismatch"], nonClaims: ["not an order"],
  };
  return {
    committee: {
      type: "InvestmentResearchCommitteeResult", version: 1,
      contextProduct: "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      seats: [{ provider: "urn:p:a", role: "risk", candidate, receipt: null }],
      residues: [], providerDistinct: true, committeeComplete: false,
      customerAcceptanceEstablished: false, allocationEstablished: false,
      executionEstablished: false, effect: "untrusted-research-sections-only",
    },
    allowedEvidenceReferences: ["urn:evidence:a", "urn:evidence:b"],
    evidenceFacts: facts,
    universe: ["BLK"], horizonDays: 20, observedAt: "2026-07-22T23:00:00Z",
  };
}

test("refuses a candidate when its fact's actual source is allowed but not cited", () => {
  const original = sourceBoundRequest();
  const refused = assayResearchSections(original);
  assert.equal(refused.admittedSections.length, 0);
  assert.equal(refused.residues.length, 1);
  assert.equal(refused.residues[0].reason, "grounding-or-plausibility-refused");
  assert.deepEqual(refused.four, { positiveEvidence: false, negativeEvidence: true });
  assert.equal(refused.truthEstablished, false);

  // The same identified fact passes only if this very source is cited.
  const cited = assayResearchSections(sourceBoundRequest({ citedReferences: ["urn:evidence:b"] }));
  assert.equal(cited.admittedSections.length, 1);
  assert.equal(cited.residues.length, 0);
  assert.deepEqual(cited.admittedSections[0].basisFactIds, ["fact:x"]);
  assert.deepEqual(cited.admittedSections[0].evidenceReferences, ["urn:evidence:b"]);
  assert.equal(validateResearchSectionGroundingResult(cited).ok, true);
});

test("refuses ambiguous duplicate fact identities; preserves source-free legacy facts", () => {
  const conflicting = sourceBoundRequest({
    citedReferences: ["urn:evidence:a"],
    facts: [
      { id: "fact:x", sourceEvidenceId: "urn:evidence:a" },
      { id: "fact:x", sourceEvidenceId: "urn:evidence:b" },
    ],
  });
  assert.throws(() => assayResearchSections(conflicting), /duplicate-research-fact-id/);
  const legacy = assayResearchSections(sourceBoundRequest({ facts: [{ id: "fact:x" }] }));
  assert.equal(legacy.admittedSections.length, 1);
});

test("the original committee and grounding receiver agree on factual source binding", async () => {
  const request = {
    contextProduct: "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    customerActor: "actor:assay", universe: ["BLK"], horizonDays: 20,
    maxTokensPerSeat: 256, asOf: "2026-10-30T22:00:00Z",
    evidenceReferences: ["urn:evidence:a", "urn:evidence:b"],
    evidenceFacts: [{
      id: "fact:x", metric: "signal", value: 1,
      sourceEvidenceId: "urn:evidence:b",
      availableAt: "2026-10-28T00:00:00Z", evidenceStatus: "supported",
    }],
  };
  let candidate = {
    role: "risk", sections: [{
      symbol: "BLK", horizonDays: 20, expectedExcessReturn: 0.02, confidence: 0.5,
      evidenceReferences: ["urn:evidence:a"], basisFactIds: ["fact:x"], thesis: "bounded",
    }],
    assumptions: ["bounded"], falsifiers: ["source mismatch"], nonClaims: ["not an order"],
  };
  const producer = createInvestmentResearchCommittee({
    roles: [{ id: "risk", objective: "Qualify exact evidence sources" }],
    contractInference: async () => ({ result: { provider: "urn:p:a", candidate } }),
  });
  await assert.rejects(() => producer(request), /committee-seat-schema-binding-invalid/);
  candidate = {
    ...candidate,
    sections: [{ ...candidate.sections[0], evidenceReferences: ["urn:evidence:b"] }],
  };
  const committee = await producer(request);
  const received = assayResearchSections({
    committee, allowedEvidenceReferences: request.evidenceReferences,
    evidenceFacts: request.evidenceFacts, universe: request.universe,
    horizonDays: request.horizonDays, observedAt: request.asOf,
  });
  assert.equal(received.admittedSections.length, 1);
  assert.equal(received.residues.length, 0);
  assert.equal(received.truthEstablished, false);
});


test("source provenance cannot anticipate the assay observation clock", () => {
  const base = { id: "fact:x", sourceEvidenceId: "urn:evidence:b", availableAt: "2026-07-21T23:00:00Z" };
  const context = { citedReferences: ["urn:evidence:b"] };
  const accepted = assayResearchSections(sourceBoundRequest({ ...context, facts: [base] }));
  assert.equal(accepted.admittedSections.length, 1);

  for (const fact of [
    { ...base, availableAt: "2026-07-23T00:00:00Z" },
    { ...base, observedAt: "2026-07-23T00:00:00Z" },
    { ...base, observedAt: "2026-07-20T00:00:00Z" },
    { id: base.id, sourceEvidenceId: base.sourceEvidenceId },
    { id: base.id, availableAt: base.availableAt },
  ]) {
    const result = assayResearchSections(sourceBoundRequest({ ...context, facts: [fact] }));
    assert.equal(result.admittedSections.length, 0);
    assert.equal(result.residues.length, 1);
    assert.equal(result.four.negativeEvidence, true);
  }
  const pastWitness = assayResearchSections(sourceBoundRequest({
    ...context, facts: [{ ...base, observedAt: "2026-07-22T22:00:00Z" }],
  }));
  assert.equal(pastWitness.admittedSections.length, 1);
  const legacy = assayResearchSections(sourceBoundRequest({ facts: [{ id: "fact:x" }] }));
  assert.equal(legacy.admittedSections.length, 1);
});

test("source observation times obey the original schema date-time gate", () => {
  const invalid = sourceBoundRequest({
    citedReferences: ["urn:evidence:b"],
    facts: [{ id: "fact:x", sourceEvidenceId: "urn:evidence:b", availableAt: "2026-02-30T00:00:00Z" }],
  });
  assert.throws(() => assayResearchSections(invalid), /research-section-grounding-request-invalid/);
});
