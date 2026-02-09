import { describe, it, expect } from "@jest/globals";
import * as z from "zod/v4";
import {
  fieldToZod,
  resourceToSchema,
  collectionSchema,
  schemasFromResources,
} from "../src/index.js";

// Helper to create a minimal field object
function makeField(overrides) {
  return { name: "test", required: true, ...overrides };
}

// Helper to create a minimal resource object
function makeResource(name, fields, readableFields) {
  return {
    name,
    title: name,
    fields: fields || [],
    readableFields: readableFields || fields || [],
  };
}

describe("fieldToZod", () => {
  it("maps string types to z.string()", () => {
    for (const type of [
      "string",
      "password",
      "byte",
      "binary",
      "hexBinary",
      "base64Binary",
      "duration",
    ]) {
      const schema = fieldToZod(makeField({ type }));
      expect(z.safeParse(schema, "hello").success).toBe(true);
      expect(z.safeParse(schema, 123).success).toBe(false);
    }
  });

  it("maps email to z.string().email()", () => {
    const schema = fieldToZod(makeField({ type: "email" }));
    expect(z.safeParse(schema, "test@example.com").success).toBe(true);
    expect(z.safeParse(schema, "not-an-email").success).toBe(false);
  });

  it("maps url to z.string().url()", () => {
    const schema = fieldToZod(makeField({ type: "url" }));
    expect(z.safeParse(schema, "https://example.com").success).toBe(true);
    expect(z.safeParse(schema, "not-a-url").success).toBe(false);
  });

  it("maps uuid to z.string().uuid()", () => {
    const schema = fieldToZod(makeField({ type: "uuid" }));
    expect(
      z.safeParse(schema, "550e8400-e29b-41d4-a716-446655440000").success
    ).toBe(true);
    expect(z.safeParse(schema, "not-a-uuid").success).toBe(false);
  });

  it("maps integer to z.int()", () => {
    const schema = fieldToZod(makeField({ type: "integer" }));
    expect(z.safeParse(schema, 42).success).toBe(true);
    expect(z.safeParse(schema, 3.14).success).toBe(false);
    expect(z.safeParse(schema, "hello").success).toBe(false);
  });

  it("maps positiveInteger with min 1", () => {
    const schema = fieldToZod(makeField({ type: "positiveInteger" }));
    expect(z.safeParse(schema, 1).success).toBe(true);
    expect(z.safeParse(schema, 0).success).toBe(false);
    expect(z.safeParse(schema, -1).success).toBe(false);
  });

  it("maps negativeInteger with max -1", () => {
    const schema = fieldToZod(makeField({ type: "negativeInteger" }));
    expect(z.safeParse(schema, -1).success).toBe(true);
    expect(z.safeParse(schema, 0).success).toBe(false);
  });

  it("maps nonNegativeInteger with min 0", () => {
    const schema = fieldToZod(makeField({ type: "nonNegativeInteger" }));
    expect(z.safeParse(schema, 0).success).toBe(true);
    expect(z.safeParse(schema, 1).success).toBe(true);
    expect(z.safeParse(schema, -1).success).toBe(false);
  });

  it("maps nonPositiveInteger with max 0", () => {
    const schema = fieldToZod(makeField({ type: "nonPositiveInteger" }));
    expect(z.safeParse(schema, 0).success).toBe(true);
    expect(z.safeParse(schema, -1).success).toBe(true);
    expect(z.safeParse(schema, 1).success).toBe(false);
  });

  it("maps number types to z.number()", () => {
    for (const type of ["number", "decimal", "double", "float"]) {
      const schema = fieldToZod(makeField({ type }));
      expect(z.safeParse(schema, 3.14).success).toBe(true);
      expect(z.safeParse(schema, 42).success).toBe(true);
      expect(z.safeParse(schema, "hello").success).toBe(false);
    }
  });

  it("maps boolean to z.boolean()", () => {
    const schema = fieldToZod(makeField({ type: "boolean" }));
    expect(z.safeParse(schema, true).success).toBe(true);
    expect(z.safeParse(schema, false).success).toBe(true);
    expect(z.safeParse(schema, "true").success).toBe(false);
  });

  it("maps date to z.string().date()", () => {
    const schema = fieldToZod(makeField({ type: "date" }));
    expect(z.safeParse(schema, "2024-01-15").success).toBe(true);
    expect(z.safeParse(schema, "not-a-date").success).toBe(false);
  });

  it("maps dateTime to z.string().datetime()", () => {
    const schema = fieldToZod(makeField({ type: "dateTime" }));
    expect(z.safeParse(schema, "2024-01-15T10:30:00Z").success).toBe(true);
    expect(z.safeParse(schema, "not-a-datetime").success).toBe(false);
  });

  it("maps time to z.string().time()", () => {
    const schema = fieldToZod(makeField({ type: "time" }));
    expect(z.safeParse(schema, "10:30:00").success).toBe(true);
    expect(z.safeParse(schema, "not-a-time").success).toBe(false);
  });

  it("handles reference fields as z.string()", () => {
    const schema = fieldToZod(
      makeField({ reference: { name: "Author", title: "Author" } })
    );
    expect(z.safeParse(schema, "/api/authors/1").success).toBe(true);
    expect(z.safeParse(schema, 123).success).toBe(false);
  });

  it("handles embedded fields with z.lazy()", () => {
    const authorSchema = z.looseObject({
      "@id": z.string(),
      name: z.string(),
    });
    const schemaMap = { Author: authorSchema };

    const schema = fieldToZod(
      makeField({ embedded: { name: "Author", title: "Author" } }),
      schemaMap
    );

    expect(
      z.safeParse(schema, { "@id": "/api/authors/1", name: "Jane" }).success
    ).toBe(true);
  });

  it("handles enum fields", () => {
    const schema = fieldToZod(
      makeField({ enum: ["draft", "published", "archived"] })
    );
    expect(z.safeParse(schema, "draft").success).toBe(true);
    expect(z.safeParse(schema, "published").success).toBe(true);
    expect(z.safeParse(schema, "unknown").success).toBe(false);
  });

  it("handles nullable fields", () => {
    const schema = fieldToZod(makeField({ type: "string", nullable: true }));
    expect(z.safeParse(schema, "hello").success).toBe(true);
    expect(z.safeParse(schema, null).success).toBe(true);
    expect(z.safeParse(schema, 123).success).toBe(false);
  });

  it("handles optional fields (required === false)", () => {
    const schema = fieldToZod(
      makeField({ type: "string", required: false })
    );
    expect(z.safeParse(schema, "hello").success).toBe(true);
    expect(z.safeParse(schema, undefined).success).toBe(true);
  });

  it("handles array fields (maxCardinality !== 1)", () => {
    const schema = fieldToZod(
      makeField({ type: "string", maxCardinality: null })
    );
    expect(z.safeParse(schema, ["a", "b"]).success).toBe(true);
    expect(z.safeParse(schema, "a").success).toBe(false);
  });

  it("defaults unknown types to z.string()", () => {
    const schema = fieldToZod(makeField({ type: "unknownType" }));
    expect(z.safeParse(schema, "hello").success).toBe(true);
  });

  it("uses field.range as fallback for type", () => {
    const schema = fieldToZod(makeField({ range: "integer" }));
    expect(z.safeParse(schema, 42).success).toBe(true);
    expect(z.safeParse(schema, "hello").success).toBe(false);
  });
});

