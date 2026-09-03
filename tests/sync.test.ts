import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { ensureBootstrapped, syncAllCalls } from "../lib/sync.ts";
import {
  BOT_A,
  BOT_B,
  BOT_C,
  bot,
  memoryStore,
  setEnv,
  stubFetch,
  utterance,
} from "./helpers.ts";

const TRANSCRIPT_A = "https://cdn.example/a.json";
const TRANSCRIPT_C = "https://cdn.example/c.json";

function recallWorld(overrides: { transcriptCStatus?: number } = {}) {
  return stubFetch((url) => {
    if (url.pathname === "/api/v1/bot/") {
      return {
        body: {
          next: null,
          results: [bot(BOT_A, TRANSCRIPT_A), bot(BOT_B, null), bot(BOT_C, TRANSCRIPT_C)],
        },
      };
    }
    if (url.href === TRANSCRIPT_A) {
      return { body: [utterance("Customer", "please add export", 5), utterance("CSM", "noted", 9)] };
    }
    if (url.href === TRANSCRIPT_C) {
      return { status: overrides.transcriptCStatus ?? 200, body: [utterance("Customer", "hello", 1)] };
    }
  });
}

describe("syncAllCalls", () => {
  let stub: ReturnType<typeof stubFetch>;
  beforeEach(setEnv);
  afterEach(() => stub.restore());

  it("stores every finished bot: transcripts, transcript-less, and failures", async () => {
    stub = recallWorld({ transcriptCStatus: 500 });
    const store = memoryStore();

    const result = await syncAllCalls(store);

    assert.deepEqual(
      { ...result, failed: result.failed.map((f) => f.botId) },
      { total: 3, synced: 1, skipped: 0, noTranscript: 1, failed: [BOT_C] },
    );

    const a = store.getCall(BOT_A);
    assert.equal(a?.processingState, "synced");
    assert.equal(a?.recordingId, `rec-${BOT_A.slice(0, 4)}`);
    assert.equal(a?.segmentCount, 2);
    assert.deepEqual(a?.segments.map((s) => s.text), ["please add export", "noted"]);

    assert.equal(store.getCall(BOT_B)?.processingState, "no_transcript");

    const c = store.getCall(BOT_C);
    assert.equal(c?.processingState, "failed");
    assert.match(c?.error ?? "", /Transcript download URL returned an error/);
  });

  it("is idempotent: re-running skips synced bots and retries failed ones", async () => {
    stub = recallWorld({ transcriptCStatus: 500 });
    const store = memoryStore();
    await syncAllCalls(store);
    stub.restore();

    stub = recallWorld();
    const second = await syncAllCalls(store);

    assert.equal(second.skipped, 1, "bot A already synced");
    assert.equal(second.synced, 1, "bot C recovered");
    assert.equal(second.noTranscript, 1, "bot B re-checked");
    assert.equal(second.failed.length, 0);
    assert.equal(store.getCall(BOT_C)?.processingState, "synced");
    assert.equal(store.countCalls(), 3);
    assert.ok(
      !stub.requests.some((r) => r.url === TRANSCRIPT_A),
      "synced transcript must not be re-downloaded",
    );
  });

  it("never sends the Recall API key to transcript download hosts", async () => {
    stub = recallWorld();
    await syncAllCalls(memoryStore());

    const download = stub.requests.find((r) => r.url === TRANSCRIPT_A);
    assert.ok(download);
    assert.equal(download.headers.authorization, undefined);
  });
});

describe("ensureBootstrapped", () => {
  let stub: ReturnType<typeof stubFetch>;
  beforeEach(setEnv);
  afterEach(() => stub.restore());

  it("syncs only when the store is empty", async () => {
    stub = recallWorld();
    const store = memoryStore();

    const first = await ensureBootstrapped(store);
    assert.equal(first?.total, 3);
    const requestsAfterFirst = stub.requests.length;

    const second = await ensureBootstrapped(store);
    assert.equal(second, null);
    assert.equal(stub.requests.length, requestsAfterFirst);
  });
});
