import type { PromptDocument, PromptError, PromptWarning, RenderOptions, RenderResult } from "./types.js";

const REF_RE = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

export function render(document: PromptDocument, options: RenderOptions = {}): RenderResult {
  const sourceVariables = { ...document.variables, ...options.variables };
  const errors: PromptError[] = [];
  const warnings: PromptWarning[] = [];
  const usedVariables = new Set<string>();
  const resolvedVariables: Record<string, string> = {};

  const resolveVariable = (name: string, stack: string[], trackUsage: boolean): string => {
    if (Object.prototype.hasOwnProperty.call(resolvedVariables, name)) {
      return resolvedVariables[name];
    }

    if (!Object.prototype.hasOwnProperty.call(sourceVariables, name)) {
      errors.push({
        code: "render.undefined_variable",
        message: `Undefined variable \`${name}\`.`
      });
      return `{${name}}`;
    }

    if (stack.includes(name)) {
      const cycle = [...stack.slice(stack.indexOf(name)), name].join(" -> ");
      errors.push({
        code: "render.circular_variable",
        message: `Circular variable reference detected: ${cycle}.`
      });
      return `{${name}}`;
    }

    const rawValue = sourceVariables[name];
    const value = rawValue.replace(REF_RE, (_match, refName: string) => {
      if (trackUsage) {
        usedVariables.add(refName);
      }
      return resolveVariable(refName, [...stack, name], trackUsage);
    });
    resolvedVariables[name] = value;
    return value;
  };

  const prompts: Record<string, string> = {};
  Object.entries(document.bodies).forEach(([name, body]) => {
    prompts[name] = body.replace(REF_RE, (_match, refName: string) => {
      usedVariables.add(refName);
      return resolveVariable(refName, [], true);
    });
  });

  Object.keys(sourceVariables).forEach((name) => {
    resolveVariable(name, [], false);
  });

  Object.keys(sourceVariables).forEach((name) => {
    if (!usedVariables.has(name)) {
      warnings.push({
        code: "render.unused_variable",
        message: `Variable \`${name}\` is declared but not used.`
      });
    }
  });

  const selectedBody = selectBody(document, options.body);
  if (!selectedBody) {
    errors.push({
      code: "render.missing_body",
      message: "No prompt body is available to render."
    });
  } else if (options.body && !Object.prototype.hasOwnProperty.call(document.bodies, options.body)) {
    errors.push({
      code: "render.unknown_body",
      message: `Body \`${options.body}\` does not exist.`
    });
  }

  const text = selectedBody ? prompts[selectedBody] ?? "" : "";

  return {
    ok: errors.length === 0,
    text,
    prompts,
    variables: resolvedVariables,
    warnings,
    errors
  };
}

function selectBody(document: PromptDocument, requested?: string): string | undefined {
  if (requested) {
    return requested;
  }
  if (Object.prototype.hasOwnProperty.call(document.bodies, "prompt")) {
    return "prompt";
  }
  return Object.keys(document.bodies)[0];
}
