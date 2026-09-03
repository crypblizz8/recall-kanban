import { useEffect, useRef } from "react";
import { ExternalLink, X } from "lucide-react";

import styles from "../../../evidence-desk.module.css";
import type { BoardTicket } from "../types";

type BoardTicketModalProps = {
  status: string;
  ticket: BoardTicket;
  onClose: () => void;
};

function formatTimestamp(seconds: number | null) {
  if (seconds == null) return "Time unavailable";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export function BoardTicketModal({ status, ticket, onClose }: BoardTicketModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      aria-labelledby="board-ticket-modal-title"
      className={styles.ticketModal}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      ref={dialogRef}
    >
      <article className={styles.ticketModalSurface}>
        <header className={styles.ticketModalHeader}>
          <div>
            <p><span>{ticket.id}</span><span>{status}</span></p>
            <h2 id="board-ticket-modal-title">{ticket.title}</h2>
          </div>
          <button autoFocus aria-label="Close ticket details" onClick={onClose} type="button">
            <X aria-hidden="true" size={17} strokeWidth={1.8} />
          </button>
        </header>

        <div className={styles.ticketModalBadges}>
          <span className={`${styles.priorityPill} ${styles[`priority${ticket.priority}`]}`}>{ticket.priority}</span>
          <span>{ticket.kind}</span>
          <span>{ticket.confidence}% confidence</span>
        </div>

        <p className={styles.ticketModalDescription}>{ticket.description}</p>

        <div className={styles.ticketModalActions}>
          <a
            aria-label={`Open ${ticket.id} in Linear`}
            className={styles.linearLink}
            href={ticket.linearUrl}
            rel="noreferrer"
            target="_blank"
          >
            Open in Linear
            <ExternalLink aria-hidden="true" size={14} strokeWidth={1.8} />
          </a>
        </div>

        <dl className={styles.ticketModalFields}>
          <div><dt>Owner</dt><dd>{ticket.assignee}</dd></div>
          <div><dt>Source call</dt><dd>{ticket.source}</dd></div>
          <div><dt>Missing evidence</dt><dd className={styles.modalMissingEvidence}>{ticket.missingEvidence.join(", ") || "Nothing identified"}</dd></div>
          <div><dt>Notes</dt><dd className={styles.modalEmptyField}>No notes added</dd></div>
        </dl>

        <section className={styles.ticketModalEvidence} aria-labelledby="board-ticket-evidence-title">
          <div className={styles.ticketModalSectionHeading}>
            <h3 id="board-ticket-evidence-title">Source evidence</h3>
            <span>{ticket.evidence} {ticket.evidence === 1 ? "segment" : "segments"}</span>
          </div>
          {ticket.evidenceItems.length ? (
            <div className={styles.ticketModalEvidenceList}>
              {ticket.evidenceItems.map((evidence) => (
                <blockquote key={evidence.sequence}>
                  <div><strong>{evidence.speaker}</strong><time>{formatTimestamp(evidence.startSeconds)}</time></div>
                  <p>“{evidence.text}”</p>
                  <footer>Segment {evidence.sequence + 1}</footer>
                </blockquote>
              ))}
            </div>
          ) : (
            <p className={styles.ticketModalEmptyEvidence}>Evidence unavailable</p>
          )}
        </section>
      </article>
    </dialog>
  );
}
