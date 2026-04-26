import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { runCli } from "../src/cli.js";

function createIO() {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stdout: { write: (chunk: string) => void (stdout += chunk) },
      stderr: { write: (chunk: string) => void (stderr += chunk) }
    },
    output: () => ({ stdout, stderr })
  };
}

async function writePrompt(source: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "promptcraft-"));
  const file = join(directory, "sample.prompt");
  await writeFile(file, source, "utf8");
  return file;
}

describe("runCli", () => {
  it("renders plain text to stdout", async () => {
    const file = await writePrompt(`# Variables
camera = FUJIFILM

# Prompt body
prompt = {
Shot on {camera}.
}`);
    const { io, output } = createIO();

    const code = await runCli(["render", file], io);

    expect(code).toBe(0);
    expect(output().stdout).toBe("Shot on FUJIFILM.\n");
    expect(output().stderr).toBe("");
  });

  it("supports --var overrides and --json", async () => {
    const file = await writePrompt(`# Variables
camera = FUJIFILM

# Prompt body
prompt = {
Shot on {camera}.
}`);
    const { io, output } = createIO();

    const code = await runCli(["render", file, "--var", "camera=Sony A7R V", "--json"], io);
    const json = JSON.parse(output().stdout);

    expect(code).toBe(0);
    expect(json.text).toBe("Shot on Sony A7R V.");
  });

  it("validates fatal errors with exit code 1", async () => {
    const file = await writePrompt(`# Variables
style = clean

# Prompt body
prompt = {
{missing}
}`);
    const { io, output } = createIO();

    const code = await runCli(["validate", file], io);

    expect(code).toBe(1);
    expect(output().stderr).toContain("Undefined variable `missing`.");
  });

  it("combines rendered PromptCraft files", async () => {
    const first = await writePrompt(`# Variables
name = identity

# Prompt body
prompt = {
{name}
}`);
    const second = await writePrompt(`# Variables
style = cinematic

# Prompt body
prompt = {
{style}
}`);
    const { io, output } = createIO();

    const code = await runCli(["combine", first, second, "--sep", "\\n\\n"], io);

    expect(code).toBe(0);
    expect(output().stdout).toBe("identity\n\ncinematic\n");
  });
});