describe("resourceToSchema", () => {
  it("creates a looseObject with @id, @type, and fields", () => {
    const resource = makeResource("Book", [
      makeField({ name: "title", type: "string" }),
      makeField({ name: "isbn", type: "string" }),
      makeField({ name: "pages", type: "integer" }),
    ]);

    const schema = resourceToSchema(resource);

    const result = z.safeParse(schema, {
      "@id": "/api/books/1",
      "@type": "Book",
      title: "The Great Gatsby",
      isbn: "978-0743273565",
      pages: 180,
    });

    expect(result.success).toBe(true);
  });

  it("rejects wrong @type", () => {
    const resource = makeResource("Book", [
      makeField({ name: "title", type: "string" }),
    ]);

    const schema = resourceToSchema(resource);

    const result = z.safeParse(schema, {
      "@id": "/api/books/1",
      "@type": "Author",
      title: "The Great Gatsby",
    });

    expect(result.success).toBe(false);
  });

  it("allows extra properties (looseObject)", () => {
    const resource = makeResource("Book", [
      makeField({ name: "title", type: "string" }),
    ]);

    const schema = resourceToSchema(resource);

    const result = z.safeParse(schema, {
      "@id": "/api/books/1",
      "@type": "Book",
      title: "Test",
      extraField: "should be allowed",
    });

    expect(result.success).toBe(true);
  });

  it("uses readableFields over fields", () => {
    const resource = {
      name: "Book",
      title: "Book",
      fields: [
        makeField({ name: "title", type: "string" }),
        makeField({ name: "secret", type: "string" }),
      ],
      readableFields: [makeField({ name: "title", type: "string" })],
    };

    const schema = resourceToSchema(resource);

    // The schema should only have title from readableFields
    const result = z.safeParse(schema, {
      "@id": "/api/books/1",
      "@type": "Book",
      title: "Test",
    });

    expect(result.success).toBe(true);
  });
});

