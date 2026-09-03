import type {
  CallDetail,
  CallSummary,
  Ticket,
  TicketGeneration,
} from "./types";

export type SyncResult = {
  total: number;
  synced: number;
  skipped: number;
  noTranscript: number;
  failed: Array<{ botId: string; error: string }>;
};

async function responseJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as { error?: unknown } | null;
  if (!response.ok) {
    throw new Error(
      typeof body?.error === "string" ? body.error : "The request could not be completed.",
    );
  }
  return body as T;
}

export async function syncRecallCalls(): Promise<SyncResult> {
  const response = await fetch("/api/recall/sync", { method: "POST" });
  return responseJson<SyncResult>(response);
}

export async function fetchCalls(): Promise<CallSummary[]> {
  const response = await fetch("/api/calls", { cache: "no-store" });
  const result = await responseJson<{ calls: CallSummary[] }>(response);
  return result.calls;
}

export async function fetchCall(
  botId: string,
  options: { cache?: RequestCache; signal?: AbortSignal } = {},
): Promise<CallDetail> {
  const response = await fetch(`/api/calls/${encodeURIComponent(botId)}`, options);
  return responseJson<CallDetail>(response);
}

export async function generateCallTickets(
  botId: string,
  force: boolean,
  previousGeneratedAt: string | null,
): Promise<{ generation: TicketGeneration; tickets: Ticket[] }> {
  try {
    const response = await fetch(
      `/api/calls/${encodeURIComponent(botId)}/tickets/generate`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ force }),
      },
    );
    return responseJson<{ generation: TicketGeneration; tickets: Ticket[] }>(response);
  } catch (error) {
    // A long-running generation can finish on the server even if a dev-server
    // reconnect drops the browser's response. Recover the persisted result
    // instead of leaving the page stale with a misleading network error.
    if (!(error instanceof TypeError)) throw error;

    for (const delayMs of [0, 250, 750]) {
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      try {
        const call = await fetchCall(botId, { cache: "no-store" });
        if (
          call.generation.generatedAt != null &&
          call.generation.generatedAt !== previousGeneratedAt
        ) {
          return { generation: call.generation, tickets: call.tickets };
        }
        if (call.generation.state === "failed" && call.generation.error) {
          throw new Error(call.generation.error);
        }
      } catch (recoveryError) {
        if (!(recoveryError instanceof TypeError)) throw recoveryError;
      }
    }

    throw error;
  }
}

export async function approveCandidate(ticketId: number): Promise<Ticket> {
  const response = await fetch(`/api/tickets/${ticketId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "approved" }),
  });
  const result = await responseJson<{ ticket: Ticket }>(response);
  return result.ticket;
}

export async function removeCandidate(ticketId: number): Promise<void> {
  const response = await fetch(`/api/tickets/${ticketId}`, { method: "DELETE" });
  await responseJson<{ removed: true }>(response);
}
