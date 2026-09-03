import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";

import { memoryStore } from "./helpers.ts";
import { CallStore } from "../lib/db.ts";
import type { TicketExtraction } from "../lib/ticket-schema.ts";

const BOT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const metadata = {
  responseId: "generation-1",
  model: "served/model",
  promptTokens: 100,
  completionTokens: 40,
  totalTokens: 140,
};

const extraction: TicketExtraction = {
  schemaVersion: 1,
  tickets: [
    {
      title: "Export keeps the selected date range",
      description: "The exported CSV should match the visible dashboard range.",
      kind: "bug",
      priority: "p1",
      confidence: 92,
      missingEvidence: ["Browser version"],
      evidenceSegmentSequences: [0, 1],
    },
  ],
};

function storedCall() {
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
    [
      { speaker: "Customer", startSeconds: 5, endSeconds: 8, text: "Export resets the range" },
      { speaker: "CSM", startSeconds: 9, endSeconds: 10, text: "I will report that" },
    ],
  );
  return store;
}

describe("ticket persistence", () => {
  it("migrates an existing calls database with generation defaults", () => {
    const directory = mkdtempSync(join(tmpdir(), "recall-kanban-migration-"));
    const path = join(directory, "old.db");
    try {
      const legacy = new DatabaseSync(path);
      legacy.exec(`
        CREATE TABLE calls (
          bot_id TEXT PRIMARY KEY,
          recording_id TEXT UNIQUE,
          platform TEXT,
          meeting_id TEXT,
          joined_at TEXT,
          bot_status TEXT,
          processing_state TEXT NOT NULL,
          error TEXT,
          segment_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT INTO calls VALUES (
          '${BOT_ID}', NULL, 'zoom', 'legacy-call', NULL, 'done',
          'no_transcript', NULL, 0, '2026-09-03T00:00:00Z', '2026-09-03T00:00:00Z'
        );
      `);
      legacy.close();

      const store = new CallStore(path);
      assert.equal(store.getCall(BOT_ID)?.generation.state, "not_generated");
      store.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("stores generated tickets and hydrates evidence from transcript segments", () => {
    const store = storedCall();
    store.saveGeneratedTickets(BOT_ID, extraction, metadata);

    const call = store.getCall(BOT_ID);
    assert.equal(call?.generation.state, "generated");
    assert.equal(call?.generation.model, "served/model");
    assert.equal(call?.generation.responseId, "generation-1");
    assert.equal(call?.generation.totalTokens, 140);
    assert.equal(call?.tickets.length, 1);
    assert.equal(call?.tickets[0].status, "candidate");
    assert.deepEqual(call?.tickets[0].missingEvidence, ["Browser version"]);
    assert.deepEqual(
      call?.tickets[0].evidence.map((item) => [item.sequence, item.speaker, item.text]),
      [
        [0, "Customer", "Export resets the range"],
        [1, "CSM", "I will report that"],
      ],
    );
  });

  it("records and reuses a valid zero-ticket generation", () => {
    const store = storedCall();
    store.saveGeneratedTickets(BOT_ID, { schemaVersion: 1, tickets: [] }, metadata);

    assert.equal(store.hasGeneratedResult(BOT_ID), true);
    assert.deepEqual(store.getCall(BOT_ID)?.tickets, []);
  });

  it("replaces candidates while preserving approved tickets", () => {
    const store = storedCall();
    store.saveGeneratedTickets(BOT_ID, extraction, metadata);
    const originalId = store.getCall(BOT_ID)?.tickets[0].id;
    assert.ok(originalId);
    assert.equal(store.approveTicket(originalId)?.status, "approved");

    const replacement: TicketExtraction = {
      schemaVersion: 1,
      tickets: [
        {
          ...extraction.tickets[0],
          title: "New candidate",
          evidenceSegmentSequences: [0],
        },
      ],
    };
    store.saveGeneratedTickets(BOT_ID, replacement, { ...metadata, responseId: "generation-2" });

    const tickets = store.getCall(BOT_ID)?.tickets ?? [];
    assert.equal(tickets.length, 2);
    assert.equal(tickets.find((ticket) => ticket.id === originalId)?.status, "approved");
    assert.equal(tickets.find((ticket) => ticket.title === "New candidate")?.status, "candidate");
    assert.deepEqual(store.listApprovedTicketSummaries(BOT_ID), [
      {
        title: extraction.tickets[0].title,
        description: extraction.tickets[0].description,
      },
    ]);
  });

  it("removes candidates without allowing approved tickets to be deleted", () => {
    const store = storedCall();
    store.saveGeneratedTickets(BOT_ID, extraction, metadata);
    const candidateId = store.getCall(BOT_ID)?.tickets[0].id;
    assert.ok(candidateId);

    assert.equal(store.removeCandidateTicket(candidateId), true);
    assert.deepEqual(store.getCall(BOT_ID)?.tickets, []);
    assert.equal(store.removeCandidateTicket(candidateId), false);

    store.saveGeneratedTickets(BOT_ID, extraction, metadata);
    const approvedId = store.getCall(BOT_ID)?.tickets[0].id;
    assert.ok(approvedId);
    assert.equal(store.approveTicket(approvedId)?.status, "approved");

    assert.equal(store.removeCandidateTicket(approvedId), false);
    assert.equal(store.getCall(BOT_ID)?.tickets[0].status, "approved");
  });

  it("lists only approved tickets across calls with hydrated evidence", () => {
    const store = storedCall();
    const secondBotId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    store.saveGeneratedTickets(BOT_ID, extraction, metadata);
    const approvedId = store.getCall(BOT_ID)?.tickets[0].id;
    assert.ok(approvedId);
    store.approveTicket(approvedId);

    store.saveCall(
      {
        botId: secondBotId,
        recordingId: "recording-2",
        platform: "google_meet",
        meetingId: "meeting-2",
        joinedAt: "2026-09-04T00:00:00Z",
        botStatus: "done",
        processingState: "synced",
        error: null,
      },
      [{ speaker: "Customer", startSeconds: 1, endSeconds: 2, text: "Add search" }],
    );
    store.saveGeneratedTickets(
      secondBotId,
      {
        schemaVersion: 1,
        tickets: [
          {
            ...extraction.tickets[0],
            title: "Add search",
            kind: "feature",
            evidenceSegmentSequences: [0],
          },
        ],
      },
      metadata,
    );

    const approved = store.listApprovedTickets();
    assert.equal(approved.length, 1);
    assert.equal(approved[0].id, approvedId);
    assert.equal(approved[0].status, "approved");
    assert.deepEqual(
      approved[0].evidence.map((item) => item.sequence),
      [0, 1],
    );
  });

  it("rolls back replacement when evidence references cannot be persisted", () => {
    const store = storedCall();
    store.saveGeneratedTickets(BOT_ID, extraction, metadata);

    assert.throws(() =>
      store.saveGeneratedTickets(
        BOT_ID,
        {
          schemaVersion: 1,
          tickets: [{ ...extraction.tickets[0], evidenceSegmentSequences: [99] }],
        },
        metadata,
      ),
    );
    assert.equal(store.getCall(BOT_ID)?.tickets[0].title, extraction.tickets[0].title);
  });

  it("records a generation failure without deleting the last valid result", () => {
    const store = storedCall();
    store.saveGeneratedTickets(BOT_ID, extraction, metadata);
    store.recordTicketGenerationFailure(BOT_ID, "OpenRouter unavailable", "requested/model");

    const call = store.getCall(BOT_ID);
    assert.equal(call?.generation.state, "failed");
    assert.equal(call?.generation.error, "OpenRouter unavailable");
    assert.ok(call?.generation.generatedAt);
    assert.equal(call?.tickets.length, 1);
    assert.equal(store.hasGeneratedResult(BOT_ID), true);
  });
});
