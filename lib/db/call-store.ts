import "server-only";

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { OpenRouterMetadata } from "../openrouter.ts";
import type { NormalizedTranscriptSegment } from "../recall.ts";
import type { TicketExtraction } from "../ticket-schema.ts";
import type {
  CallInput,
  CallRecord,
  CallWithSegments,
  TicketRecord,
} from "../domain.ts";
import {
  rowToCall,
  rowToEvidence,
  rowToSegment,
  rowToTicket,
  type CallRow,
  type SegmentRow,
  type TicketRow,
} from "./mappers.ts";
import { initializeDatabase } from "./schema.ts";

export class CallStore {
  private db: DatabaseSync;

  constructor(path: string) {
    if (path !== ":memory:") {
      mkdirSync(dirname(path), { recursive: true });
    }

    this.db = new DatabaseSync(path);
    initializeDatabase(this.db);
  }

  /** Insert or replace a call and its transcript segments atomically. */
  saveCall(call: CallInput, segments: NormalizedTranscriptSegment[]): void {
    const now = new Date().toISOString();
    const upsert = this.db.prepare(`
      INSERT INTO calls (
        bot_id, recording_id, platform, meeting_id, joined_at, bot_status,
        processing_state, error, segment_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (bot_id) DO UPDATE SET
        recording_id = excluded.recording_id,
        platform = excluded.platform,
        meeting_id = excluded.meeting_id,
        joined_at = excluded.joined_at,
        bot_status = excluded.bot_status,
        processing_state = excluded.processing_state,
        error = excluded.error,
        segment_count = excluded.segment_count,
        updated_at = excluded.updated_at
    `);
    const deleteSegments = this.db.prepare(
      "DELETE FROM transcript_segments WHERE bot_id = ?",
    );
    const insertSegment = this.db.prepare(`
      INSERT INTO transcript_segments (
        bot_id, sequence, speaker, start_seconds, end_seconds, text
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    this.db.exec("BEGIN");
    try {
      upsert.run(
        call.botId,
        call.recordingId,
        call.platform,
        call.meetingId,
        call.joinedAt,
        call.botStatus,
        call.processingState,
        call.error,
        segments.length,
        now,
        now,
      );
      deleteSegments.run(call.botId);
      segments.forEach((segment, index) => {
        insertSegment.run(
          call.botId,
          index,
          segment.speaker,
          segment.startSeconds,
          segment.endSeconds,
          segment.text,
        );
      });
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  listCalls(): CallRecord[] {
    const rows = this.db
      .prepare(
        "SELECT * FROM calls ORDER BY joined_at DESC NULLS LAST, created_at DESC",
      )
      .all() as unknown as CallRow[];
    return rows.map(rowToCall);
  }

  getCall(botId: string): CallWithSegments | null {
    const row = this.db
      .prepare("SELECT * FROM calls WHERE bot_id = ?")
      .get(botId) as unknown as CallRow | undefined;

    if (!row) {
      return null;
    }

    const segments = (
      this.db
        .prepare(
          `SELECT speaker, start_seconds, end_seconds, text
           FROM transcript_segments WHERE bot_id = ? ORDER BY sequence`,
        )
        .all(botId) as unknown as SegmentRow[]
    ).map(rowToSegment);

    return { ...rowToCall(row), segments, tickets: this.listTickets(botId) };
  }

  private listTickets(botId: string): TicketRecord[] {
    const ticketRows = this.db
      .prepare("SELECT * FROM tickets WHERE bot_id = ? ORDER BY id")
      .all(botId) as unknown as TicketRow[];

    return this.hydrateTickets(ticketRows);
  }

  private hydrateTickets(ticketRows: TicketRow[]): TicketRecord[] {
    const evidenceStatement = this.db.prepare(`
      SELECT ts.sequence, ts.speaker, ts.start_seconds, ts.end_seconds, ts.text
      FROM ticket_evidence te
      JOIN transcript_segments ts
        ON ts.bot_id = te.bot_id AND ts.sequence = te.segment_sequence
      WHERE te.ticket_id = ?
      ORDER BY ts.sequence
    `);

    return ticketRows.map((ticket) => {
      const evidence = (
        evidenceStatement.all(ticket.id) as unknown as Required<SegmentRow>[]
      ).map(rowToEvidence);
      return rowToTicket(ticket, evidence);
    });
  }

  listApprovedTickets(): TicketRecord[] {
    const ticketRows = this.db
      .prepare(`
        SELECT * FROM tickets
        WHERE status = 'approved'
        ORDER BY updated_at DESC, id DESC
      `)
      .all() as unknown as TicketRow[];

    return this.hydrateTickets(ticketRows);
  }

  saveGeneratedTickets(
    botId: string,
    extraction: TicketExtraction,
    metadata: OpenRouterMetadata,
  ): void {
    const now = new Date().toISOString();
    const deleteCandidates = this.db.prepare(
      "DELETE FROM tickets WHERE bot_id = ? AND status = 'candidate'",
    );
    const insertTicket = this.db.prepare(`
      INSERT INTO tickets (
        bot_id, title, description, kind, priority, confidence,
        missing_evidence, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'candidate', ?, ?)
    `);
    const insertEvidence = this.db.prepare(`
      INSERT INTO ticket_evidence (ticket_id, bot_id, segment_sequence)
      VALUES (?, ?, ?)
    `);
    const updateCall = this.db.prepare(`
      UPDATE calls SET
        ticket_generation_state = 'generated',
        ticket_generation_error = NULL,
        ticket_generation_model = ?,
        ticket_generated_at = ?,
        openrouter_response_id = ?,
        openrouter_prompt_tokens = ?,
        openrouter_completion_tokens = ?,
        openrouter_total_tokens = ?,
        updated_at = ?
      WHERE bot_id = ?
    `);

    this.db.exec("BEGIN");
    try {
      const call = this.db
        .prepare("SELECT bot_id FROM calls WHERE bot_id = ?")
        .get(botId);
      if (!call) throw new Error(`Call ${botId} does not exist.`);

      deleteCandidates.run(botId);
      for (const ticket of extraction.tickets) {
        const result = insertTicket.run(
          botId,
          ticket.title,
          ticket.description,
          ticket.kind,
          ticket.priority,
          ticket.confidence,
          JSON.stringify(ticket.missingEvidence),
          now,
          now,
        );
        const ticketId = Number(result.lastInsertRowid);
        for (const sequence of ticket.evidenceSegmentSequences) {
          insertEvidence.run(ticketId, botId, sequence);
        }
      }

      updateCall.run(
        metadata.model,
        now,
        metadata.responseId,
        metadata.promptTokens,
        metadata.completionTokens,
        metadata.totalTokens,
        now,
        botId,
      );
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  recordTicketGenerationFailure(
    botId: string,
    error: string,
    requestedModel: string | null,
  ): void {
    this.db
      .prepare(`
        UPDATE calls SET
          ticket_generation_state = 'failed',
          ticket_generation_error = ?,
          ticket_generation_model = COALESCE(?, ticket_generation_model),
          updated_at = ?
        WHERE bot_id = ?
      `)
      .run(error, requestedModel, new Date().toISOString(), botId);
  }

  hasGeneratedResult(botId: string): boolean {
    const row = this.db
      .prepare("SELECT ticket_generated_at FROM calls WHERE bot_id = ?")
      .get(botId) as unknown as
      | { ticket_generated_at: string | null }
      | undefined;
    return row?.ticket_generated_at != null;
  }

  listApprovedTicketSummaries(
    botId: string,
  ): { title: string; description: string }[] {
    const rows = this.db
      .prepare(`
        SELECT title, description FROM tickets
        WHERE bot_id = ? AND status = 'approved'
        ORDER BY id
      `)
      .all(botId) as unknown as { title: string; description: string }[];
    return rows.map((row) => ({
      title: row.title,
      description: row.description,
    }));
  }

  approveTicket(ticketId: number): TicketRecord | null {
    const result = this.db
      .prepare(`
        UPDATE tickets SET status = 'approved', updated_at = ? WHERE id = ?
      `)
      .run(new Date().toISOString(), ticketId);
    if (result.changes === 0) return null;

    const row = this.db
      .prepare("SELECT bot_id FROM tickets WHERE id = ?")
      .get(ticketId) as unknown as { bot_id: string } | undefined;
    return row
      ? (this.listTickets(row.bot_id).find(
          (ticket) => ticket.id === ticketId,
        ) ?? null)
      : null;
  }

  removeCandidateTicket(ticketId: number): boolean {
    const result = this.db
      .prepare("DELETE FROM tickets WHERE id = ? AND status = 'candidate'")
      .run(ticketId);
    return result.changes > 0;
  }

  /** Bot IDs whose transcript has already been stored successfully. */
  syncedBotIds(): Set<string> {
    const rows = this.db
      .prepare("SELECT bot_id FROM calls WHERE processing_state = 'synced'")
      .all() as unknown as Pick<CallRow, "bot_id">[];
    return new Set(rows.map((row) => row.bot_id));
  }

  countCalls(): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS count FROM calls")
      .get() as unknown as { count: number };
    return row.count;
  }

  close(): void {
    this.db.close();
  }
}
