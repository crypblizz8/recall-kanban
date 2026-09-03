import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  TICKET_EXTRACTION_JSON_SCHEMA,
  TicketExtractionSchema,
} from "../lib/ticket-schema.ts";

type JsonSchema = {
  additionalProperties?: boolean;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  uniqueItems?: boolean;
};

const validTicket = {
  title: "Export keeps the selected date range",
  description: "The exported CSV should use the date range visible in the dashboard.",
  kind: "bug",
  priority: "p1",
  confidence: 88,
  missingEvidence: ["Browser version"],
  evidenceSegmentSequences: [0, 2],
} as const;

describe("TicketExtractionSchema", () => {
  it("accepts valid tickets and an empty result", () => {
    assert.equal(
      TicketExtractionSchema.parse({ schemaVersion: 1, tickets: [] }).tickets.length,
      0,
    );
    assert.equal(
      TicketExtractionSchema.parse({ schemaVersion: 1, tickets: [validTicket] })
        .tickets[0].title,
      validTicket.title,
    );
  });

  it("rejects unknown properties, invalid enums, and fractional confidence", () => {
    assert.throws(() =>
      TicketExtractionSchema.parse({
        schemaVersion: 1,
        tickets: [{ ...validTicket, invented: true }],
      }),
    );
    assert.throws(() =>
      TicketExtractionSchema.parse({
        schemaVersion: 1,
        tickets: [{ ...validTicket, priority: "urgent" }],
      }),
    );
    assert.throws(() =>
      TicketExtractionSchema.parse({
        schemaVersion: 1,
        tickets: [{ ...validTicket, confidence: 88.5 }],
      }),
    );
  });

  it("enforces ticket, text, and missing-evidence limits", () => {
    assert.throws(() =>
      TicketExtractionSchema.parse({
        schemaVersion: 1,
        tickets: Array.from({ length: 21 }, () => validTicket),
      }),
    );
    assert.throws(() =>
      TicketExtractionSchema.parse({
        schemaVersion: 1,
        tickets: [{ ...validTicket, title: "x".repeat(121) }],
      }),
    );
    assert.throws(() =>
      TicketExtractionSchema.parse({
        schemaVersion: 1,
        tickets: [
          {
            ...validTicket,
            missingEvidence: ["a", "b", "c", "d", "e", "f"],
          },
        ],
      }),
    );
  });

  it("rejects duplicate, negative, missing, and excessive evidence references", () => {
    for (const evidenceSegmentSequences of [
      [],
      [-1],
      [1, 1],
      [0, 1, 2, 3, 4, 5, 6, 7, 8],
    ]) {
      assert.throws(() =>
        TicketExtractionSchema.parse({
          schemaVersion: 1,
          tickets: [{ ...validTicket, evidenceSegmentSequences }],
        }),
      );
    }
  });

  it("exports a closed JSON Schema for OpenRouter strict mode", () => {
    const root = TICKET_EXTRACTION_JSON_SCHEMA as JsonSchema;
    assert.equal(root.additionalProperties, false);
    const ticket = root.properties?.tickets.items;
    assert.ok(ticket);
    assert.equal(ticket.additionalProperties, false);
    assert.equal(
      ticket.properties?.evidenceSegmentSequences.uniqueItems,
      undefined,
      "OpenAI/Azure strict schemas reject uniqueItems; Zod enforces uniqueness locally",
    );
    assert.deepEqual(ticket.required, [
      "title",
      "description",
      "kind",
      "priority",
      "confidence",
      "missingEvidence",
      "evidenceSegmentSequences",
    ]);
  });
});
