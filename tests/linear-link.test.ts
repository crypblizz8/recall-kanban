import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildLinearIssueUrl } from "../lib/linear-link.ts";
import type { Ticket } from "../app/_components/evidence-desk/types.ts";

const ticket: Ticket = {
  id: 42,
  botId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  title: "Keep exports in the selected range",
  description: "The export resets its date range.",
  kind: "bug",
  priority: "p1",
  confidence: 92,
  missingEvidence: ["Affected browser"],
  status: "approved",
  evidence: [
    {
      sequence: 0,
      speaker: "Customer",
      startSeconds: 61,
      endSeconds: 64,
      text: "The export resets its range",
    },
  ],
  createdAt: "2026-09-03T00:01:00Z",
  updatedAt: "2026-09-03T00:02:00Z",
};

describe("buildLinearIssueUrl", () => {
  it("prefills the configured team and all supported ticket fields", () => {
    const url = new URL(buildLinearIssueUrl(ticket, "ENG"));

    assert.equal(url.origin, "https://linear.app");
    assert.equal(url.pathname, "/team/ENG/new");
    assert.equal(url.searchParams.get("title"), ticket.title);
    assert.equal(url.searchParams.get("priority"), "high");
    assert.equal(url.searchParams.get("labels"), "Bug");
    assert.equal(
      url.searchParams.get("description"),
      [
        ticket.description,
        "## Source evidence",
        "**Customer — 1:01**",
        "> The export resets its range",
        "## Open questions",
        "- Affected browser",
        "Source: Recall Kanban ticket ED-42",
        "Confidence: 92%",
      ].join("\n\n"),
    );
  });

  it("falls back to the workspace-neutral create page without a team", () => {
    const url = new URL(buildLinearIssueUrl(ticket, "   "));

    assert.equal(url.origin, "https://linear.new");
    assert.equal(url.pathname, "/");
    assert.equal(url.searchParams.get("title"), ticket.title);
  });

  it("maps the local three-level priorities to Linear priorities", () => {
    assert.equal(
      new URL(buildLinearIssueUrl({ ...ticket, priority: "p0" }, null)).searchParams.get("priority"),
      "urgent",
    );
    assert.equal(
      new URL(buildLinearIssueUrl({ ...ticket, priority: "p2" }, null)).searchParams.get("priority"),
      "low",
    );
  });
});
