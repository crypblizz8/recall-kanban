import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-errors";
import { syncAllCallsOnce } from "@/lib/sync";

export const dynamic = "force-dynamic";

/** Pull every finished Recall call into the local store. Idempotent. */
export async function POST() {
  try {
    return NextResponse.json(await syncAllCallsOnce());
  } catch (error) {
    return errorResponse(error, "Unexpected sync error.");
  }
}
