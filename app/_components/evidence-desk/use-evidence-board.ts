"use client";

import { useCallback, useState } from "react";

import {
  boardTicketFromTicket,
  moveBoardTicket,
  upsertBoardTicket,
} from "./data";
import type {
  BoardColumn,
  BoardStatus,
  CallSummary,
  Ticket,
} from "./types";

export function useEvidenceBoard(
  initialColumns: BoardColumn[],
  linearTeamId: string | null,
) {
  const [columns, setColumns] = useState(() => initialColumns);

  const addApprovedTicket = useCallback(
    (ticket: Ticket, sourceCall: CallSummary) => {
      const boardTicket = boardTicketFromTicket(ticket, sourceCall, linearTeamId);
      setColumns((current) => upsertBoardTicket(current, boardTicket));
    },
    [linearTeamId],
  );

  const moveTicket = useCallback((ticketId: string, targetStatus: BoardStatus) => {
    setColumns((current) => moveBoardTicket(current, ticketId, targetStatus));
  }, []);

  const ticketCount = columns.reduce(
    (total, column) => total + column.tickets.length,
    0,
  );

  return { addApprovedTicket, columns, moveTicket, ticketCount };
}
