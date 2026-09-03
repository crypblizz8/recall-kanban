import "server-only";

const SUPPORTED_REGIONS = new Set([
  "us-west-2",
  "us-east-1",
  "eu-central-1",
  "ap-northeast-1",
]);

const BOT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Recall bot statuses that mean the call is over and artifacts are final. */
export const FINISHED_BOT_STATUSES = ["done", "analysis_done"] as const;

const MAX_LIST_PAGES = 200;

type RecallConfig = {
  apiKey: string;
  baseUrl: string;
  region: string;
};

type RecallRecording = {
  id?: unknown;
  media_shortcuts?: {
    transcript?: {
      data?: {
        download_url?: unknown;
      };
    };
  };
};

export type RecallBot = {
  id?: unknown;
  join_at?: unknown;
  meeting_url?: {
    platform?: unknown;
    meeting_id?: unknown;
  } | null;
  status_changes?: unknown;
  recordings?: unknown;
};

type RecallBotList = {
  next?: unknown;
  results?: unknown;
};

type RecallWord = {
  text?: unknown;
  start_timestamp?: {
    relative?: unknown;
  };
  end_timestamp?: {
    relative?: unknown;
  };
};

type RecallUtterance = {
  participant?: {
    name?: unknown;
  };
  words?: unknown;
};

export type NormalizedTranscriptSegment = {
  speaker: string;
  startSeconds: number | null;
  endSeconds: number | null;
  text: string;
};

export type NormalizedTranscript = {
  botId: string;
  recordingId: string;
  segmentCount: number;
  segments: NormalizedTranscriptSegment[];
};

export type BotMetadata = {
  botId: string;
  platform: string | null;
  meetingId: string | null;
  joinedAt: string | null;
  botStatus: string | null;
};

export class RecallConfigError extends Error {
  status = 500;
}

export class RecallInputError extends Error {
  status = 400;
}

export class RecallApiError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

export function getRecallConfig(): RecallConfig {
  const region = process.env.RECALL_REGION;
  const apiKey = process.env.RECALL_API_KEY;

  if (!region || !SUPPORTED_REGIONS.has(region)) {
    throw new RecallConfigError(
      `RECALL_REGION must be one of: ${[...SUPPORTED_REGIONS].join(", ")}`,
    );
  }

  if (!apiKey || apiKey === "replace-with-your-sandbox-api-key") {
    throw new RecallConfigError(
      "RECALL_API_KEY is missing. Add it to .env.local.",
    );
  }

  return {
    apiKey,
    baseUrl: `https://${region}.recall.ai`,
    region,
  };
}

export function requireBotId(value: string): string {
  if (!BOT_ID_PATTERN.test(value)) {
    throw new RecallInputError("A valid Recall bot ID is required.");
  }

  return value;
}

/**
 * Authenticated request to the Recall API. Accepts a path relative to the
 * region base URL, or an absolute URL that Recall itself returned (pagination),
 * which must stay on the configured host so the API key is never sent elsewhere.
 */
async function recallRequest(pathOrUrl: string): Promise<unknown> {
  const { apiKey, baseUrl } = getRecallConfig();
  const url = pathOrUrl.startsWith("/") ? `${baseUrl}${pathOrUrl}` : pathOrUrl;

  if (!url.startsWith(`${baseUrl}/`)) {
    throw new RecallApiError(`Refusing to call non-Recall URL: ${url}`);
  }

  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Token ${apiKey}`,
      },
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new RecallApiError("Recall API request timed out after 60 seconds.");
    }

    throw new RecallApiError(
      `Recall API request failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  const body = await readJsonOrText(response);

  if (!response.ok) {
    const message =
      typeof body === "string"
        ? body
        : "Recall API returned an error while retrieving the bot.";
    throw new RecallApiError(message, response.status);
  }

  return body;
}

