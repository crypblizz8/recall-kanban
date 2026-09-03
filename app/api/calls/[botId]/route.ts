import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-errors";
import { getCallStore } from "@/lib/db";
import { requireBotId } from "@/lib/recall";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ botId: string }> },
) {
  try {
    const botId = requireBotId((await params).botId);
    const call = getCallStore().getCall(botId);

    return call
      ? NextResponse.json(call)
      : NextResponse.json(
          { error: "Call not found. Run POST /api/recall/sync first." },
          { status: 404 },
        );
  } catch (error) {
    return errorResponse(error, "Unexpected error loading call.");
  }
}
