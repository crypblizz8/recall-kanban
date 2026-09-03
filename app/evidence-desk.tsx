"use client";

import { useState } from "react";

import { BoardView } from "./_components/evidence-desk/board/board-view";
import { CallsView } from "./_components/evidence-desk/calls/calls-view";
import { MobileTopbar } from "./_components/evidence-desk/mobile-topbar";
import { Sidebar } from "./_components/evidence-desk/sidebar";
import type {
  BoardColumn,
  CallDetail,
  CallSummary,
  View,
} from "./_components/evidence-desk/types";
import { useCallReview } from "./_components/evidence-desk/use-call-review";
import { useEvidenceBoard } from "./_components/evidence-desk/use-evidence-board";
import styles from "./evidence-desk.module.css";

type EvidenceDeskProps = {
  initialBoardColumns: BoardColumn[];
  initialCalls: CallSummary[];
  initialCall: CallDetail | null;
  linearTeamId: string | null;
};

export function EvidenceDesk({
  initialBoardColumns,
  initialCalls,
  initialCall,
  linearTeamId,
}: EvidenceDeskProps) {
  const [view, setView] = useState<View>("calls");
  const board = useEvidenceBoard(initialBoardColumns, linearTeamId);
  const review = useCallReview({
    initialCall,
    initialCalls,
    onTicketApproved: board.addApprovedTicket,
  });

  return (
    <div className={styles.appShell}>
      <Sidebar
        boardTicketCount={board.ticketCount}
        callCount={review.calls.length}
        view={view}
        onChange={setView}
      />
      <MobileTopbar view={view} onChange={setView} />
      <div className={styles.workspace}>
        {view === "calls" ? (
          <CallsView
            actionError={review.actionError}
            approvingTicketId={review.approvingTicketId}
            removingTicketId={review.removingTicketId}
            call={review.selectedCall}
            calls={review.calls}
            generating={review.generating}
            loadingCall={review.loadingCall}
            onApprove={review.approveTicket}
            onGenerate={review.generateTickets}
            onRemove={review.removeTicket}
            onSelectCall={review.selectCall}
            onSelectTicket={review.selectTicket}
            onSync={review.syncCalls}
            onToggleReview={review.toggleReview}
            reviewCollapsed={review.reviewCollapsed}
            selectedTicketId={review.selectedTicketId}
            syncing={review.syncing}
            syncNotice={review.notice}
          />
        ) : (
          <BoardView
            columns={board.columns}
            onMoveTicket={board.moveTicket}
            onReviewCalls={() => setView("calls")}
          />
        )}
      </div>
    </div>
  );
}
