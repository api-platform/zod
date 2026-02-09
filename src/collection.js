import * as z from "zod/v4";

/**
 * Create a Hydra collection schema wrapping the given item schema.
 *
 * Uses unprefixed keys (API Platform typically compacts the response).
 *
 * @param {z.$ZodType} itemSchema - The Zod schema for collection members
 * @returns {z.$ZodObject} A Zod looseObject representing a Hydra collection
 */
export function collectionSchema(itemSchema) {
  return z.looseObject({
    "@id": z.string(),
    "@type": z.string(),
    totalItems: z.int(),
    member: z.array(itemSchema),
    view: z.optional(
      z.looseObject({
        "@id": z.string(),
        "@type": z.string(),
        first: z.optional(z.string()),
        last: z.optional(z.string()),
        previous: z.optional(z.string()),
        next: z.optional(z.string()),
      })
    ),
    search: z.optional(
      z.looseObject({
        "@type": z.string(),
        template: z.optional(z.string()),
        variableRepresentation: z.optional(z.string()),
        mapping: z.optional(
          z.array(
            z.looseObject({
              "@type": z.string(),
              variable: z.string(),
              property: z.optional(z.nullable(z.string())),
              required: z.optional(z.boolean()),
            })
          )
        ),
      })
    ),
  });
}
