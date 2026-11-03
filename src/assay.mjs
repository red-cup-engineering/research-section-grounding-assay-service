import {
  requireValidGroundingCarrier,
  validateResearchSectionGroundingRequest,
  validateResearchSectionGroundingResult,
} from "./schemas.mjs";

function factAvailableAt(fact, citedReferences, observedAt) {
  if (!fact) return false;
  // Legacy source-free facts remain admissible as unqualified inputs.
  // A provenance claim needs its own source and availability clock.
  const sourced = ["sourceEvidenceId", "sourceUrl", "availableAt", "observedAt",
    "assertionForce", "evidenceStatus"].some(key => fact[key] !== undefined);
  if (!sourced) return true;
  if (!fact.sourceEvidenceId || !citedReferences.includes(fact.sourceEvidenceId) ||
      typeof fact.availableAt !== "string") return false;
  const available = Date.parse(fact.availableAt);
  const received = Date.parse(observedAt);
  if (!Number.isFinite(available) || !Number.isFinite(received) || available > received) return false;
  if (fact.observedAt !== undefined) {
    const witnessed = Date.parse(fact.observedAt);
    if (!Number.isFinite(witnessed) || witnessed < available || witnessed > received) return false;
  }
  return true;
}

export function assayResearchSections({ committee, allowedEvidenceReferences, evidenceFacts, universe, horizonDays, observedAt, maximumAbsoluteExpectedReturn = 0.1 } = {}) {
  const request = { committee, allowedEvidenceReferences, evidenceFacts, universe, horizonDays, observedAt, maximumAbsoluteExpectedReturn };
  requireValidGroundingCarrier(request, "research-section-grounding-request", validateResearchSectionGroundingRequest);
  const facts = new Map();
  // Fact identities must be unambiguous, as at the original committee intake.
  for (const fact of evidenceFacts) {
    if (facts.has(fact.id)) throw new TypeError("duplicate-research-fact-id");
    facts.set(fact.id, fact);
  }
  const evidence = new Set(allowedEvidenceReferences), providers = new Set(), admitted = [], residues = [];
  for (const seat of committee.seats) {
    if (providers.has(seat.provider)) { residues.push({ role: seat.role, provider: seat.provider, reason: "repeated-provider" }); continue; }
    providers.add(seat.provider);
    for (const section of seat.candidate.sections) {
      const valid = universe.includes(section.symbol) && section.horizonDays === horizonDays && Math.abs(Number(section.expectedExcessReturn)) <= maximumAbsoluteExpectedReturn && Number(section.confidence) >= 0 && Number(section.confidence) <= 1 && section.evidenceReferences.every((reference) => evidence.has(reference)) && section.basisFactIds.every((id) => {
        const fact = facts.get(id);
        // A different permitted evidence reference cannot stand in for this
        // fact's identified source. Match the committee producer's law.
        return factAvailableAt(fact, section.evidenceReferences, observedAt);
      });
      if (!valid) { residues.push({ role: seat.role, provider: seat.provider, symbol: section.symbol, reason: "grounding-or-plausibility-refused" }); continue; }
      admitted.push(Object.freeze({ provider: seat.provider, role: seat.role, symbol: section.symbol, horizonDays, expectedExcessReturn: Number(section.expectedExcessReturn), confidence: Number(section.confidence), observedAt: new Date(observedAt).toISOString(), evidenceReferences: Object.freeze([...section.evidenceReferences]), basisFactIds: Object.freeze([...section.basisFactIds]), status: "model-judgment-admitted-for-descent-not-truth" }));
    }
  }
  const result = { type: "ResearchSectionGroundingAssay", version: 1, admittedSections: Object.freeze(admitted), residues: Object.freeze(residues), four: Object.freeze({ positiveEvidence: admitted.length > 0, negativeEvidence: residues.length > 0 || committee.residues.length > 0 }), truthEstablished: false, allocationEstablished: false, executionEstablished: false, effect: "assay-only" };
  requireValidGroundingCarrier(result, "research-section-grounding-result", validateResearchSectionGroundingResult);
  return Object.freeze(result);
}
