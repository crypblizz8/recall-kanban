import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  buildOpenRouterRequest,
  extractTickets,
  OpenRouterError,
} from "../lib/openrouter.ts";
import type { NormalizedTranscriptSegment } from "../lib/recall.ts";

const segments: NormalizedTranscriptSegment[] = [
  { speaker: "Customer", startSeconds: 5, endSeconds: 8, text: "Export resets the date range" },
  { speaker: "CSM", startSeconds: 9, endSeconds: 10, text: "I will report that" },
];

const extraction = {
  schemaVersion: 1,
  tickets: [
    {
      title: "Export keeps the selected date range",
      description: "The dashboard export resets the selected date range.",
      kind: "bug",
      priority: "p1",
      confidence: 91,
      missingEvidence: [],
      evidenceSegmentSequences: [0],
    },
  ],
};

describe("OpenRouter adapter", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
    process.env.OPENROUTER_MODEL = "example/strict-model";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_MODEL;
  });

  it("builds a strict, private request with stable transcript sequences", () => {
    const request = buildOpenRouterRequest(segments, [
      { title: "Existing approved ticket", description: "Do not recreate this." },
    ]);

    assert.equal(request.model, "example/strict-model");
    assert.equal(request.stream, false);
    assert.deepEqual(request.provider, {
      require_parameters: true,
      data_collection: "deny",
    });
    assert.equal(request.response_format.type, "json_schema");
    assert.equal(request.response_format.json_schema.strict, true);
    assert.equal(request.response_format.json_schema.schema.additionalProperties, false);

    const input = JSON.parse(request.messages[1].content);
    assert.deepEqual(input.transcriptSegments.map((segment: { sequence: number }) => segment.sequence), [0, 1]);
    assert.equal(input.approvedTickets[0].title, "Existing approved ticket");
  });

  it("parses a schema-valid response and returns provider metadata", async () => {
    let seenAuthorization: string | null = null;
    let seenSignal: AbortSignal | null = null;
    globalThis.fetch = (async (_input, init) => {
      seenAuthorization = new Headers(init?.headers).get("authorization");
      seenSignal = init?.signal instanceof AbortSignal ? init.signal : null;
      return Response.json({
        id: "generation-1",
        model: "served/model",
        choices: [{ finish_reason: "stop", message: { content: JSON.stringify(extraction) } }],
        usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
      });
    }) as typeof fetch;

    const result = await extractTickets(segments);

    assert.equal(seenAuthorization, "Bearer test-openrouter-key");
    assert.ok(seenSignal);
    assert.equal(result.extraction.tickets[0].title, extraction.tickets[0].title);
    assert.deepEqual(result.metadata, {
      responseId: "generation-1",
      model: "served/model",
      promptTokens: 50,
      completionTokens: 20,
      totalTokens: 70,
    });
  });

  it("maps a local request timeout to a recoverable timeout error", async () => {
    globalThis.fetch = (async () => {
      throw new DOMException("timed out", "TimeoutError");
    }) as typeof fetch;

    await assert.rejects(
      () => extractTickets(segments),
      (error: unknown) =>
        error instanceof OpenRouterError && error.status === 408 && /timed out/i.test(error.message),
    );
  });

  it("rejects evidence references that do not exist in the transcript", async () => {
    globalThis.fetch = (async () =>
      Response.json({
        id: "generation-2",
        model: "served/model",
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: JSON.stringify({
                ...extraction,
                tickets: [{ ...extraction.tickets[0], evidenceSegmentSequences: [99] }],
              }),
            },
          },
        ],
      })) as typeof fetch;

    await assert.rejects(() => extractTickets(segments), /unknown transcript segment 99/i);
  });

  it("rejects malformed envelopes, invalid JSON, and schema-invalid content", async () => {
    const payloads = [
      { id: "generation-3", model: "served/model", choices: [] },
      { id: "generation-4", model: "served/model", choices: [{ message: { content: "not json" } }] },
      {
        id: "generation-5",
        model: "served/model",
        choices: [{ message: { content: JSON.stringify({ ...extraction, extra: true }) } }],
      },
    ];

    for (const payload of payloads) {
      globalThis.fetch = (async () => Response.json(payload)) as typeof fetch;
      await assert.rejects(() => extractTickets(segments), OpenRouterError);
    }
  });

  it("maps actionable upstream failures without exposing provider bodies", async () => {
    const cases = [
      [401, 502, /API key/i],
      [402, 502, /credits/i],
      [408, 408, /timed out/i],
      [413, 413, /larger context window/i],
      [429, 429, /rate limit/i],
      [503, 502, /unavailable/i],
    ] as const;

    for (const [upstreamStatus, appStatus, message] of cases) {
      globalThis.fetch = (async () =>
        Response.json(
          { error: { message: "secret provider detail" } },
          { status: upstreamStatus },
        )) as typeof fetch;

      await assert.rejects(
        () => extractTickets(segments),
        (error: unknown) =>
          error instanceof OpenRouterError &&
          error.status === appStatus &&
          message.test(error.message) &&
          !error.message.includes("secret provider detail"),
      );
    }
  });

  it("requires both server-side configuration values", async () => {
    delete process.env.OPENROUTER_API_KEY;
    await assert.rejects(
      () => extractTickets(segments),
      (error: unknown) => error instanceof OpenRouterError && error.status === 500,
    );

    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
    delete process.env.OPENROUTER_MODEL;
    await assert.rejects(
      () => extractTickets(segments),
      (error: unknown) => error instanceof OpenRouterError && error.status === 500,
    );
  });
});
