import type { PromptDocument, PromptError } from "./types.js";

const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const DECL_RE = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/;
const BODY_START_RE = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\{\s*$/;

type Section = "variables" | "bodies" | null;

export class PromptParseError extends Error {
  readonly errors: PromptError[];

  constructor(errors: PromptError[]) {
    super(errors.map(formatIssue).join("\n"));
    this.name = "PromptParseError";
    this.errors = errors;
  }
}

export function parse(source: string): PromptDocument {
  const variables: Record<string, string> = {};
  const bodies: Record<string, string> = {};
  const errors: PromptError[] = [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  let section: Section = null;
  let bodyName: string | null = null;
  let bodyStartLine = 0;
  let bodyLines: string[] = [];

  const finishBody = () => {
    if (bodyName) {
      bodies[bodyName] = bodyLines.join("\n").trim();
    }
    bodyName = null;
    bodyStartLine = 0;
    bodyLines = [];
  };

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const trimmed = rawLine.trim();

    if (bodyName) {
      if (trimmed === "}") {
        finishBody();
        return;
      }
      bodyLines.push(rawLine);
      return;
    }

    if (!trimmed) {
      return;
    }

    if (trimmed === "# Variables") {
      section = "variables";
      return;
    }

    if (trimmed === "# Prompt body" || trimmed === "# Prompt bodies") {
      section = "bodies";
      return;
    }

    if (trimmed.startsWith("#")) {
      return;
    }

    if (section === "variables") {
      const match = DECL_RE.exec(rawLine);
      if (!match) {
        errors.push({
          code: "syntax.invalid_variable_declaration",
          message: "Expected variable declaration in the form `name = value`.",
          line: lineNumber
        });
        return;
      }

      const [, name, rawValue] = match;
      if (!NAME_RE.test(name)) {
        errors.push({
          code: "syntax.invalid_name",
          message: `Invalid variable name \`${name}\`.`,
          line: lineNumber
        });
        return;
      }
      variables[name] = stripBalancedQuotes(rawValue.trim());
      return;
    }

    if (section === "bodies") {
      const match = BODY_START_RE.exec(rawLine);
      if (!match) {
        errors.push({
          code: "syntax.invalid_body_declaration",
          message: "Expected body declaration in the form `name = {`.",
          line: lineNumber
        });
        return;
      }

      const [, name] = match;
      bodyName = name;
      bodyStartLine = lineNumber;
      bodyLines = [];
      return;
    }

    errors.push({
      code: "syntax.missing_section",
      message: "Content must appear under `# Variables` or `# Prompt body`.",
      line: lineNumber
    });
  });

  if (bodyName) {
    errors.push({
      code: "syntax.unclosed_body",
      message: `Body \`${bodyName}\` opened on line ${bodyStartLine} is missing a closing \`}\`.`,
      line: bodyStartLine
    });
  }

  if (errors.length > 0) {
    throw new PromptParseError(errors);
  }

  return { variables, bodies, source };
}

function stripBalancedQuotes(value: string): string {
  if (value.length < 2) {
    return value;
  }

  const first = value[0];
  const last = value[value.length - 1];
  if ((first === `"` && last === `"`) || (first === `'` && last === `'`)) {
    return value.slice(1, -1);
  }
  return value;
}

function formatIssue(issue: PromptError): string {
  const location = issue.line ? `Line ${issue.line}: ` : "";
  return `${location}${issue.message}`;
}
