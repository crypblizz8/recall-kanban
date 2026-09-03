export type View = "calls" | "board";

export type TicketGeneration = {
  state: "not_generated" | "generated" | "failed";
  error: string | null;
  model: string | null;
  generatedAt: string | null;
  responseId: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
};

export type CallSummary = {
  botId: string;
  recordingId: string | null;
  platform: string | null;
  meetingId: string | null;
  joinedAt: string | null;
  botStatus: string | null;
  processingState: "synced" | "no_transcript" | "failed";
  error: string | null;
  segmentCount: number;
  generation: TicketGeneration;
  createdAt: string;
  updatedAt: string;
};

export type TranscriptSegment = {
  speaker: string;
  startSeconds: number | null;
  endSeconds: number | null;
  text: string;
};

export type TicketEvidence = TranscriptSegment & {
  sequence: number;
};

export type Ticket = {
  id: number;
  botId: string;
  title: string;
  description: string;
  kind: "bug" | "feature" | "task";
  priority: "p0" | "p1" | "p2";
  confidence: number;
  missingEvidence: string[];
  status: "candidate" | "approved";
  evidence: TicketEvidence[];
  createdAt: string;
  updatedAt: string;
};

export type CallDetail = CallSummary & {
  segments: TranscriptSegment[];
  tickets: Ticket[];
};

export type BoardTicket = {
  id: string;
  linearUrl: string;
  title: string;
  description: string;
  priority: "P0" | "P1" | "P2";
  kind: "Bug" | "Feature" | "Task";
  confidence: number;
  source: string;
  evidence: number;
  evidenceItems: TicketEvidence[];
  missingEvidence: string[];
  assignee: string;
};

export type BoardStatus = "approved" | "planned" | "in-progress" | "resolved";

export type BoardColumn = {
  id: BoardStatus;
  title: string;
  tone: string;
  tickets: BoardTicket[];
};
