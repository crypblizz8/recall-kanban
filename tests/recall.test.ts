import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  findTranscriptRecording,
  getBotMetadata,
  listFinishedBots,
  normalizeTranscript,
  RecallApiError,
} from "../lib/recall.ts";
import { BASE, BOT_A, BOT_B, bot, setEnv, stubFetch, utterance } from "./helpers.ts";

describe("normalizeTranscript", () => {
  it("produces speaker-labelled segments with first/last word timestamps", () => {
    const result = normalizeTranscript(BOT_A, "rec", [
      utterance("Customer", "we need export", 10),
      { participant: {}, words: [{ text: "ok" }] },
    ]);

    assert.equal(result.segmentCount, 2);
    assert.deepEqual(result.segments[0], {
      speaker: "Customer",
      startSeconds: 10,
      endSeconds: 12.5,
      text: "we need export",
    });
    assert.deepEqual(result.segments[1], {
      speaker: "Unknown speaker",
      startSeconds: null,
      endSeconds: null,
      text: "ok",
    });
  });

  it("rejects non-array payloads", () => {
    assert.throws(() => normalizeTranscript(BOT_A, "rec", { nope: true }), RecallApiError);
  });
});

describe("findTranscriptRecording / getBotMetadata", () => {
  it("returns null when no recording has a transcript URL", () => {
    assert.equal(findTranscriptRecording(bot(BOT_A, null)), null);
  });

  it("extracts platform, meeting id, join time and latest status", () => {
    assert.deepEqual(getBotMetadata(bot(BOT_A, null, "analysis_done")), {
      botId: BOT_A,
      platform: "zoom",
      meetingId: `m-${BOT_A.slice(0, 4)}`,
      joinedAt: "2026-09-01T10:00:00Z",
      botStatus: "analysis_done",
    });
  });
});

describe("listFinishedBots", () => {
  let stub: ReturnType<typeof stubFetch>;
  beforeEach(setEnv);
  afterEach(() => stub.restore());

  it("filters to finished statuses and follows cursor pagination", async () => {
    stub = stubFetch((url) => {
      if (url.pathname !== "/api/v1/bot/") return;
      if (url.searchParams.get("cursor") === "p2") {
        return { body: { next: null, results: [bot(BOT_B, null)] } };
      }
      return {
        body: {
          next: `${BASE}/api/v1/bot/?cursor=p2&use_cursor=true`,
          results: [bot(BOT_A, null)],
        },
      };
    });

    const bots = await listFinishedBots();

    assert.deepEqual(bots.map((b) => b.id), [BOT_A, BOT_B]);
    assert.equal(stub.requests.length, 2);
    const first = new URL(stub.requests[0].url);
    assert.deepEqual(first.searchParams.getAll("status"), ["done", "analysis_done"]);
    assert.equal(first.searchParams.get("use_cursor"), "true");
    assert.equal(stub.requests[1].headers.authorization, "Token test-key");
  });

  it("refuses to follow a next link that leaves the Recall host", async () => {
    stub = stubFetch(() => ({
      body: { next: "https://evil.example/steal?x=1", results: [] },
    }));

    await assert.rejects(listFinishedBots(), /Refusing to call non-Recall URL/);
    assert.equal(stub.requests.length, 1);
  });

  it("surfaces upstream errors with their status", async () => {
    stub = stubFetch(() => ({ status: 401, body: "bad token" }));

    await assert.rejects(listFinishedBots(), (error: unknown) => {
      assert.ok(error instanceof RecallApiError);
      assert.equal(error.status, 401);
      return true;
    });
  });
});
