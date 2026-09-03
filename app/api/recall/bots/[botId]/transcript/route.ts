import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-errors";
import { getBotTranscript } from "@/lib/recall";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ botId: string }> },
) {
  try {
    const { botId } = await params;
    const transcript = await getBotTranscript(botId);

    return NextResponse.json(transcript);
  } catch (error) {
    return errorResponse(error, "Unexpected transcript route error.");
  }
}
