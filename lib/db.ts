import "server-only";

import { CallStore } from "./db/call-store.ts";

export { CallStore } from "./db/call-store.ts";
export type {
  CallInput,
  CallProcessingState,
  CallRecord,
  CallWithSegments,
  TicketEvidence,
  TicketGeneration,
  TicketGenerationState,
  TicketKind,
  TicketPriority,
  TicketRecord,
  TicketStatus,
} from "./domain.ts";

const DEFAULT_DATABASE_PATH = "data/recall-kanban.db";

// Cache on globalThis so Next.js dev-mode HMR does not open a new handle per reload.
const globalForDb = globalThis as unknown as { __recallCallStore?: CallStore };

export function getCallStore(): CallStore {
  if (!globalForDb.__recallCallStore) {
    globalForDb.__recallCallStore = new CallStore(
      process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH,
    );
  }

  return globalForDb.__recallCallStore;
}
