import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  generateTicketsForCall,
  TicketGenerationError,
} from "../lib/ticket-generation.ts";
import { memoryStore } from "./helpers.ts";

const BOT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function storeWithTranscript() {
  const store = memoryStore();
  store.saveCall(
    {
      botId: BOT_ID,
      recordingId: "recording-1",
      platform: "zoom",
      meetingId: "meeting-1",
      joinedAt: "2026-09-03T00:00:00Z",
      botStatus: "done",
      processingState: "synced",
      error: null,
    },
    [{ speaker: "Customer", startSeconds: 1, endSeconds: 2, text: "Please add exports" }],
  );
  return store;
}

function completion() {
  return {
    id: "generation-1",
    model: "served/model",
    choices: [
      {
        finish_reason: "stop",
        message: { content: JSON.stringify({ schemaVersion: 1, tickets: [] }) },
      },
    ],
    usage: { total_tokens: 10 },
  };
}

describe("generateTicketsForCall", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.OPENROUTER_MODEL = "requested/model";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_MODEL;
  });

  it("persists a generation and reuses it without another provider call", async () => {
    const store = storeWithTranscript();
    let requests = 0;
    globalThis.fetch = (async () => {
      requests++;
      return Response.json(completion());
    }) as typeof fetch;

    const first = await generateTicketsForCall(BOT_ID, false, store);
    const second = await generateTicketsForCall(BOT_ID, false, store);

    assert.equal(first.reused, false);
    assert.equal(second.reused, true);
    assert.equal(requests, 1);
    assert.equal(second.call.generation.generatedAt != null, true);
    assert.deepEqual(second.call.tickets, []);
  });

  it("shares one in-flight provider request for the same call", async () => {
    const store = storeWithTranscript();
    let requests = 0;
    globalThis.fetch = (async () => {
      requests++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return Response.json(completion());
    }) as typeof fetch;

    await Promise.all([
      generateTicketsForCall(BOT_ID, false, store),
      generateTicketsForCall(BOT_ID, false, store),
    ]);
    assert.equal(requests, 1);
  });

  it("records provider failures while retaining a prior valid result", async () => {
    const store = storeWithTranscript();
    globalThis.fetch = (async () => Response.json(completion())) as typeof fetch;
    await generateTicketsForCall(BOT_ID, false, store);

    globalThis.fetch = (async () => new Response("down", { status: 503 })) as typeof fetch;
    await assert.rejects(() => generateTicketsForCall(BOT_ID, true, store), /unavailable/i);

    const call = store.getCall(BOT_ID);
    assert.equal(call?.generation.state, "failed");
    assert.ok(call?.generation.generatedAt);
  });

  it("rejects missing calls and calls without a stored transcript", async () => {
    const store = memoryStore();
    await assert.rejects(
      () => generateTicketsForCall(BOT_ID, false, store),
      (error: unknown) => error instanceof TicketGenerationError && error.status === 404,
    );

    store.saveCall(
      {
        botId: BOT_ID,
        recordingId: null,
        platform: "zoom",
        meetingId: "meeting-1",
        joinedAt: null,
        botStatus: "done",
        processingState: "no_transcript",
        error: null,
      },
      [],
    );
    await assert.rejects(
      () => generateTicketsForCall(BOT_ID, false, store),
      (error: unknown) => error instanceof TicketGenerationError && error.status === 409,
    );
  });
});
