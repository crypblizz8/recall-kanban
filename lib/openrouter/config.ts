import { OpenRouterError } from "./errors.ts";

type OpenRouterConfigName = "OPENROUTER_API_KEY" | "OPENROUTER_MODEL";

export function requiredConfig(name: OpenRouterConfigName): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new OpenRouterError(`${name} is not configured on the server.`, 500);
  }
  return value;
}
