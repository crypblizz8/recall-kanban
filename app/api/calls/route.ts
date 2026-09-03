import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-errors";
import { getCallStore } from "@/lib/db";
import { ensureBootstrapped } from "@/lib/sync";

export const dynamic = "force-dynamic";

/** List stored calls. On first use (empty store) this bootstraps from Recall. */
export async function GET() {
  try {
    const store = getCallStore();
    const bootstrap = await ensureBootstrapped(store);

    return NextResponse.json({ bootstrap, calls: store.listCalls() });
  } catch (error) {
    return errorResponse(error, "Unexpected error listing calls.");
  }
}
