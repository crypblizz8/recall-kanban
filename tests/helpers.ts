import { CallStore } from "../lib/db.ts";

export const BOT_A = "11111111-1111-4111-8111-111111111111";
export const BOT_B = "22222222-2222-4222-8222-222222222222";
export const BOT_C = "33333333-3333-4333-8333-333333333333";
export const BASE = "https://us-west-2.recall.ai";

export function setEnv() {
  process.env.RECALL_REGION = "us-west-2";
  process.env.RECALL_API_KEY = "test-key";
}

export function memoryStore() {
  return new CallStore(":memory:");
}

export function utterance(speaker: string, text: string, start: number) {
  const words = text.split(" ").map((word, i) => ({
    text: word,
    start_timestamp: { relative: start + i },
    end_timestamp: { relative: start + i + 0.5 },
  }));
  return { participant: { name: speaker }, words };
}

export function bot(id: string, transcriptUrl: string | null, status = "done") {
  return {
    id,
    join_at: "2026-09-01T10:00:00Z",
    meeting_url: { platform: "zoom", meeting_id: `m-${id.slice(0, 4)}` },
    status_changes: [{ code: "joining_call" }, { code: status }],
    recordings: transcriptUrl
      ? [
          {
            id: `rec-${id.slice(0, 4)}`,
            media_shortcuts: { transcript: { data: { download_url: transcriptUrl } } },
          },
        ]
      : [{ id: `rec-${id.slice(0, 4)}`, media_shortcuts: {} }],
  };
}

type Route = (url: URL) => { status?: number; body: unknown } | undefined;

/** Replace global fetch with a router; returns the list of requested URLs and a restore fn. */
export function stubFetch(route: Route) {
  const original = globalThis.fetch;
  const requests: { url: string; headers: Record<string, string> }[] = [];

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    requests.push({ url: url.href, headers: Object.fromEntries(new Headers(init?.headers).entries()) });
    const match = route(url);
    if (!match) return new Response("not found", { status: 404 });
    return new Response(
      typeof match.body === "string" ? match.body : JSON.stringify(match.body),
      { status: match.status ?? 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;

  return { requests, restore: () => void (globalThis.fetch = original) };
}
