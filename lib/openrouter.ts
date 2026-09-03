import "server-only";

import type { NormalizedTranscriptSegment } from "./recall.ts";
import { requiredConfig } from "./openrouter/config.ts";
import { OpenRouterError, upstreamError } from "./openrouter/errors.ts";
import {
  buildOpenRouterRequest,
  type ApprovedTicketSummary,
} from "./openrouter/request.ts";
import {
  parseOpenRouterResponse,
  type OpenRouterExtractionResult,
} from "./openrouter/response.ts";

export { OpenRouterError } from "./openrouter/errors.ts";
export {
  buildOpenRouterRequest,
  type ApprovedTicketSummary,
} from "./openrouter/request.ts";
export type {
  OpenRouterExtractionResult,
  OpenRouterMetadata,
} from "./openrouter/response.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 90_000;

export async function extractTickets(
  segments: NormalizedTranscriptSegment[],
  approvedTickets: ApprovedTicketSummary[] = [],
): Promise<OpenRouterExtractionResult> {
  const apiKey = requiredConfig("OPENROUTER_API_KEY");
  const request = buildOpenRouterRequest(segments, approvedTickets);

  let response: Response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "x-openrouter-title": "Recall Kanban",
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof OpenRouterError) throw error;
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new OpenRouterError("OpenRouter timed out. Try again.", 408);
    }
    throw new OpenRouterError("Unable to reach OpenRouter. Try again.", 502);
  }

  if (!response.ok) {
    await response.body?.cancel();
    throw upstreamError(response.status);
  }

  return parseOpenRouterResponse(response, segments.length);
}
