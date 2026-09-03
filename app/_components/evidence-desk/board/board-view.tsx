import { type PointerEvent, useState } from "react";

import styles from "../../../evidence-desk.module.css";
import type { BoardColumn, BoardStatus } from "../types";
import { BoardCard } from "./board-card";
import { BoardTicketModal } from "./board-ticket-modal";

type BoardViewProps = {
  columns: BoardColumn[];
  onMoveTicket: (ticketId: string, status: BoardStatus) => void;
  onReviewCalls: () => void;
};

export function BoardView({ columns, onMoveTicket, onReviewCalls }: BoardViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<BoardStatus | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const tickets = columns.flatMap((column) => column.tickets);
  const openTicketColumn = columns.find((column) =>
    column.tickets.some((ticket) => ticket.id === openTicketId),
  );
  const openTicket = openTicketColumn?.tickets.find((ticket) => ticket.id === openTicketId);
  const highPriorityCount = tickets.filter((ticket) => ticket.priority === "P0" || ticket.priority === "P1").length;
  const evidenceCount = tickets.reduce((total, ticket) => total + ticket.evidence, 0);

  function moveTicket(ticketId: string, targetStatus: BoardStatus) {
    const sourceColumn = columns.find((column) => column.tickets.some((ticket) => ticket.id === ticketId));
    const targetColumn = columns.find((column) => column.id === targetStatus);
    const ticket = sourceColumn?.tickets.find((candidate) => candidate.id === ticketId);

    if (!sourceColumn || !targetColumn || !ticket || sourceColumn.id === targetStatus) return;

    onMoveTicket(ticketId, targetStatus);
    setAnnouncement(`${ticket.title} moved to ${targetColumn.title}`);
  }

  function targetStatusAtPoint(clientX: number, clientY: number) {
    const target = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>("[data-column-id]")?.dataset.columnId as BoardStatus | undefined;

    return columns.some((column) => column.id === target) ? target : undefined;
  }

  function handlePointerDown(event: PointerEvent<HTMLElement>, ticketId: string) {
    if (event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingId(ticketId);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;

    setDropTarget(targetStatusAtPoint(event.clientX, event.clientY) ?? null);
  }

  function finishPointerDrag(event: PointerEvent<HTMLElement>, ticketId: string, shouldMove: boolean) {
    const targetStatus = shouldMove ? targetStatusAtPoint(event.clientX, event.clientY) : undefined;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (targetStatus) moveTicket(ticketId, targetStatus);

    setDraggingId(null);
    setDropTarget(null);
  }

  return (
    <main className={styles.boardView}>
      <header className={styles.boardHeader}>
        <div><p className={styles.breadcrumb}>Workspace / Recall Kanban</p><h1>Support board</h1><p>{tickets.length} evidence-backed tickets</p></div>
      </header>
      <section className={styles.boardSummary} aria-label="Board summary">
        <div><strong>{tickets.length}</strong><span>Total</span></div><div><strong>{highPriorityCount}</strong><span>High priority</span></div><div><strong>{evidenceCount}</strong><span>Evidence links</span></div><p><i /> Board up to date</p>
      </section>
      {tickets.length === 0 ? (
        <section className={styles.boardEmpty} aria-labelledby="empty-board-title">
          <h2 id="empty-board-title">No approved tickets yet</h2>
          <p>Approve a candidate from Calls to add it to this board.</p>
          <button className={styles.primaryButton} type="button" onClick={onReviewCalls}>Review calls</button>
        </section>
      ) : (
        <section className={styles.boardGrid} aria-label="Support ticket board">
          {columns.map((column, columnIndex) => (
            <div
              className={`${styles.boardColumn} ${dropTarget === column.id ? styles.boardColumnActive : ""}`}
              data-column-id={column.id}
              key={column.id}
            >
              <header><span className={`${styles.columnDot} ${styles[column.tone]}`} /><h2>{column.title}</h2><span>{column.tickets.length}</span></header>
              <div className={styles.columnCards}>
                {column.tickets.map((ticket) => (
                  <BoardCard
                    dragging={draggingId === ticket.id}
                    key={ticket.id}
                    nextStatus={columns[columnIndex + 1]?.id}
                    onMove={(status) => moveTicket(ticket.id, status)}
                    onOpen={() => setOpenTicketId(ticket.id)}
                    onPointerCancel={(event) => finishPointerDrag(event, ticket.id, false)}
                    onPointerDown={(event) => handlePointerDown(event, ticket.id)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={(event) => finishPointerDrag(event, ticket.id, true)}
                    previousStatus={columns[columnIndex - 1]?.id}
                    status={column.title}
                    ticket={ticket}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
      <p aria-live="polite" className={styles.srOnly}>{announcement}</p>
      {openTicket && openTicketColumn ? (
        <BoardTicketModal
          key={openTicket.id}
          onClose={() => setOpenTicketId(null)}
          status={openTicketColumn.title}
          ticket={openTicket}
        />
      ) : null}
    </main>
  );
}
