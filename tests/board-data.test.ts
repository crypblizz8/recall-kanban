import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  boardTicketFromTicket,
  createBoardColumns,
  moveBoardTicket,
  upsertBoardTicket,
} from "../app/_components/evidence-desk/data.ts";
import { buildLinearIssueUrl } from "../lib/linear-link.ts";
import type {
  CallSummary,
  Ticket,
} from "../app/_components/evidence-desk/types.ts";

const call: CallSummary = {
  botId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  recordingId: "recording-1",
  platform: "google_meet",
  meetingId: "customer-sync",
  joinedAt: "2026-09-03T00:00:00Z",
  botStatus: "done",
  processingState: "synced",
  error: null,
  segmentCount: 1,
  generation: {
    state: "generated",
    error: null,
    model: "openai/gpt-5.5",
    generatedAt: "2026-09-03T00:01:00Z",
    responseId: "generation-1",
    promptTokens: 10,
    completionTokens: 10,
    totalTokens: 20,
  },
  createdAt: "2026-09-03T00:00:00Z",
  updatedAt: "2026-09-03T00:01:00Z",
};

const ticket: Ticket = {
  id: 42,
  botId: call.botId,
  title: "Keep exports in the selected range",
  description: "The export resets its date range.",
  kind: "bug",
  priority: "p1",
  confidence: 92,
  missingEvidence: [],
  status: "approved",
  evidence: [
    {
      sequence: 0,
      speaker: "Customer",
      startSeconds: 1,
      endSeconds: 2,
      text: "The export resets its range",
    },
  ],
  createdAt: "2026-09-03T00:01:00Z",
  updatedAt: "2026-09-03T00:02:00Z",
};

describe("Board data", () => {
  it("projects an approved persisted ticket into the Board display contract", () => {
    assert.deepEqual(boardTicketFromTicket(ticket, call, "ENG"), {
      id: "ED-42",
      linearUrl: buildLinearIssueUrl(ticket, "ENG"),
      title: ticket.title,
      description: ticket.description,
      priority: "P1",
      kind: "Bug",
      confidence: 92,
      source: "customer-sync",
      evidence: 1,
      evidenceItems: ticket.evidence,
      missingEvidence: [],
      assignee: "Unassigned",
    });
  });

  it("starts persisted tickets in Approved and leaves later workflow columns empty", () => {
    const boardTicket = boardTicketFromTicket(ticket, call);
    const columns = createBoardColumns([boardTicket]);

    assert.deepEqual(columns.map((column) => column.id), [
      "approved",
      "planned",
      "in-progress",
      "resolved",
    ]);
    assert.deepEqual(columns[0].tickets, [boardTicket]);
    assert.deepEqual(columns.slice(1).map((column) => column.tickets), [[], [], []]);
  });

  it("inserts new approved tickets and updates existing tickets in place", () => {
    const boardTicket = boardTicketFromTicket(ticket, call);
    const emptyColumns = createBoardColumns([]);
    const inserted = upsertBoardTicket(emptyColumns, boardTicket);

    assert.deepEqual(inserted[0].tickets, [boardTicket]);

    const planned = moveBoardTicket(inserted, boardTicket.id, "planned");
    const updated = { ...boardTicket, title: "Updated title" };
    const upserted = upsertBoardTicket(planned, updated);

    assert.deepEqual(upserted[0].tickets, []);
    assert.deepEqual(upserted[1].tickets, [updated]);
  });

  it("moves tickets between columns and leaves invalid moves unchanged", () => {
    const boardTicket = boardTicketFromTicket(ticket, call);
    const columns = createBoardColumns([boardTicket]);
    const moved = moveBoardTicket(columns, boardTicket.id, "in-progress");

    assert.deepEqual(moved[0].tickets, []);
    assert.deepEqual(moved[2].tickets, [boardTicket]);
    assert.equal(moveBoardTicket(moved, boardTicket.id, "in-progress"), moved);
    assert.equal(moveBoardTicket(moved, "missing", "resolved"), moved);
  });
});
