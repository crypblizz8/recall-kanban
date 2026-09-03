import type {
  BoardColumn,
  BoardTicket,
  CallSummary,
  Ticket,
} from "./types";
import { buildLinearIssueUrl } from "../../../lib/linear-link.ts";

const PRIORITY_LABELS = { p0: "P0", p1: "P1", p2: "P2" } as const;
const KIND_LABELS = { bug: "Bug", feature: "Feature", task: "Task" } as const;

const BOARD_COLUMN_DEFINITIONS = [
  { id: "approved", title: "Approved", tone: "violet" },
  { id: "planned", title: "Planned", tone: "amber" },
  { id: "in-progress", title: "In progress", tone: "blue" },
  { id: "resolved", title: "Resolved", tone: "green" },
] as const satisfies ReadonlyArray<Omit<BoardColumn, "tickets">>;

function callSource(call: CallSummary): string {
  if (call.meetingId?.trim()) return call.meetingId;
  if (call.platform?.trim()) return `${call.platform.replaceAll("_", " ")} call`;
  return `Call ${call.botId.slice(0, 8)}`;
}

export function boardTicketFromTicket(
  ticket: Ticket,
  call: CallSummary,
  linearTeamId: string | null = null,
): BoardTicket {
  return {
    id: `ED-${ticket.id}`,
    linearUrl: buildLinearIssueUrl(ticket, linearTeamId),
    title: ticket.title,
    description: ticket.description,
    priority: PRIORITY_LABELS[ticket.priority],
    kind: KIND_LABELS[ticket.kind],
    confidence: ticket.confidence,
    source: callSource(call),
    evidence: ticket.evidence.length,
    evidenceItems: ticket.evidence,
    missingEvidence: ticket.missingEvidence,
    assignee: "Unassigned",
  };
}

export function createBoardColumns(tickets: BoardTicket[]): BoardColumn[] {
  return BOARD_COLUMN_DEFINITIONS.map((column) => ({
    ...column,
    tickets: column.id === "approved" ? tickets : [],
  }));
}

export function upsertBoardTicket(
  columns: BoardColumn[],
  ticket: BoardTicket,
): BoardColumn[] {
  const alreadyPresent = columns.some((column) =>
    column.tickets.some((candidate) => candidate.id === ticket.id),
  );

  return columns.map((column) => {
    if (alreadyPresent) {
      return {
        ...column,
        tickets: column.tickets.map((candidate) =>
          candidate.id === ticket.id ? ticket : candidate,
        ),
      };
    }

    return column.id === "approved"
      ? { ...column, tickets: [ticket, ...column.tickets] }
      : column;
  });
}

export function moveBoardTicket(
  columns: BoardColumn[],
  ticketId: string,
  targetStatus: BoardColumn["id"],
): BoardColumn[] {
  const sourceColumn = columns.find((column) =>
    column.tickets.some((ticket) => ticket.id === ticketId),
  );
  const ticket = sourceColumn?.tickets.find((candidate) => candidate.id === ticketId);

  if (!sourceColumn || !ticket || sourceColumn.id === targetStatus) return columns;

  return columns.map((column) => {
    if (column.id === sourceColumn.id) {
      return {
        ...column,
        tickets: column.tickets.filter((candidate) => candidate.id !== ticketId),
      };
    }
    if (column.id === targetStatus) {
      return { ...column, tickets: [...column.tickets, ticket] };
    }
    return column;
  });
}
