import { readFileSync } from "node:fs";
import { admitSchema } from "@red-cup-engineering/json-schema-services-section/admit-schema";
import { unfoldSchema } from "@red-cup-engineering/json-schema-services-section/unfold-schema";
import { validateSchemaInstance } from "@red-cup-engineering/json-schema-services-section/validate-schema-instance";
import { INVESTMENT_RESEARCH_RESULT_CARRIER } from "@red-cup-engineering/investment-research-work-lot-service/schemas";

const load = (name) => admitSchema({ schema: JSON.parse(readFileSync(new URL(`../schemas/${name}`, import.meta.url), "utf8")) });

export const RESEARCH_SECTION_GROUNDING_REQUEST_CARRIER = load("research-section-grounding-request.schema.json");
export const RESEARCH_SECTION_GROUNDING_REFUSAL_CARRIER = load("research-section-grounding-refusal.schema.json");
export const RESEARCH_SECTION_GROUNDING_RESULT_CARRIER = load("research-section-grounding-result.schema.json");

const corpus = Object.freeze([
  INVESTMENT_RESEARCH_RESULT_CARRIER.schema,
  RESEARCH_SECTION_GROUNDING_REQUEST_CARRIER.schema,
  RESEARCH_SECTION_GROUNDING_REFUSAL_CARRIER.schema,
  RESEARCH_SECTION_GROUNDING_RESULT_CARRIER.schema,
]);

export const RESEARCH_SECTION_GROUNDING_CARRIER_ASSERTIONS = Object.freeze([
  RESEARCH_SECTION_GROUNDING_REQUEST_CARRIER,
  RESEARCH_SECTION_GROUNDING_REFUSAL_CARRIER,
  RESEARCH_SECTION_GROUNDING_RESULT_CARRIER,
].flatMap(({ schema, identity }) => unfoldSchema({ schema, base: schema.$id, time: identity.ni }).assertions));

export const validateResearchSectionGroundingRequest = (value) => validateSchemaInstance({ instance: value, schema: RESEARCH_SECTION_GROUNDING_REQUEST_CARRIER.schema, schemas: corpus });
export const validateResearchSectionGroundingResult = (value) => validateSchemaInstance({ instance: value, schema: RESEARCH_SECTION_GROUNDING_RESULT_CARRIER.schema, schemas: corpus });

export function requireValidGroundingCarrier(value, name, validator) {
  const verdict = validator(value);
  if (!verdict.ok) throw new TypeError(`${name}-invalid:${verdict.errors.map(({ pointer, keyword }) => `${pointer || "/"}:${keyword}`).join(",")}`);
  return value;
}
