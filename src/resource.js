import { z } from "zod/v4";
import { fieldToZod } from "./field.js";

/**
 * Convert an api-doc-parser Resource to a Zod looseObject schema.
 *
 * @param {object} resource - An api-doc-parser Resource object
 * @param {object} schemaMap - Map of resource names to their Zod schemas
 * @returns {z.$ZodObject} A Zod looseObject schema
 */
export function resourceToSchema(resource, schemaMap = {}) {
  const typeName = resource.title || resource.name;
  const fields = resource.readableFields || resource.fields || [];

  const shape = {
    "@id": z.string(),
    "@type": z.literal(typeName),
  };

  for (const field of fields) {
    const name = field.name;
    shape[name] = fieldToZod(field, schemaMap);
  }

  return z.looseObject(shape);
}
