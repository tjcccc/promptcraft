# PromptCraft

PromptCraft is a lightweight TypeScript prompt composition engine. It parses variable-based prompt templates, renders final prompt strings, combines prompt parts, validates common authoring errors, and exposes a small CLI for humans and AI agents.

PromptCraft is not an AI provider SDK. It is not tied to OpenAI, Gemini, Nano Banana, Grok, ComfyUI, Stable Diffusion, or any specific model. Provider and model integration belongs in upper-layer applications.

## Status

PromptCraft is in early v0.1.0 development. The current scope is deliberately small:

- parse `.prompt` or `.pcraft` style source text
- resolve `{variable_name}` references recursively
- render one or more prompt bodies
- validate undefined references, circular references, unused variables, and syntax errors
- combine prompt strings or rendered PromptCraft documents
- provide a thin Node.js CLI

## Installation

```bash
pnpm add @promptcraft/core
```

For local development:

```bash
pnpm install
pnpm test
pnpm run build
```

## Basic Syntax

```text
# Variables
base_style = realistic lighting, natural skin texture
camera = FUJIFILM GFX100 80mm
style = {base_style}, shot on {camera}

# Prompt body
prompt = {
A cinematic portrait.
{style}.
}
```

Rendered output:

```text
A cinematic portrait.
realistic lighting, natural skin texture, shot on FUJIFILM GFX100 80mm.
```

Supported in v0.1.0:

- `# Variables` section
- `key = value` variable declarations
- `# Prompt body` section
- body declarations such as `prompt = { ... }`
- multi-line body content
- variable references using `{variable_name}`

Not implemented yet: conditions, loops, imports, includes, inheritance, provider-specific rendering, or prompt library storage.

## Library Usage

```ts
import { combine, parse, render, validate } from "@promptcraft/core";

const document = parse(`# Variables
camera = FUJIFILM GFX100 80mm

# Prompt body
prompt = {
Shot on {camera}.
}`);

const result = render(document);

if (result.ok) {
  console.log(result.text);
}

const validation = validate(document);
const combined = combine([result, "high detail"], { sep: "\n\n" });
```

### API

```ts
parse(source: string): PromptDocument
render(document: PromptDocument, options?: RenderOptions): RenderResult
combine(items: Array<string | PromptDocument | RenderResult>, options?: { sep?: string }): CombineResult
validate(sourceOrDocument: string | PromptDocument): ValidationResult
```

`RenderResult.text` is the primary output: a plain prompt string.

## CLI Usage

The package exposes a `promptcraft` binary.

### Render

```bash
promptcraft render ./portrait.prompt
promptcraft render ./portrait.prompt --var camera="Sony A7R V, 85mm lens"
promptcraft render ./portrait.prompt --body prompt
promptcraft render ./portrait.prompt --json
```

Default output prints only the rendered prompt to stdout. Warnings and errors go to stderr. The command exits with code `0` when rendering is valid and `1` when fatal errors exist.

### Validate

```bash
promptcraft validate ./portrait.prompt
promptcraft validate ./portrait.prompt --json
```

Validation checks syntax, undefined references, circular variable references, and unused variables.

### Combine

```bash
promptcraft combine ./identity.prompt ./camera.prompt ./style.prompt
promptcraft combine ./identity.prompt ./camera.prompt ./style.prompt --sep "\n\n"
promptcraft combine ./identity.prompt ./camera.prompt ./style.prompt --json
```

PromptCraft-looking files are parsed and rendered before combining. Other files are treated as plain text.

### Inspect

```bash
promptcraft inspect ./portrait.prompt
promptcraft inspect ./portrait.prompt --json
```

`inspect` prints the parsed `PromptDocument` for debugging.

## Examples

Multiple bodies can live in one file:

```text
# Variables
subject = a cinematic portrait
style = natural skin texture, soft window light

# Prompt body
prompt = {
{subject}.
{style}.
}
negative = {
plastic skin, over-smoothed face
}
```

Render a non-default body:

```bash
promptcraft render ./portrait.prompt --body negative
```

## Design Constraints

- Core logic is pure TypeScript.
- The package is ESM and Node.js compatible.
- The CLI is a thin wrapper around the core API.
- The core does not depend on React, Tauri, SQLite, or any AI provider SDK.
- Parser behavior should stay simple, predictable, and diagnostic-oriented.
- The DSL should remain intentionally small for v0.1.0.

## Roadmap

Future features may include:

- SQLite prompt library support
- tag-based organization
- React prompt editor
- prompt diff and prompt history
- Tauri app integration
- import/export
- prompt snapshots for generated images

SQLite is intentionally not implemented in v0.1.0. The architecture should remain open for a future package or module with an API such as:

```ts
const library = await PromptLibrary.load("path/to/prompts.sqlite");
await library.list();
await library.get(id);
await library.search({ tagPrefix: "nanobanana/camera_tech" });
```

Future prompt records may support hierarchical tags such as:

```text
#nanobanana/camera_tech/photorealistic
```
