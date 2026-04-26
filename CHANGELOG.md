# Changelog

All notable changes to PromptCraft will be documented in this file.

## 0.1.0 - 2026-04-26

### Added

- Initialized PromptCraft as the `@promptcraft/core` TypeScript ESM npm package.
- Added the core library API: `parse`, `render`, `validate`, and `combine`.
- Added parser support for `# Variables`, `# Prompt body`, `key = value` declarations, multi-line bodies, and `{variable_name}` references.
- Added recursive variable rendering with override variables.
- Added validation for undefined variables, circular variable references, unused variables, missing bodies, unknown bodies, and syntax errors with line numbers where possible.
- Added the `promptcraft` CLI with `render`, `validate`, `combine`, and `inspect` commands.
- Added JSON output modes for CLI commands.
- Added Vitest coverage for parser, renderer, combiner, and CLI behavior.
- Added README documentation for product positioning, installation, syntax, API usage, CLI usage, examples, design constraints, and roadmap.
- Documented pnpm as the local development package manager.
