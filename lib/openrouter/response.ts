import { z } from "zod";

import {
  TicketExtractionSchema,
  type TicketExtraction,
} from "../ticket-schema.ts";
import { validationError } from "./errors.ts";

const OpenRouterEnvelopeSchema = z
  .object({
    id: z.string().min(1),
    model: z.string().min(1),
    choices: z
      .array(
        z
          .object({
            finish_reason: z.string().nullable().optional(),
            message: z
              .object({ content: z.string() })
              .passthrough(),
          })
          .passthrough(),
      )
      .min(1),
    usage: z
      .object({
        prompt_tokens: z.number().int().nonnegative().optional(),
        completion_tokens: z.number().int().nonnegative().optional(),
        total_tokens: z.number().int().nonnegative().optional(),
      })
      .optional(),
  })
  .passthrough();

export type OpenRouterMetadata = {
  responseId: string;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
};

export type OpenRouterExtractionResult = {
  extraction: TicketExtraction;
  metadata: OpenRouterMetadata;
};

export async function parseOpenRouterResponse(
  response: Response,
  transcriptSegmentCount: number,
): Promise<OpenRouterExtractionResult> {
  let envelopeInput: unknown;
  try {
    envelopeInput = await response.json();
  } catch {
    throw validationError("the response was not JSON.");
  }

  const envelopeResult = OpenRouterEnvelopeSchema.safeParse(envelopeInput);
  if (!envelopeResult.success) {
    throw validationError("the completion envelope was invalid.");
  }

  let extractionInput: unknown;
  try {
    extractionInput = JSON.parse(envelopeResult.data.choices[0].message.content);
  } catch {
    throw validationError("the completion content was not JSON.");
  }

  const extractionResult = TicketExtractionSchema.safeParse(extractionInput);
  if (!extractionResult.success) {
    throw validationError("the completion did not match the ticket schema.");
  }

  for (const ticket of extractionResult.data.tickets) {
    for (const sequence of ticket.evidenceSegmentSequences) {
      if (sequence >= transcriptSegmentCount) {
        throw validationError(`ticket evidence referenced unknown transcript segment ${sequence}.`);
      }
    }
  }

  const usage = envelopeResult.data.usage;
  return {
    extraction: extractionResult.data,
    metadata: {
      responseId: envelopeResult.data.id,
      model: envelopeResult.data.model,
      promptTokens: usage?.prompt_tokens ?? null,
      completionTokens: usage?.completion_tokens ?? null,
      totalTokens: usage?.total_tokens ?? null,
    },
  };
}
