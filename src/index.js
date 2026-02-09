import { parseHydraDocumentation } from "@api-platform/api-doc-parser";
import { resourceToSchema } from "./resource.js";
import { collectionSchema } from "./collection.js";

export { fieldToZod } from "./field.js";
export { resourceToSchema } from "./resource.js";
export { collectionSchema } from "./collection.js";

/**
 * Build Zod schemas from an array of api-doc-parser Resource objects.
 *
 * Two-pass approach to handle circular references via z.lazy():
 * - Pass 1: register placeholder entries in schemaMap
 * - Pass 2: build actual schemas and collection schemas
 *
 * @param {object[]} resources - Array of api-doc-parser Resource objects
 * @returns {{ schemas: object, collections: object }}
 */
export function schemasFromResources(resources) {
  const schemaMap = {};
  const schemas = {};
  const collections = {};

  // Pass 1: register placeholders for lazy resolution
  for (const resource of resources) {
    const name = resource.title || resource.name;
    schemaMap[name] = null;
  }

  // Pass 2: build actual schemas
  for (const resource of resources) {
    const name = resource.title || resource.name;
    const schema = resourceToSchema(resource, schemaMap);
    schemaMap[name] = schema;
    schemas[name] = schema;
  }

  // Build collection schemas
  for (const resource of resources) {
    const name = resource.title || resource.name;
    collections[name] = collectionSchema(schemas[name]);
  }

  return { schemas, collections };
}

/**
 * Fetch and parse API documentation, then generate Zod schemas.
 *
 * @param {string} entrypoint - The API entrypoint URL
 * @param {object} [options] - Options passed to parseHydraDocumentation
 * @returns {Promise<{ schemas: object, collections: object, resources: object[], api: object }>}
 */
export async function createSchemas(entrypoint, options) {
  const { api, response } = await parseHydraDocumentation(entrypoint, options);
  const { schemas, collections } = schemasFromResources(api.resources);
  return { schemas, collections, resources: api.resources, api, response };
}
