import type {
  CallProcessingState,
  CallRecord,
  TicketEvidence,
  TicketGenerationState,
  TicketKind,
  TicketRecord,
  TicketStatus,
} from "../domain.ts";

export type CallRow = {
  bot_id: string;
  recording_id: string | null;
  platform: string | null;
  meeting_id: string | null;
  joined_at: string | null;
  bot_status: string | null;
  processing_state: CallProcessingState;
  error: string | null;
  segment_count: number;
  ticket_generation_state: TicketGenerationState;
  ticket_generation_error: string | null;
  ticket_generation_model: string | null;
  ticket_generated_at: string | null;
  openrouter_response_id: string | null;
  openrouter_prompt_tokens: number | null;
  openrouter_completion_tokens: number | null;
  openrouter_total_tokens: number | null;
  created_at: string;
  updated_at: string;
};

export type SegmentRow = {
  sequence?: number;
  speaker: string;
  start_seconds: number | null;
  end_seconds: number | null;
  text: string;
};

export type TicketRow = {
  id: number;
  bot_id: string;
  title: string;
  description: string;
  kind: TicketKind;
  priority: TicketRecord["priority"];
  confidence: number;
  missing_evidence: string;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
};

export function rowToCall(row: CallRow): CallRecord {
  return {
    botId: row.bot_id,
    recordingId: row.recording_id,
    platform: row.platform,
    meetingId: row.meeting_id,
    joinedAt: row.joined_at,
    botStatus: row.bot_status,
    processingState: row.processing_state,
    error: row.error,
    segmentCount: row.segment_count,
    generation: {
      state: row.ticket_generation_state,
      error: row.ticket_generation_error,
      model: row.ticket_generation_model,
      generatedAt: row.ticket_generated_at,
      responseId: row.openrouter_response_id,
      promptTokens: row.openrouter_prompt_tokens,
      completionTokens: row.openrouter_completion_tokens,
      totalTokens: row.openrouter_total_tokens,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToSegment(row: SegmentRow) {
  return {
    speaker: row.speaker,
    startSeconds: row.start_seconds,
    endSeconds: row.end_seconds,
    text: row.text,
  };
}

export function rowToEvidence(row: Required<SegmentRow>): TicketEvidence {
  return { sequence: row.sequence, ...rowToSegment(row) };
}

export function rowToTicket(
  row: TicketRow,
  evidence: TicketEvidence[],
): TicketRecord {
  let missingEvidence: unknown;
  try {
    missingEvidence = JSON.parse(row.missing_evidence);
  } catch {
    missingEvidence = [];
  }

  return {
    id: row.id,
    botId: row.bot_id,
    title: row.title,
    description: row.description,
    kind: row.kind,
    priority: row.priority,
    confidence: row.confidence,
    missingEvidence: Array.isArray(missingEvidence)
      ? missingEvidence.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
    status: row.status,
    evidence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