async function readJsonOrText(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function findTranscriptRecording(
  bot: RecallBot,
): { recordingId: string; transcriptUrl: string } | null {
  const recordings = Array.isArray(bot.recordings) ? bot.recordings : [];

  for (const recording of recordings as RecallRecording[]) {
    const recordingId = recording.id;
    const transcriptUrl =
      recording.media_shortcuts?.transcript?.data?.download_url;

    if (typeof recordingId === "string" && typeof transcriptUrl === "string") {
      return { recordingId, transcriptUrl };
    }
  }

  return null;
}

function requireTranscriptRecording(bot: RecallBot) {
  const found = findTranscriptRecording(bot);

  if (!found) {
    throw new RecallApiError(
      "No finalized transcript download URL is available for this bot yet.",
      404,
    );
  }

  return found;
}

export async function fetchTranscriptJson(url: string): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    throw new RecallApiError(
      `Transcript download failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  const body = await readJsonOrText(response);

  if (!response.ok) {
    throw new RecallApiError(
      "Transcript download URL returned an error.",
      response.status,
    );
  }

  return body;
}

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function getBotMetadata(bot: RecallBot): BotMetadata {
  const statusChanges = Array.isArray(bot.status_changes)
    ? (bot.status_changes as { code?: unknown }[])
    : [];

  return {
    botId: requireBotId(String(bot.id)),
    platform: toStringOrNull(bot.meeting_url?.platform),
    meetingId: toStringOrNull(bot.meeting_url?.meeting_id),
    joinedAt: toStringOrNull(bot.join_at),
    botStatus: toStringOrNull(statusChanges.at(-1)?.code),
  };
}

export function normalizeTranscript(
  botId: string,
  recordingId: string,
  transcript: unknown,
): NormalizedTranscript {
  if (!Array.isArray(transcript)) {
    throw new RecallApiError("Transcript payload was not an array.");
  }

  const segments = transcript.map((utterance: RecallUtterance) => {
    const words = Array.isArray(utterance.words)
      ? (utterance.words as RecallWord[])
      : [];
    const firstWord = words.at(0);
    const lastWord = words.at(-1);
    const text = words
      .map((word) => (typeof word.text === "string" ? word.text : ""))
      .filter(Boolean)
      .join(" ")
      .trim();

    return {
      speaker:
        typeof utterance.participant?.name === "string"
          ? utterance.participant.name
          : "Unknown speaker",
      startSeconds: toNumber(firstWord?.start_timestamp?.relative),
      endSeconds: toNumber(lastWord?.end_timestamp?.relative),
      text,
    };
  });

  return {
    botId,
    recordingId,
    segmentCount: segments.length,
    segments,
  };
}

/**
 * Download and normalize the transcript for a bot that has already been
 * retrieved from Recall. Throws a 404 RecallApiError if none is finalized.
 */
export async function getTranscriptForBot(
  bot: RecallBot,
): Promise<NormalizedTranscript> {
  const botId = requireBotId(String(bot.id));
  const { recordingId, transcriptUrl } = requireTranscriptRecording(bot);
  const transcript = await fetchTranscriptJson(transcriptUrl);

  return normalizeTranscript(botId, recordingId, transcript);
}

export async function getBot(rawBotId: string): Promise<RecallBot> {
  const botId = requireBotId(rawBotId);
  return (await recallRequest(`/api/v1/bot/${botId}/`)) as RecallBot;
}

export async function getBotTranscript(
  rawBotId: string,
): Promise<NormalizedTranscript> {
  return getTranscriptForBot(await getBot(rawBotId));
}

/**
 * List every bot in the workspace whose call has finished, following Recall's
 * cursor pagination until exhausted.
 */
export async function listFinishedBots(): Promise<RecallBot[]> {
  const params = new URLSearchParams({ use_cursor: "true" });
  for (const status of FINISHED_BOT_STATUSES) {
    params.append("status", status);
  }

  const bots: RecallBot[] = [];
  let next: string | null = `/api/v1/bot/?${params}`;
  let pages = 0;

  while (next) {
    if (++pages > MAX_LIST_PAGES) {
      throw new RecallApiError(
        `Bot listing exceeded ${MAX_LIST_PAGES} pages; aborting sync.`,
      );
    }

    const page = (await recallRequest(next)) as RecallBotList;
    const results = Array.isArray(page.results) ? page.results : [];
    bots.push(...(results as RecallBot[]));
    next = typeof page.next === "string" ? page.next : null;
  }

  return bots;
}
