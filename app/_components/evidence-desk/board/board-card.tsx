import { useRef, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";

import styles from "../../../evidence-desk.module.css";
import type { BoardStatus, BoardTicket } from "../types";

type BoardCardProps = {
  ticket: BoardTicket;
  status: string;
  dragging: boolean;
  previousStatus?: BoardStatus;
  nextStatus?: BoardStatus;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onMove: (status: BoardStatus) => void;
  onOpen: () => void;
};

export function BoardCard({
  ticket,
  status,
  dragging,
  previousStatus,
  nextStatus,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onMove,
  onOpen,
}: BoardCardProps) {
  const pointerOrigin = useRef<{ x: number; y: number } | null>(null);
  const didDrag = useRef(false);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!event.repeat) onOpen();
      return;
    }

    const targetStatus = event.key === "ArrowLeft" ? previousStatus : event.key === "ArrowRight" ? nextStatus : undefined;

    if (!targetStatus) return;

    event.preventDefault();
    onMove(targetStatus);
  }

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    pointerOrigin.current = { x: event.clientX, y: event.clientY };
    didDrag.current = false;
    onPointerDown(event);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (pointerOrigin.current) {
      const distance = Math.hypot(
        event.clientX - pointerOrigin.current.x,
        event.clientY - pointerOrigin.current.y,
      );
      if (distance > 6) didDrag.current = true;
    }
    onPointerMove(event);
  }

  function handlePointerUp(event: PointerEvent<HTMLElement>) {
    pointerOrigin.current = null;
    onPointerUp(event);
  }

  function handlePointerCancel(event: PointerEvent<HTMLElement>) {
    pointerOrigin.current = null;
    didDrag.current = true;
    onPointerCancel(event);
  }

  function handleClick(event: MouseEvent<HTMLElement>) {
    if (didDrag.current) {
      didDrag.current = false;
      event.preventDefault();
      return;
    }

    onOpen();
  }

  return (
    <article
      aria-label={`${ticket.title}, ${status}`}
      className={`${styles.boardCard} ${dragging ? styles.boardCardDragging : ""}`}
      data-ticket-id={ticket.id}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="button"
      tabIndex={0}
      title="Open ticket details. Drag to move ticket."
    >
      <div className={styles.cardTopline}><span>{ticket.id}</span><span className={`${styles.priorityPill} ${styles[`priority${ticket.priority}`]}`}>{ticket.priority}</span></div>
      <h3>{ticket.title}</h3>
      <div className={styles.cardTags}><span>{ticket.source}</span><span>{ticket.kind}</span></div>
      <div className={styles.cardFooter}><span>{ticket.evidence} evidence links</span><span className={styles.cardAssignee}>{ticket.assignee}</span></div>
    </article>
  );
}
