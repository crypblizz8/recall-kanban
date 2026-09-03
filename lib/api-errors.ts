import "server-only";

import { NextResponse } from "next/server";
import { OpenRouterError } from "./openrouter.ts";
import { RecallApiError, RecallConfigError, RecallInputError } from "./recall.ts";
import { TicketGenerationError } from "./ticket-generation.ts";

export function errorResponse(error: unknown, fallback: string) {
  const status =
    error instanceof RecallInputError ||
    error instanceof RecallConfigError ||
    error instanceof RecallApiError ||
    error instanceof OpenRouterError ||
    error instanceof TicketGenerationError
      ? error.status
      : 500;

  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status },
  );
}
