import { parse, PromptParseError } from "./parser.js";
import { render } from "./renderer.js";
import type { PromptDocument, ValidationResult } from "./types.js";

export function validate(sourceOrDocument: string | PromptDocument): ValidationResult {
  let document: PromptDocument;

  try {
    document = typeof sourceOrDocument === "string" ? parse(sourceOrDocument) : sourceOrDocument;
  } catch (error) {
    if (error instanceof PromptParseError) {
      return {
        ok: false,
        warnings: [],
        errors: error.errors
      };
    }
    throw error;
  }

  const result = render(document);
  return {
    ok: result.ok,
    warnings: result.warnings,
    errors: result.errors
  };
}
