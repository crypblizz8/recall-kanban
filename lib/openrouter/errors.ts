export class OpenRouterError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenRouterError";
    this.status = status;
  }
}

export function upstreamError(status: number): OpenRouterError {
  if (status === 401) {
    return new OpenRouterError("OpenRouter rejected the configured API key.", 502);
  }
  if (status === 402) {
    return new OpenRouterError("The OpenRouter account has insufficient credits.", 502);
  }
  if (status === 408) {
    return new OpenRouterError("OpenRouter timed out. Try again.", 408);
  }
  if (status === 413) {
    return new OpenRouterError(
      "This transcript is too large for the configured OpenRouter model. Choose a model with a larger context window and try again.",
      413,
    );
  }
  if (status === 429) {
    return new OpenRouterError("OpenRouter rate limit reached. Try again shortly.", 429);
  }
  return new OpenRouterError("OpenRouter is unavailable. Try again.", 502);
}

export function validationError(detail: string): OpenRouterError {
  return new OpenRouterError(
    `OpenRouter returned ticket data that could not be validated: ${detail}`,
    502,
  );
}
