import "server-only";

import {
  getCallStore,
  type CallStore,
  type CallWithSegments,
} from "./db.ts";
import { extractTickets } from "./openrouter.ts";

export class TicketGenerationError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "TicketGenerationError";
    this.status = status;
  }
}

export type TicketGenerationResult = {
  reused: boolean;
  call: CallWithSegments;
};

const globalForTicketGeneration = globalThis as unknown as {
  __ticketGenerationInFlight?: Map<string, Promise<TicketGenerationResult>>;
};

const inFlight =
  globalForTicketGeneration.__ticketGenerationInFlight ??
  new Map<string, Promise<TicketGenerationResult>>();
globalForTicketGeneration.__ticketGenerationInFlight = inFlight;

function requireGeneratableCall(store: CallStore, botId: string) {
  const call = store.getCall(botId);
  if (!call) {
    throw new TicketGenerationError("Call not found.", 404);
  }
  if (call.processingState !== "synced" || call.segments.length === 0) {
    throw new TicketGenerationError(
      "This call does not have a stored transcript to generate tickets from.",
      409,
    );
  }
  return call;
}

async function runGeneration(
  store: CallStore,
  botId: string,
): Promise<TicketGenerationResult> {
  const call = requireGeneratableCall(store, botId);

  try {
    const result = await extractTickets(
      call.segments,
      store.listApprovedTicketSummaries(botId),
    );
    store.saveGeneratedTickets(botId, result.extraction, result.metadata);
    return {
      reused: false,
      call: requireGeneratableCall(store, botId),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    store.recordTicketGenerationFailure(
      botId,
      message,
      process.env.OPENROUTER_MODEL?.trim() || null,
    );
    throw error;
  }
}

export async function generateTicketsForCall(
  botId: string,
  force: boolean,
  store: CallStore = getCallStore(),
): Promise<TicketGenerationResult> {
  const call = requireGeneratableCall(store, botId);
  if (!force && store.hasGeneratedResult(botId)) {
    return { reused: true, call };
  }

  const active = inFlight.get(botId);
  if (active) return active;

  const generation = runGeneration(store, botId).finally(() => {
    inFlight.delete(botId);
  });
  inFlight.set(botId, generation);
  return generation;
}
