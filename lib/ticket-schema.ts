import { z } from "zod";

const MissingEvidenceSchema = z.string().trim().min(1).max(160);

export const GeneratedTicketSchema = z
  .object({
    title: z.string().trim().min(1).max(120).describe("Concise, actionable ticket title."),
    description: z.string().trim().min(1).max(1_000).describe("Factual description supported by the transcript."),
    kind: z.enum(["bug", "feature", "task"]).describe("Classification of the work item."),
    priority: z.enum(["p0", "p1", "p2"]).describe("Impact-based priority using the supplied definitions."),
    confidence: z.number().int().min(0).max(100).describe("Confidence that the transcript supports an actionable ticket."),
    missingEvidence: z.array(MissingEvidenceSchema).max(5).describe("Information still needed to act confidently; empty when none is apparent."),
    evidenceSegmentSequences: z
      .array(z.number().int().nonnegative())
      .min(1)
      .max(8)
      .describe("Unique zero-based transcript segment sequence numbers supporting this ticket.")
      .refine((values) => new Set(values).size === values.length, {
        message: "Evidence segment sequences must be unique.",
      }),
  })
  .strict();

export const TicketExtractionSchema = z
  .object({
    schemaVersion: z.literal(1).describe("Ticket extraction schema version."),
    tickets: z.array(GeneratedTicketSchema).max(20).describe("Independently actionable, evidence-backed ticket candidates."),
  })
  .strict();

export const GenerateTicketsRequestSchema = z
  .object({ force: z.boolean().optional() })
  .strict();

export const ApproveTicketRequestSchema = z
  .object({ status: z.literal("approved") })
  .strict();

export type GeneratedTicket = z.infer<typeof GeneratedTicketSchema>;
export type TicketExtraction = z.infer<typeof TicketExtractionSchema>;

export const TICKET_EXTRACTION_JSON_SCHEMA = z.toJSONSchema(
  TicketExtractionSchema,
  { target: "draft-7", io: "output" },
);
