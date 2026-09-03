import type { Ticket } from "../app/_components/evidence-desk/types.ts";

const LINEAR_PRIORITY = {
  p0: "urgent",
  p1: "high",
  p2: "low",
} as const;

const LINEAR_LABEL = {
  bug: "Bug",
  feature: "Feature",
  task: "Task",
} as const;

function formatTimestamp(seconds: number | null): string {
  if (seconds == null) return "Time unavailable";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function quoteMarkdown(value: string): string {
  return value.split("\n").map((line) => `> ${line}`).join("\n");
}

function buildDescription(ticket: Ticket): string {
  const sections = [ticket.description];

  if (ticket.evidence.length) {
    sections.push(
      "## Source evidence",
      ...ticket.evidence.flatMap((evidence) => [
        `**${evidence.speaker} — ${formatTimestamp(evidence.startSeconds)}**`,
        quoteMarkdown(evidence.text),
      ]),
    );
  }

  if (ticket.missingEvidence.length) {
    sections.push(
      "## Open questions",
      ticket.missingEvidence.map((item) => `- ${item}`).join("\n"),
    );
  }

  sections.push(
    `Source: Recall Kanban ticket ED-${ticket.id}`,
    `Confidence: ${ticket.confidence}%`,
  );

  return sections.join("\n\n");
}

export function buildLinearIssueUrl(
  ticket: Ticket,
  teamId: string | null | undefined,
): string {
  const normalizedTeamId = teamId?.trim();
  const url = normalizedTeamId
    ? new URL(`/team/${encodeURIComponent(normalizedTeamId)}/new`, "https://linear.app")
    : new URL("https://linear.new");

  url.searchParams.set("title", ticket.title);
  url.searchParams.set("description", buildDescription(ticket));
  url.searchParams.set("priority", LINEAR_PRIORITY[ticket.priority]);
  url.searchParams.set("labels", LINEAR_LABEL[ticket.kind]);

  return url.toString();
}
