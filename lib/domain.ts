import type { NormalizedTranscriptSegment } from "./recall.ts";

export type CallProcessingState = "synced" | "no_transcript" | "failed";
export type TicketGenerationState = "not_generated" | "generated" | "failed";
export type TicketStatus = "candidate" | "approved";
export type TicketKind = "bug" | "feature" | "task";
export type TicketPriority = "p0" | "p1" | "p2";

export type TicketGeneration = {
  state: TicketGenerationState;
  error: string | null;
  model: string | null;
  generatedAt: string | null;
  responseId: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
};

export type TicketEvidence = NormalizedTranscriptSegment & {
  sequence: number;
};

export type TicketRecord = {
  id: number;
  botId: string;
  title: string;
  description: string;
  kind: TicketKind;
  priority: TicketPriority;
  confidence: number;
  missingEvidence: string[];
  status: TicketStatus;
  evidence: TicketEvidence[];
  createdAt: string;
  updatedAt: string;
};

export type CallRecord = {
  botId: string;
  recordingId: string | null;
  platform: string | null;
  meetingId: string | null;
  joinedAt: string | null;
  botStatus: string | null;
  processingState: CallProcessingState;
  error: string | null;
  segmentCount: number;
  generation: TicketGeneration;
  createdAt: string;
  updatedAt: string;
};

export type CallInput = Omit<
  CallRecord,
  "segmentCount" | "generation" | "createdAt" | "updatedAt"
>;

export type CallWithSegments = CallRecord & {
  segments: NormalizedTranscriptSegment[];
  tickets: TicketRecord[];
};
