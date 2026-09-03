import { EvidenceDesk } from "./evidence-desk";
import {
  boardTicketFromTicket,
  createBoardColumns,
} from "./_components/evidence-desk/data";
import { getCallStore } from "@/lib/db";
import { ensureBootstrapped } from "@/lib/sync";

export const dynamic = "force-dynamic";

export default async function Home() {
  const store = getCallStore();
  await ensureBootstrapped(store);
  const calls = store.listCalls();
  const linearTeamId = process.env.LINEAR_TEAM_ID ?? null;
  const initialCall = calls[0] ? store.getCall(calls[0].botId) : null;
  const callsByBotId = new Map(calls.map((call) => [call.botId, call]));
  const boardTickets = store.listApprovedTickets().flatMap((ticket) => {
    const call = callsByBotId.get(ticket.botId);
    return call ? [boardTicketFromTicket(ticket, call, linearTeamId)] : [];
  });

  return (
    <EvidenceDesk
      initialBoardColumns={createBoardColumns(boardTickets)}
      initialCall={initialCall}
      initialCalls={calls}
      linearTeamId={linearTeamId}
    />
  );
}
