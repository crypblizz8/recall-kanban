import "server-only";

import { getCallStore, type CallStore } from "./db.ts";
import {
  findTranscriptRecording,
  getBotMetadata,
  getTranscriptForBot,
  listFinishedBots,
  type RecallBot,
} from "./recall.ts";

export type SyncFailure = { botId: string; error: string };

export type SyncResult = {
  /** Finished bots reported by Recall. */
  total: number;
  /** Transcripts downloaded and stored in this run. */
  synced: number;
  /** Bots already stored with a transcript; not re-downloaded. */
  skipped: number;
  /** Finished bots with no transcript artifact. */
  noTranscript: number;
  failed: SyncFailure[];
};

const DEFAULT_CONCURRENCY = 5;

async function syncBot(store: CallStore, bot: RecallBot): Promise<
  "synced" | "no_transcript"
> {
  const metadata = getBotMetadata(bot);
  const recording = findTranscriptRecording(bot);

  if (!recording) {
    store.saveCall(
      {
        ...metadata,
        recordingId: null,
        processingState: "no_transcript",
        error: null,
      },
      [],
    );
    return "no_transcript";
  }

  const transcript = await getTranscriptForBot(bot);
  store.saveCall(
    {
      ...metadata,
      recordingId: transcript.recordingId,
      processingState: "synced",
      error: null,
    },
    transcript.segments,
  );
  return "synced";
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      await worker(items[index++]);
    }
  });
  await Promise.all(runners);
}

/**
 * Pull every finished Recall bot into the local store. Safe to re-run: bots
 * whose transcript is already stored are skipped, and previously failed or
 * transcript-less bots are retried.
 */
export async function syncAllCalls(
  store: CallStore = getCallStore(),
  concurrency = DEFAULT_CONCURRENCY,
): Promise<SyncResult> {
  const bots = await listFinishedBots();
  const alreadySynced = store.syncedBotIds();
  const result: SyncResult = {
    total: bots.length,
    synced: 0,
    skipped: 0,
    noTranscript: 0,
    failed: [],
  };

  const pending = bots.filter((bot) => {
    const skip = typeof bot.id === "string" && alreadySynced.has(bot.id);
    if (skip) result.skipped++;
    return !skip;
  });

  await runPool(pending, concurrency, async (bot) => {
    const botId = String(bot.id);
    try {
      const outcome = await syncBot(store, bot);
      if (outcome === "synced") result.synced++;
      else result.noTranscript++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.failed.push({ botId, error: message });
      try {
        store.saveCall(
          {
            ...getBotMetadata(bot),
            recordingId: findTranscriptRecording(bot)?.recordingId ?? null,
            processingState: "failed",
            error: message,
          },
          [],
        );
      } catch {
        // Metadata itself was unusable (e.g. malformed bot ID); the failure is already reported.
      }
    }
  });

  return result;
}

const globalForSync = globalThis as unknown as {
  __recallSyncInFlight?: Promise<SyncResult>;
};

/** Run a sync, sharing one in-flight run between concurrent callers. */
export function syncAllCallsOnce(store?: CallStore): Promise<SyncResult> {
  if (!globalForSync.__recallSyncInFlight) {
    globalForSync.__recallSyncInFlight = syncAllCalls(store).finally(() => {
      globalForSync.__recallSyncInFlight = undefined;
    });
  }

  return globalForSync.__recallSyncInFlight;
}

/** First-run bootstrap: if nothing is stored yet, pull everything from Recall. */
export async function ensureBootstrapped(
  store: CallStore = getCallStore(),
): Promise<SyncResult | null> {
  return store.countCalls() === 0 ? syncAllCallsOnce(store) : null;
}
