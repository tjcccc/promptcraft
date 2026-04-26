#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { combine } from "./combiner.js";
import { parse, PromptParseError } from "./parser.js";
import { render } from "./renderer.js";
import { validate } from "./validator.js";
import type { CombineResult, PromptDocument, PromptError, PromptWarning } from "./types.js";

type CliIO = {
  stdout: WritableStream;
  stderr: WritableStream;
};

type WritableStream = {
  write(chunk: string): unknown;
};

type ParsedArgs = {
  command?: string;
  files: string[];
  vars: Record<string, string>;
  body?: string;
  sep?: string;
  json: boolean;
};

export async function runCli(argv: string[], io: CliIO = { stdout: process.stdout, stderr: process.stderr }): Promise<number> {
  const args = parseArgs(argv);

  try {
    switch (args.command) {
      case "render":
        return await renderCommand(args, io);
      case "validate":
        return await validateCommand(args, io);
      case "combine":
        return await combineCommand(args, io);
      case "inspect":
        return await inspectCommand(args, io);
      default:
        printUsage(io.stderr);
        return 1;
    }
  } catch (error) {
    if (error instanceof PromptParseError) {
      if (args.json) {
        writeJson(io.stdout, { ok: false, warnings: [], errors: error.errors });
      } else {
        writeIssues(io.stderr, [], error.errors);
      }
      return 1;
    }

    const message = error instanceof Error ? error.message : String(error);
    io.stderr.write(`${message}\n`);
    return 1;
  }
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv;
  const parsed: ParsedArgs = {
    command,
    files: [],
    vars: {},
    json: false
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    if (arg === "--json") {
      parsed.json = true;
      continue;
    }

    if (arg === "--body") {
      parsed.body = requireValue(rest, index, "--body");
      index += 1;
      continue;
    }

    if (arg === "--sep") {
      parsed.sep = decodeEscapes(requireValue(rest, index, "--sep"));
      index += 1;
      continue;
    }

    if (arg === "--var") {
      const assignment = requireValue(rest, index, "--var");
      const equalIndex = assignment.indexOf("=");
      if (equalIndex <= 0) {
        throw new Error("Expected --var in the form name=value.");
      }
      parsed.vars[assignment.slice(0, equalIndex)] = assignment.slice(equalIndex + 1);
      index += 1;
      continue;
    }

    if (arg.startsWith("--var=")) {
      const assignment = arg.slice("--var=".length);
      const equalIndex = assignment.indexOf("=");
      if (equalIndex <= 0) {
        throw new Error("Expected --var in the form name=value.");
      }
      parsed.vars[assignment.slice(0, equalIndex)] = assignment.slice(equalIndex + 1);
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    parsed.files.push(arg);
  }

  return parsed;
}

async function renderCommand(args: ParsedArgs, io: CliIO): Promise<number> {
  const file = requireSingleFile(args);
  const document = parse(await readText(file));
  const result = render(document, {
    body: args.body,
    variables: Object.keys(args.vars).length > 0 ? args.vars : undefined
  });

  if (args.json) {
    writeJson(io.stdout, result);
  } else {
    if (result.text) {
      io.stdout.write(`${result.text}\n`);
    }
    writeIssues(io.stderr, result.warnings, result.errors);
  }

  return result.ok ? 0 : 1;
}

async function validateCommand(args: ParsedArgs, io: CliIO): Promise<number> {
  const file = requireSingleFile(args);
  const result = validate(await readText(file));

  if (args.json) {
    writeJson(io.stdout, result);
  } else if (result.ok) {
    io.stdout.write("Valid PromptCraft document.\n");
    writeIssues(io.stderr, result.warnings, []);
  } else {
    writeIssues(io.stderr, result.warnings, result.errors);
  }

  return result.ok ? 0 : 1;
}

async function combineCommand(args: ParsedArgs, io: CliIO): Promise<number> {
  if (args.files.length === 0) {
    throw new Error("Expected at least one file.");
  }

  const warnings: PromptWarning[] = [];
  const errors: PromptError[] = [];
  const items: Array<string | PromptDocument> = [];

  for (const file of args.files) {
    const source = await readText(file);
    if (looksLikePromptCraft(source)) {
      try {
        items.push(parse(source));
      } catch (error) {
        if (error instanceof PromptParseError) {
          errors.push(...error.errors.map((issue) => prefixIssue(issue, file)));
          items.push("");
          continue;
        }
        throw error;
      }
    } else {
      items.push(source.trim());
    }
  }

  const result = combine(items, { sep: args.sep });
  const output: CombineResult = {
    text: result.text,
    parts: result.parts,
    warnings: [...warnings, ...result.warnings],
    errors: [...errors, ...result.errors]
  };

  if (args.json) {
    writeJson(io.stdout, output);
  } else {
    if (output.text) {
      io.stdout.write(`${output.text}\n`);
    }
    writeIssues(io.stderr, output.warnings, output.errors);
  }

  return output.errors.length === 0 ? 0 : 1;
}

async function inspectCommand(args: ParsedArgs, io: CliIO): Promise<number> {
  const file = requireSingleFile(args);
  const document = parse(await readText(file));
  writeJson(io.stdout, document);
  return 0;
}

function requireSingleFile(args: ParsedArgs): string {
  if (args.files.length !== 1) {
    throw new Error("Expected exactly one file.");
  }
  return args.files[0];
}

function requireValue(args: string[], index: number, option: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Expected a value after ${option}.`);
  }
  return value;
}

function looksLikePromptCraft(source: string): boolean {
  return /(^|\n)\s*#\s*(Variables|Prompt body|Prompt bodies)\s*(\n|$)/.test(source);
}

function decodeEscapes(value: string): string {
  return value.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\r/g, "\r");
}

async function readText(file: string): Promise<string> {
  return readFile(file, "utf8");
}

function writeJson(stream: WritableStream, value: unknown): void {
  stream.write(`${JSON.stringify(value, null, 2)}\n`);
}

function writeIssues(
  stream: WritableStream,
  warnings: PromptWarning[],
  errors: PromptError[]
): void {
  warnings.forEach((warning) => {
    stream.write(`Warning: ${formatIssue(warning)}\n`);
  });
  errors.forEach((error) => {
    stream.write(`Error: ${formatIssue(error)}\n`);
  });
}

function formatIssue(issue: PromptWarning | PromptError): string {
  const location = issue.line ? `line ${issue.line}: ` : "";
  return `${location}${issue.message}`;
}

function prefixIssue(issue: PromptError, file: string): PromptError {
  return {
    ...issue,
    message: `${file}: ${issue.message}`
  };
}

function printUsage(stream: WritableStream): void {
  stream.write(`Usage:
  promptcraft render <file> [--var name=value] [--body name] [--json]
  promptcraft validate <file> [--json]
  promptcraft combine <file...> [--sep value] [--json]
  promptcraft inspect <file> [--json]
`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
