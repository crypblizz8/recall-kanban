"use client";

import { useRef, useState } from "react";

import {
  approveCandidate,
  fetchCall,
  fetchCalls,
  generateCallTickets,
  removeCandidate,
  syncRecallCalls,
} from "./api";
import type { CallDetail, CallSummary, Ticket } from "./types";

type UseCallReviewOptions = {
  initialCall: CallDetail | null;
  initialCalls: CallSummary[];
  onTicketApproved: (ticket: Ticket, sourceCall: CallSummary) => void;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function createSyncNotice(
  addedCount: number,
  result: Awaited<ReturnType<typeof syncRecallCalls>>,
): string | null {
  const updates: string[] = [];
  if (addedCount > 0) {
    updates.push(`${addedCount} new ${addedCount === 1 ? "call" : "calls"} loaded`);
  }
  if (result.synced > 0) {
    updates.push(
      `${result.synced} ${result.synced === 1 ? "transcript" : "transcripts"} ready`,
    );
  }
  if (result.noTranscript > 0) {
    updates.push(
      `${result.noTranscript} ${result.noTranscript === 1 ? "call is" : "calls are"} still waiting for a transcript`,
    );
  }

  if (updates.length > 0) return `Sync complete. ${updates.join(". ")}.`;
  return result.failed.length === 0
    ? "Up to date. No new finished calls or transcripts."
    : null;
}

export function useCallReview({
  initialCall,
  initialCalls,
  onTicketApproved,
}: UseCallReviewOptions) {
  const [calls, setCalls] = useState(initialCalls);
  const [selectedCall, setSelectedCall] = useState(initialCall);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(
    initialCall?.tickets[0]?.id ?? null,
  );
  const [reviewCollapsed, setReviewCollapsed] = useState(false);
  const [loadingCall, setLoadingCall] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [approvingTicketId, setApprovingTicketId] = useState<number | null>(null);
  const [removingTicketId, setRemovingTicketId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const callRequest = useRef<AbortController | null>(null);
  const activeBotId = useRef(initialCall?.botId ?? null);
  const syncInProgress = useRef(false);

  async function syncCalls() {
    if (syncInProgress.current) return;

    syncInProgress.current = true;
    setSyncing(true);
    setActionError(null);
    setNotice(null);

    try {
      const result = await syncRecallCalls();
      const refreshedCalls = await fetchCalls();
      const existingBotIds = new Set(calls.map((call) => call.botId));
      const addedCount = refreshedCalls.filter(
        (call) => !existingBotIds.has(call.botId),
      ).length;
      setCalls(refreshedCalls);

      const targetBotId = activeBotId.current ?? refreshedCalls[0]?.botId ?? null;
      activeBotId.current = targetBotId;
      if (targetBotId) {
        const refreshedCall = await fetchCall(targetBotId, { cache: "no-store" });
        if (activeBotId.current === targetBotId) {
          setSelectedCall(refreshedCall);
          setSelectedTicketId((current) =>
            refreshedCall.tickets.some((ticket) => ticket.id === current)
              ? current
              : refreshedCall.tickets[0]?.id ?? null,
          );
        }
      } else {
        setSelectedCall(null);
        setSelectedTicketId(null);
      }

      setNotice(createSyncNotice(addedCount, result));
      if (result.failed.length > 0) {
        const firstFailure = result.failed[0];
        setActionError(
          `${result.failed.length} ${result.failed.length === 1 ? "call could" : "calls could"} not be synced. ${firstFailure.error}`,
        );
      }
    } catch (error) {
      setActionError(
        errorMessage(
          error,
          "Calls could not be synced. Check the Recall connection and try again.",
        ),
      );
    } finally {
      syncInProgress.current = false;
      setSyncing(false);
    }
  }

  async function selectCall(botId: string) {
    if (botId === activeBotId.current) return;

    activeBotId.current = botId;
    callRequest.current?.abort();
    const controller = new AbortController();
    callRequest.current = controller;
    setLoadingCall(true);
    setActionError(null);

    try {
      const call = await fetchCall(botId, { signal: controller.signal });
      if (activeBotId.current !== botId) return;
      setSelectedCall(call);
      setSelectedTicketId(call.tickets[0]?.id ?? null);
      setReviewCollapsed(false);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (activeBotId.current === botId) {
        activeBotId.current = selectedCall?.botId ?? null;
      }
      setActionError(errorMessage(error, "Unable to load this call."));
    } finally {
      if (callRequest.current === controller) {
        callRequest.current = null;
        setLoadingCall(false);
      }
    }
  }

  async function generateTickets(force: boolean) {
    if (!selectedCall) return;
    const botId = selectedCall.botId;
    setGenerating(true);
    setActionError(null);

    try {
      const result = await generateCallTickets(
        botId,
        force,
        selectedCall.generation.generatedAt,
      );
      setSelectedCall((current) =>
        current?.botId === botId
          ? { ...current, generation: result.generation, tickets: result.tickets }
          : current,
      );
      setCalls((current) =>
        current.map((call) =>
          call.botId === botId ? { ...call, generation: result.generation } : call,
        ),
      );
      if (activeBotId.current === botId) {
        setSelectedTicketId(result.tickets[0]?.id ?? null);
        setReviewCollapsed(false);
      }
    } catch (error) {
      setActionError(errorMessage(error, "Unable to generate tickets."));
      try {
        const refreshed = await fetchCall(botId);
        setSelectedCall((current) => current?.botId === botId ? refreshed : current);
        setCalls((current) =>
          current.map((call) => call.botId === botId ? refreshed : call),
        );
      } catch {
        // Keep the actionable generation error visible if refreshing metadata fails.
      }
    } finally {
      setGenerating(false);
    }
  }

  async function approveTicket(ticketId: number) {
    const sourceCall = selectedCall;
    if (!sourceCall) return;

    setApprovingTicketId(ticketId);
    setActionError(null);
    try {
      const ticket = await approveCandidate(ticketId);
      setSelectedCall((current) =>
        current?.botId === sourceCall.botId
          ? {
              ...current,
              tickets: current.tickets.map((candidate) =>
                candidate.id === ticket.id ? ticket : candidate,
              ),
            }
          : current,
      );
      if (ticket.botId === sourceCall.botId) {
        onTicketApproved(ticket, sourceCall);
      }
    } catch (error) {
      setActionError(errorMessage(error, "Unable to approve this ticket."));
    } finally {
      setApprovingTicketId(null);
    }
  }

  async function removeTicket(ticketId: number) {
    const sourceCall = selectedCall;
    if (!sourceCall) return;

    setRemovingTicketId(ticketId);
    setActionError(null);
    try {
      await removeCandidate(ticketId);
      const remainingTickets = sourceCall.tickets.filter(
        (ticket) => ticket.id !== ticketId,
      );
      setSelectedCall((current) =>
        current?.botId === sourceCall.botId
          ? {
              ...current,
              tickets: current.tickets.filter((ticket) => ticket.id !== ticketId),
            }
          : current,
      );
      if (activeBotId.current === sourceCall.botId) {
        setSelectedTicketId((current) =>
          current === ticketId ? remainingTickets[0]?.id ?? null : current,
        );
      }
    } catch (error) {
      setActionError(errorMessage(error, "Unable to remove this candidate."));
    } finally {
      setRemovingTicketId(null);
    }
  }

  function selectTicket(id: number) {
    setSelectedTicketId(id);
    setReviewCollapsed(false);
  }

  return {
    actionError,
    approveTicket,
    approvingTicketId,
    calls,
    generateTickets,
    generating,
    loadingCall,
    notice,
    removeTicket,
    removingTicketId,
    reviewCollapsed,
    selectedCall,
    selectedTicketId,
    selectCall,
    selectTicket,
    syncCalls,
    syncing,
    toggleReview: () => setReviewCollapsed((collapsed) => !collapsed),
  };
}
