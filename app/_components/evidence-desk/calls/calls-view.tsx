import { RefreshCw } from "lucide-react";

import styles from "../../../evidence-desk.module.css";
import type { CallDetail, CallSummary } from "../types";
import { CandidateRow } from "./candidate-row";
import { ReviewPanel } from "./review-panel";

type CallsViewProps = {
  calls: CallSummary[];
  call: CallDetail | null;
  selectedTicketId: number | null;
  reviewCollapsed: boolean;
  loadingCall: boolean;
  generating: boolean;
  syncing: boolean;
  syncNotice: string | null;
  approvingTicketId: number | null;
  removingTicketId: number | null;
  actionError: string | null;
  onSelectCall: (botId: string) => void;
  onSelectTicket: (id: number) => void;
  onGenerate: (force: boolean) => void;
  onApprove: (id: number) => void;
  onRemove: (id: number) => void;
  onSync: () => void;
  onToggleReview: () => void;
};

function formatDate(value: string | null) {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDuration(call: CallDetail) {
  const seconds = call.segments.reduce(
    (maximum, segment) => Math.max(maximum, segment.endSeconds ?? 0),
    0,
  );
  if (seconds === 0) return "Duration unavailable";
  return `${Math.ceil(seconds / 60)} min`;
}

function callName(call: Pick<CallSummary, "meetingId" | "platform" | "joinedAt">) {
  if (call.meetingId) return call.meetingId;
  if (call.platform) return `${call.platform.replaceAll("_", " ")} call`;
  return formatDate(call.joinedAt);
}

export function CallsView({
  calls,
  call,
  selectedTicketId,
  reviewCollapsed,
  loadingCall,
  generating,
  syncing,
  syncNotice,
  approvingTicketId,
  removingTicketId,
  actionError,
  onSelectCall,
  onSelectTicket,
  onGenerate,
  onApprove,
  onRemove,
  onSync,
  onToggleReview,
}: CallsViewProps) {
  const selected =
    call?.tickets.find((ticket) => ticket.id === selectedTicketId) ??
    call?.tickets[0] ??
    null;
  const speakers = call
    ? [...new Set(call.segments.map((segment) => segment.speaker))]
    : [];
  const hasPreviousResult = call?.generation.generatedAt != null;
  const generateLabel = generating
    ? "Generating…"
    : call?.generation.state === "failed" && !hasPreviousResult
      ? "Try again"
      : hasPreviousResult
        ? "Generate again"
        : "Generate tickets";

  if (!call && !loadingCall) {
    return (
      <main className={styles.callEmptyState}>
        <h1>No calls synced</h1>
        <p>Load finished Recall calls and transcripts to generate evidence-backed tickets.</p>
        <div className={styles.callEmptyStateActions}>
          <button
            className={styles.syncButton}
            disabled={syncing}
            onClick={onSync}
            type="button"
          >
            <RefreshCw aria-hidden="true" className={syncing ? styles.syncIconActive : styles.syncIcon} />
            {syncing ? "Syncing…" : "Sync calls"}
          </button>
        </div>
        {syncNotice ? <p className={styles.syncNotice} role="status">{syncNotice}</p> : null}
        {actionError ? <p className={styles.actionError} role="alert">{actionError}</p> : null}
      </main>
    );
  }

  return (
    <div className={`${styles.callsView} ${reviewCollapsed || !selected ? styles.callsViewPanelCollapsed : ""}`}>
      <main className={styles.callMain} aria-busy={loadingCall || generating || syncing}>
        <header className={styles.callHeader}>
          <div>
            <p className={styles.breadcrumb}>Calls / {call ? callName(call) : "Loading"}</p>
            <h1>{call ? callName(call) : "Loading call…"}</h1>
            {call ? (
              <div className={styles.callMeta}>
                {speakers.slice(0, 3).map((speaker) => <span key={speaker}>{speaker}</span>)}
                <span>{formatDate(call.joinedAt)}</span>
                <span>{formatDuration(call)}</span>
              </div>
            ) : null}
          </div>
          <div className={styles.headerActions}>
            <label className={styles.callSelector}>
              <span>Call</span>
              <select
                disabled={loadingCall || generating || syncing}
                onChange={(event) => onSelectCall(event.target.value)}
                value={call?.botId ?? ""}
              >
                {calls.map((item) => (
                  <option key={item.botId} value={item.botId}>{callName(item)}</option>
                ))}
              </select>
            </label>
            <button
              className={styles.syncButton}
              disabled={syncing || loadingCall || generating}
              onClick={onSync}
              type="button"
            >
              <RefreshCw aria-hidden="true" className={syncing ? styles.syncIconActive : styles.syncIcon} />
              {syncing ? "Syncing…" : "Sync calls"}
            </button>
            <button
              className={styles.primaryButton}
              disabled={!call || generating || loadingCall || syncing || call.processingState !== "synced"}
              onClick={() => onGenerate(hasPreviousResult)}
              type="button"
            >
              {generateLabel}
            </button>
          </div>
        </header>

        {syncNotice ? <p className={styles.syncNotice} role="status">{syncNotice}</p> : null}
        {actionError ? <p className={styles.actionError} role="alert">{actionError}</p> : null}

        {call ? (
          <details className={styles.transcriptDisclosure}>
            <summary><span>Transcript</span><small>{call.segmentCount} {call.segmentCount === 1 ? "segment" : "segments"} · {formatDuration(call)}</small></summary>
            <div className={styles.transcriptSegments}>
              {call.segments.map((segment, sequence) => (
                <p key={sequence}><strong>{segment.speaker}</strong><span>{segment.text}</span></p>
              ))}
            </div>
          </details>
        ) : null}

        <section className={styles.candidatesSection}>
          <div className={styles.sectionHeading}>
            <div>
              <h2>Tickets</h2>
              <p>{call ? `${call.tickets.length} extracted from this call` : "Loading tickets"}</p>
            </div>
          </div>

          {call?.tickets.length ? (
            <>
              <div className={styles.candidateLabels} aria-hidden="true"><span /><span>Candidate</span><span>Readiness</span><span>Action</span></div>
              <div className={styles.candidateList}>
                {call.tickets.map((candidate) => (
                  <CandidateRow
                    key={candidate.id}
                    candidate={candidate}
                    selected={candidate.id === selected?.id}
                    approving={approvingTicketId === candidate.id}
                    busy={approvingTicketId !== null || removingTicketId !== null}
                    removing={removingTicketId === candidate.id}
                    onSelect={() => onSelectTicket(candidate.id)}
                    onApprove={() => onApprove(candidate.id)}
                    onRemove={() => onRemove(candidate.id)}
                  />
                ))}
              </div>
            </>
          ) : call?.generation.generatedAt ? (
            <div className={styles.ticketEmptyState}>
              <h3>No actionable tickets found</h3>
              <p>The transcript did not contain enough evidence for a bug, feature, or follow-up task.</p>
            </div>
          ) : (
            <div className={styles.ticketEmptyState}>
              <h3>Generate tickets from this call</h3>
              <p>Ticket candidates will include source segments so each result can be reviewed.</p>
            </div>
          )}
        </section>
      </main>
      {selected ? (
        <ReviewPanel
          approving={approvingTicketId === selected.id}
          busy={approvingTicketId !== null || removingTicketId !== null}
          candidate={selected}
          collapsed={reviewCollapsed}
          onApprove={() => onApprove(selected.id)}
          onRemove={() => onRemove(selected.id)}
          removing={removingTicketId === selected.id}
          onToggle={onToggleReview}
        />
      ) : null}
    </div>
  );
}
