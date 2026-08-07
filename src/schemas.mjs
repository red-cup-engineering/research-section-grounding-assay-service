import { readFileSync } from "node:fs";
import { createSchema, schemaCorpus, unfoldSchema, validateInstance } from "@red-cup-engineering/json-schema-services-section";
import { INVESTMENT_RESEARCH_RESULT_CARRIER } from "@rsc-quiescent/investment-research-work-lot-service/schemas";

const load = (name) => createSchema(JSON.parse(readFileSync(new URL(`../schemas/${name}`, import.meta.url), "utf8")));

export const RESEARCH_SECTION_GROUNDING_REQUEST_CARRIER = load("research-section-grounding-request.schema.json");
export const RESEARCH_SECTION_GROUNDING_REFUSAL_CARRIER = load("research-section-grounding-refusal.schema.json");
export const RESEARCH_SECTION_GROUNDING_RESULT_CARRIER = load("research-section-grounding-result.schema.json");

const corpus = schemaCorpus([
  INVESTMENT_RESEARCH_RESULT_CARRIER.schema,
  RESEARCH_SECTION_GROUNDING_REQUEST_CARRIER.schema,
  RESEARCH_SECTION_GROUNDING_REFUSAL_CARRIER.schema,
  RESEARCH_SECTION_GROUNDING_RESULT_CARRIER.schema,
]);

export const RESEARCH_SECTION_GROUNDING_CARRIER_ASSERTIONS = Object.freeze([
  RESEARCH_SECTION_GROUNDING_REQUEST_CARRIER,
  RESEARCH_SECTION_GROUNDING_REFUSAL_CARRIER,
  RESEARCH_SECTION_GROUNDING_RESULT_CARRIER,
].flatMap(({ schema, identity }) => unfoldSchema(schema, { base: schema.$id, t: identity.ni })));

export const validateResearchSectionGroundingRequest = (value) => validateInstance(value, RESEARCH_SECTION_GROUNDING_REQUEST_CARRIER.schema, corpus);
export const validateResearchSectionGroundingResult = (value) => validateInstance(value, RESEARCH_SECTION_GROUNDING_RESULT_CARRIER.schema, corpus);

export function requireValidGroundingCarrier(value, name, validator) {
  const verdict = validator(value);
  if (!verdict.ok) throw new TypeError(`${name}-invalid:${verdict.errors.map(({ pointer, keyword }) => `${pointer || "/"}:${keyword}`).join(",")}`);
  return value;
}
