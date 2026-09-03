import styles from "../../../evidence-desk.module.css";
import type { Ticket } from "../types";

type CandidateRowProps = {
  candidate: Ticket;
  selected: boolean;
  approving: boolean;
  removing: boolean;
  busy: boolean;
  onSelect: () => void;
  onApprove: () => void;
  onRemove: () => void;
};

export function CandidateRow({
  candidate,
  selected,
  approving,
  removing,
  busy,
  onSelect,
  onApprove,
  onRemove,
}: CandidateRowProps) {
  return (
    <article className={`${styles.candidateRow} ${selected ? styles.candidateSelected : ""}`}>
      <button className={styles.selectCandidate} type="button" onClick={onSelect} aria-label={`Review ${candidate.title}`} aria-pressed={selected}><span /></button>
      <button className={styles.candidateTitle} type="button" onClick={onSelect}>
        <strong>{candidate.title}</strong>
        <span>ED-{candidate.id} · {candidate.kind} · {candidate.priority.toUpperCase()}</span>
      </button>
      <div className={styles.readinessCell}>
        <span>{candidate.confidence}% ready</span>
        <div className={styles.progressTrack}><i style={{ width: `${candidate.confidence}%` }} /></div>
      </div>
      <div className={styles.rowActions}>
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
          {candidate.status === "approved" ? "Approved" : approving ? "Approving…" : "Approve"}
        </button>
      </div>
    </article>
  );
}