describe("collectionSchema", () => {
  it("creates a Hydra collection schema", () => {
    const itemSchema = z.looseObject({
      "@id": z.string(),
      "@type": z.literal("Book"),
      title: z.string(),
    });

    const schema = collectionSchema(itemSchema);

    const result = z.safeParse(schema, {
      "@id": "/api/books",
      "@type": "Collection",
      totalItems: 42,
      member: [
        { "@id": "/api/books/1", "@type": "Book", title: "Book One" },
        { "@id": "/api/books/2", "@type": "Book", title: "Book Two" },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("accepts view and search as optional", () => {
    const itemSchema = z.looseObject({
      "@id": z.string(),
      "@type": z.literal("Book"),
    });

    const schema = collectionSchema(itemSchema);

    const result = z.safeParse(schema, {
      "@id": "/api/books",
      "@type": "Collection",
      totalItems: 10,
      member: [],
      view: {
        "@id": "/api/books?page=1",
        "@type": "PartialCollectionView",
        first: "/api/books?page=1",
        last: "/api/books?page=5",
        next: "/api/books?page=2",
      },
      search: {
        "@type": "IriTemplate",
        template: "/api/books{?title}",
        variableRepresentation: "BasicRepresentation",
        mapping: [
          {
            "@type": "IriTemplateMapping",
            variable: "title",
            property: "title",
            required: false,
          },
        ],
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const itemSchema = z.looseObject({
      "@id": z.string(),
    });

    const schema = collectionSchema(itemSchema);

    const result = z.safeParse(schema, {
      "@id": "/api/books",
      "@type": "Collection",
      // missing totalItems and member
    });

    expect(result.success).toBe(false);
  });
});

describe("schemasFromResources", () => {
  it("builds schemas for multiple resources", () => {
    const resources = [
      makeResource("Book", [
        makeField({ name: "title", type: "string" }),
        makeField({ name: "pages", type: "integer" }),
      ]),
      makeResource("Author", [
        makeField({ name: "name", type: "string" }),
        makeField({ name: "email", type: "email" }),
      ]),
    ];

    const { schemas, collections } = schemasFromResources(resources);

    expect(schemas.Book).toBeDefined();
    expect(schemas.Author).toBeDefined();
    expect(collections.Book).toBeDefined();
    expect(collections.Author).toBeDefined();

    const bookResult = z.safeParse(schemas.Book, {
      "@id": "/api/books/1",
      "@type": "Book",
      title: "Test",
      pages: 100,
    });
    expect(bookResult.success).toBe(true);

    const authorResult = z.safeParse(schemas.Author, {
      "@id": "/api/authors/1",
      "@type": "Author",
      name: "Jane Doe",
      email: "jane@example.com",
    });
    expect(authorResult.success).toBe(true);
  });

  it("handles circular references via embedded fields", () => {
    const bookResource = makeResource("Book", [
      makeField({ name: "title", type: "string" }),
      makeField({
        name: "author",
        embedded: { name: "Author", title: "Author" },
      }),
    ]);

    const authorResource = makeResource("Author", [
      makeField({ name: "name", type: "string" }),
      makeField({
        name: "books",
        embedded: { name: "Book", title: "Book" },
        maxCardinality: null,
      }),
    ]);

    const { schemas } = schemasFromResources([bookResource, authorResource]);

    const bookResult = z.safeParse(schemas.Book, {
      "@id": "/api/books/1",
      "@type": "Book",
      title: "Test",
      author: {
        "@id": "/api/authors/1",
        "@type": "Author",
        name: "Jane",
        books: [],
      },
    });
    expect(bookResult.success).toBe(true);
  });

  it("builds collection schemas that validate", () => {
    const resources = [
      makeResource("Book", [
        makeField({ name: "title", type: "string" }),
      ]),
    ];

    const { collections } = schemasFromResources(resources);

    const result = z.safeParse(collections.Book, {
      "@id": "/api/books",
      "@type": "Collection",
      totalItems: 1,
      member: [
        { "@id": "/api/books/1", "@type": "Book", title: "Test" },
      ],
    });

    expect(result.success).toBe(true);
  });
});
