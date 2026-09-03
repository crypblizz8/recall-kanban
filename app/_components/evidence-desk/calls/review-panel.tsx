import styles from "../../../evidence-desk.module.css";
import type { Ticket } from "../types";

type ReviewPanelProps = {
  candidate: Ticket;
  approving: boolean;
  removing: boolean;
  busy: boolean;
  collapsed: boolean;
  onApprove: () => void;
  onRemove: () => void;
  onToggle: () => void;
};

export function ReviewPanel({
  candidate,
  approving,
  removing,
  busy,
  collapsed,
  onApprove,
  onRemove,
  onToggle,
}: ReviewPanelProps) {
  const evidence = candidate.evidence[0];
  const timestamp = evidence?.startSeconds == null
    ? "Time unavailable"
    : `${Math.floor(evidence.startSeconds / 60)}:${String(Math.floor(evidence.startSeconds % 60)).padStart(2, "0")}`;

  return (
    <aside className={`${styles.reviewPanel} ${collapsed ? styles.reviewPanelCollapsed : ""}`} aria-label="Review">
      <button
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Show review" : "Hide review"}
        className={styles.panelToggle}
        onClick={onToggle}
        title={collapsed ? "Show review" : "Hide review"}
        type="button"
      >
        <span className={collapsed ? styles.chevronLeft : styles.chevronRight} aria-hidden="true" />
      </button>

      <div className={styles.reviewPanelContent} hidden={collapsed}>
        <div className={styles.reviewTopline}><span>Review</span><span>ED-{candidate.id}</span></div>
        <h2>{candidate.title}</h2>
        <div className={styles.badgeRow}>
          <span className={styles.typeBadge}>{candidate.kind}</span>
          <span className={styles.priorityBadge}>{candidate.priority.toUpperCase()}</span>
          <span className={styles.confidenceBadge}>{candidate.confidence}% confidence</span>
        </div>

        <p className={styles.ticketDescription}>{candidate.description}</p>

        <dl className={styles.reviewFields}>
          <div><dt>Owner</dt><dd>Unassigned</dd></div>
          <div><dt>Missing evidence</dt><dd className={styles.missingField}>{candidate.missingEvidence.join(", ") || "Nothing identified"}</dd></div>
          <div><dt>Notes</dt><dd className={styles.emptyField}>No notes added</dd></div>
        </dl>

        <section className={styles.sourceMoment}>
          <div className={styles.sourceHeading}><span>Source moment</span><small>{timestamp}</small></div>
          <blockquote>“{evidence?.text ?? "Evidence unavailable"}”</blockquote>
          <p>{evidence ? `${evidence.speaker} · Segment ${evidence.sequence + 1}` : "No source segment"}</p>
        </section>

        <div className={styles.reviewActions}>
          {candidate.status === "candidate" ? (
            <button
              className={styles.removeButton}
              disabled={busy}
              type="button"
              onClick={onRemove}
            >
              {removing ? "Removing…" : "Remove"}
            </button>
          ) : null}
          <button
            className={candidate.status === "approved" ? styles.approvedButton : styles.primaryButton}
            disabled={candidate.status === "approved" || busy}
            type="button"
            onClick={onApprove}
          >
            {candidate.status === "approved" ? "Approved" : approving ? "Approving…" : "Approve ticket"}
          </button>
        </div>
      </div>
    </aside>
  );
}
