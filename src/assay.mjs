import {
  requireValidGroundingCarrier,
  validateResearchSectionGroundingRequest,
  validateResearchSectionGroundingResult,
} from "./schemas.mjs";

export function assayResearchSections({ committee, allowedEvidenceReferences, evidenceFacts, universe, horizonDays, observedAt, maximumAbsoluteExpectedReturn = 0.1 } = {}) {
  const request = { committee, allowedEvidenceReferences, evidenceFacts, universe, horizonDays, observedAt, maximumAbsoluteExpectedReturn };
  requireValidGroundingCarrier(request, "research-section-grounding-request", validateResearchSectionGroundingRequest);
  const facts = new Set(evidenceFacts.map(({ id }) => id)), evidence = new Set(allowedEvidenceReferences), providers = new Set(), admitted = [], residues = [];
  for (const seat of committee.seats) {
    if (providers.has(seat.provider)) { residues.push({ role: seat.role, provider: seat.provider, reason: "repeated-provider" }); continue; }
    providers.add(seat.provider);
    for (const section of seat.candidate.sections) {
      const valid = universe.includes(section.symbol) && section.horizonDays === horizonDays && Math.abs(Number(section.expectedExcessReturn)) <= maximumAbsoluteExpectedReturn && Number(section.confidence) >= 0 && Number(section.confidence) <= 1 && section.evidenceReferences.every((reference) => evidence.has(reference)) && section.basisFactIds.every((id) => facts.has(id));
      if (!valid) { residues.push({ role: seat.role, provider: seat.provider, symbol: section.symbol, reason: "grounding-or-plausibility-refused" }); continue; }
      admitted.push(Object.freeze({ provider: seat.provider, role: seat.role, symbol: section.symbol, horizonDays, expectedExcessReturn: Number(section.expectedExcessReturn), confidence: Number(section.confidence), observedAt: new Date(observedAt).toISOString(), evidenceReferences: Object.freeze([...section.evidenceReferences]), basisFactIds: Object.freeze([...section.basisFactIds]), status: "model-judgment-admitted-for-descent-not-truth" }));
    }
  }
  const result = { type: "ResearchSectionGroundingAssay", version: 1, admittedSections: Object.freeze(admitted), residues: Object.freeze(residues), four: Object.freeze({ positiveEvidence: admitted.length > 0, negativeEvidence: residues.length > 0 || committee.residues.length > 0 }), truthEstablished: false, allocationEstablished: false, executionEstablished: false, effect: "assay-only" };
  requireValidGroundingCarrier(result, "research-section-grounding-result", validateResearchSectionGroundingResult);
  return Object.freeze(result);
}
