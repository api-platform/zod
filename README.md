# @api-platform/zod

Generate [Zod](https://zod.dev) schemas from [JSON-LD](https://json-ld.org/) / [Hydra](https://www.hydra-cg.com/) API documentation.

This library parses API documentation via [`@api-platform/api-doc-parser`](https://github.com/api-platform/api-doc-parser) and dynamically generates Zod schemas for each resource. It follows the [resilient client pattern](https://soyuka.me/resilient-api-clients-typescript/) — loose objects, IRI references, and runtime validation of only what's needed.

## Installation

```bash
npm install @api-platform/zod zod
```

Requires Zod v4.

## Quick Start

```js
import { createSchemas } from '@api-platform/zod'
import { safeParse } from 'zod/v4'

// Generate schemas from an API entrypoint
const { schemas, collections } = await createSchemas('https://api.example.com')

// schemas.Book -> z.looseObject({ '@id': z.string(), '@type': z.literal('Book'), title: z.string(), ... })
// collections.Book -> Hydra collection schema wrapping Book

// Validate API responses
const result = safeParse(schemas.Book, responseData)
if (result.success) {
  console.log(result.data.title)
}
```

## API

### `createSchemas(entrypoint, options?)`

High-level function that fetches and parses API documentation, then generates Zod schemas.

```js
const { schemas, collections, resources, api, response } = await createSchemas('https://api.example.com')
```

**Parameters:**
- `entrypoint` — The API entrypoint URL
- `options` — Options passed to `parseHydraDocumentation`

**Returns:**
- `schemas` — `{ [ResourceName]: ZodSchema }` for each resource
- `collections` — `{ [ResourceName]: ZodSchema }` Hydra collection schemas
- `resources` — The parsed resource objects from api-doc-parser
- `api` — The full parsed API object
- `response` — The HTTP response

### `schemasFromResources(resources)`

Lower-level function that works with pre-parsed Resource objects (from api-doc-parser). Useful when you already have the parsed API documentation.

```js
import { schemasFromResources } from '@api-platform/zod'

const { schemas, collections } = schemasFromResources(api.resources)
```

### `resourceToSchema(resource, schemaMap?)`

Converts a single api-doc-parser Resource into a `z.looseObject` schema with `@id`, `@type`, and all readable fields.

```js
import { resourceToSchema } from '@api-platform/zod'

const bookSchema = resourceToSchema(bookResource)
```

### `fieldToZod(field, schemaMap?)`

Converts a single api-doc-parser Field into a Zod type.

```js
import { fieldToZod } from '@api-platform/zod'

const zodType = fieldToZod(field)
```

### `collectionSchema(itemSchema)`

Creates a Hydra collection schema wrapping the given item schema.

```js
import { collectionSchema } from '@api-platform/zod'

const booksCollectionSchema = collectionSchema(bookSchema)
```

## Type Mapping

| Field Type | Zod Type |
|---|---|
| `string`, `password`, `byte`, `binary`, `hexBinary`, `base64Binary`, `duration` | `z.string()` |
| `email` | `z.string().email()` |
| `url` | `z.string().url()` |
| `uuid` | `z.string().uuid()` |
| `integer` | `z.int()` |
| `positiveInteger` | `z.int().min(1)` |
| `negativeInteger` | `z.int().max(-1)` |
| `nonNegativeInteger` | `z.int().min(0)` |
| `nonPositiveInteger` | `z.int().max(0)` |
| `number`, `decimal`, `double`, `float` | `z.number()` |
| `boolean` | `z.boolean()` |
| `date` | `z.string().date()` |
| `dateTime` | `z.string().datetime()` |
| `time` | `z.string().time()` |

### Special Cases

- **References** — Rendered as `z.string()` (IRI strings in JSON-LD)
- **Embedded resources** — Resolved via `z.lazy()` to support circular references
- **Enums** — `z.enum([...values])`
- **Nullable fields** — Wrapped with `z.nullable()`
- **Optional fields** (`required: false`) — Wrapped with `z.optional()`
- **Array fields** (`maxCardinality !== 1`) — Wrapped with `z.array()`

## Resilient Client Pattern

Schemas use `z.looseObject()`, which allows unknown properties to pass through without being stripped. This means your client code won't break when the API adds new fields — you validate only the fields you depend on.

```js
// Extra fields in the response are preserved, not stripped
const result = safeParse(schemas.Book, {
  '@id': '/api/books/1',
  '@type': 'Book',
  title: 'The Great Gatsby',
  newFieldAddedLater: 'still available',
})
// result.data.newFieldAddedLater === 'still available'
```

## License

[MIT](./LICENSE)
