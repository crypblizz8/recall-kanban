import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api-errors";
import { getCallStore } from "@/lib/db";
import {
  generateTicketsForCall,
  TicketGenerationError,
} from "@/lib/ticket-generation";
import { GenerateTicketsRequestSchema } from "@/lib/ticket-schema";
import { requireBotId } from "@/lib/recall";

export const dynamic = "force-dynamic";

async function requestBody(request: Request) {
  const text = await request.text();
  let input: unknown = {};
  if (text.trim()) {
    try {
      input = JSON.parse(text);
    } catch {
      throw new TicketGenerationError("Request body must be valid JSON.", 400);
    }
  }

  const result = GenerateTicketsRequestSchema.safeParse(input);
  if (!result.success) {
    throw new TicketGenerationError(
      'Request body must contain only an optional boolean "force" field.',
      400,
    );
  }
  return result.data;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ botId: string }> },
) {
  try {
    const botId = requireBotId((await params).botId);
    const { force = false } = await requestBody(request);
    const result = await generateTicketsForCall(
      botId,
      force,
      getCallStore(),
    );

    return NextResponse.json({
      reused: result.reused,
      generation: result.call.generation,
      tickets: result.call.tickets,
    });
  } catch (error) {
    return errorResponse(error, "Unexpected ticket generation error.");
  }
}
