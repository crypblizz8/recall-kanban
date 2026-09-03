import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api-errors";
import { getCallStore } from "@/lib/db";
import { TicketGenerationError } from "@/lib/ticket-generation";
import { ApproveTicketRequestSchema } from "@/lib/ticket-schema";

export const dynamic = "force-dynamic";

function requireTicketId(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new TicketGenerationError("Ticket ID must be a positive integer.", 400);
  }
  const ticketId = Number(value);
  if (!Number.isSafeInteger(ticketId) || ticketId < 1) {
    throw new TicketGenerationError("Ticket ID must be a positive integer.", 400);
  }
  return ticketId;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    const ticketId = requireTicketId((await params).ticketId);
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      throw new TicketGenerationError("Request body must be valid JSON.", 400);
    }
    if (!ApproveTicketRequestSchema.safeParse(input).success) {
      throw new TicketGenerationError(
        'Request body must be exactly { "status": "approved" }.',
        400,
      );
    }

    const ticket = getCallStore().approveTicket(ticketId);
    return ticket
      ? NextResponse.json({ ticket })
      : NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  } catch (error) {
    return errorResponse(error, "Unexpected ticket update error.");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    const ticketId = requireTicketId((await params).ticketId);
    return getCallStore().removeCandidateTicket(ticketId)
      ? NextResponse.json({ removed: true })
      : NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  } catch (error) {
    return errorResponse(error, "Unexpected candidate removal error.");
  }
}
