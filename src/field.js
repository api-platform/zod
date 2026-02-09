import * as z from "zod/v4";

const STRING_TYPES = new Set([
  "string",
  "password",
  "byte",
  "binary",
  "hexBinary",
  "base64Binary",
  "duration",
]);

const INTEGER_TYPES = new Set([
  "integer",
  "positiveInteger",
  "negativeInteger",
  "nonNegativeInteger",
  "nonPositiveInteger",
]);

const NUMBER_TYPES = new Set(["number", "decimal", "double", "float"]);

function integerWithConstraints(fieldType) {
  switch (fieldType) {
    case "positiveInteger":
      return z.int().min(1);
    case "negativeInteger":
      return z.int().max(-1);
    case "nonNegativeInteger":
      return z.int().min(0);
    case "nonPositiveInteger":
      return z.int().max(0);
    default:
      return z.int();
  }
}

function baseTypeToZod(fieldType) {
  if (STRING_TYPES.has(fieldType)) return z.string();
  if (INTEGER_TYPES.has(fieldType)) return integerWithConstraints(fieldType);
  if (NUMBER_TYPES.has(fieldType)) return z.number();

  switch (fieldType) {
    case "email":
      return z.string().email();
    case "url":
      return z.string().url();
    case "uuid":
      return z.string().uuid();
    case "boolean":
      return z.boolean();
    case "date":
      return z.string().date();
    case "dateTime":
      return z.string().datetime();
    case "time":
      return z.string().time();
    default:
      return z.string();
  }
}

/**
 * Convert an api-doc-parser Field to a Zod type.
 *
 * @param {object} field - An api-doc-parser Field object
 * @param {object} schemaMap - Map of resource names to their Zod schemas
 * @returns {z.$ZodType} A Zod schema
 */
export function fieldToZod(field, schemaMap = {}) {
  let schema;

  if (field.enum) {
    schema = z.enum(field.enum);
  } else if (field.reference) {
    schema = z.string();
  } else if (field.embedded) {
    const embeddedName = field.embedded.title || field.embedded.name;
    schema = z.lazy(() => schemaMap[embeddedName]);
  } else {
    const fieldType = field.type || field.range || "string";
    schema = baseTypeToZod(fieldType);
  }

  // Wrap in array if maxCardinality !== 1
  if (field.maxCardinality !== undefined && field.maxCardinality !== 1) {
    const elementType = field.arrayType
      ? baseTypeToZod(field.arrayType)
      : schema;
    schema = z.array(elementType);
  }

  if (field.nullable) {
    schema = z.nullable(schema);
  }

  if (field.required === false) {
    schema = z.optional(schema);
  }

  return schema;
}
