import { render } from "./renderer.js";
import type { CombineOptions, CombineResult, PromptDocument, RenderResult } from "./types.js";

export function combine(
  items: Array<string | PromptDocument | RenderResult>,
  options: CombineOptions = {}
): CombineResult {
  const sep = options.sep ?? "\n";
  const parts: string[] = [];
  const warnings: CombineResult["warnings"] = [];
  const errors: CombineResult["errors"] = [];

  items.forEach((item) => {
    if (typeof item === "string") {
      parts.push(item);
      return;
    }

    if (isRenderResult(item)) {
      parts.push(item.text);
      warnings.push(...item.warnings);
      errors.push(...item.errors);
      return;
    }

    const result = render(item);
    parts.push(result.text);
    warnings.push(...result.warnings);
    errors.push(...result.errors);
  });

  return {
    text: parts.join(sep),
    parts,
    warnings,
    errors
  };
}

function isRenderResult(value: PromptDocument | RenderResult): value is RenderResult {
  return "ok" in value && "prompts" in value && "errors" in value;
}
