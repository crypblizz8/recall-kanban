import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { generateCallTickets } from "../app/_components/evidence-desk/api.ts";

const BOT_ID = "e707b347-8a1d-4d1c-8b25-4e9cc732e5d9";

describe("generateCallTickets", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("recovers a persisted generation after the POST response connection is lost", async () => {
    let requests = 0;
    globalThis.fetch = (async (input) => {
      requests++;
      const url = String(input);

      if (requests === 1) {
        assert.match(url, /tickets\/generate$/);
        throw new TypeError("Failed to fetch");
      }
      if (requests === 2) {
        assert.equal(url, `/api/calls/${BOT_ID}`);
        throw new TypeError("Failed to fetch");
      }

      return Response.json({
        botId: BOT_ID,
        generation: {
          state: "generated",
          error: null,
          model: "openai/gpt-5.5",
          generatedAt: "2026-09-03T16:50:39.896Z",
          responseId: "generation-1",
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
        tickets: [{ id: 4, title: "Recovered ticket" }],
      });
    }) as typeof fetch;

    const result = await generateCallTickets(BOT_ID, false, null);

    assert.equal(requests, 3);
    assert.equal(result.generation.generatedAt, "2026-09-03T16:50:39.896Z");
    assert.equal(result.tickets[0]?.title, "Recovered ticket");
  });

  it("does not mistake an unchanged prior generation for a successful regeneration", async () => {
    globalThis.fetch = (async (input) => {
      const url = String(input);
      if (url.endsWith("/tickets/generate")) {
        throw new TypeError("Failed to fetch");
      }

      return Response.json({
        botId: BOT_ID,
        generation: {
          state: "generated",
          error: null,
          model: "openai/gpt-5.5",
          generatedAt: "2026-09-03T16:00:00.000Z",
          responseId: "old-generation",
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
        tickets: [],
      });
    }) as typeof fetch;

    await assert.rejects(
      () => generateCallTickets(BOT_ID, true, "2026-09-03T16:00:00.000Z"),
      /Failed to fetch/,
    );
  });
});
