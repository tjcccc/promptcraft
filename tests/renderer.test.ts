import { describe, expect, it } from "vitest";
import { parse, render, validate } from "../src/index.js";

describe("render", () => {
  it("recursively renders the default prompt body", () => {
    const document = parse(`# Variables
base_style = realistic lighting, natural skin texture
camera = FUJIFILM GFX100 80mm
style = {base_style}, shot on {camera}

# Prompt body
prompt = {
A cinematic portrait.
{style}.
}`);

    const result = render(document);

    expect(result.ok).toBe(true);
    expect(result.text).toBe(
      "A cinematic portrait.\nrealistic lighting, natural skin texture, shot on FUJIFILM GFX100 80mm."
    );
    expect(result.variables.style).toBe(
      "realistic lighting, natural skin texture, shot on FUJIFILM GFX100 80mm"
    );
  });

  it("allows render-time variable overrides", () => {
    const document = parse(`# Variables
camera = FUJIFILM GFX100

# Prompt body
prompt = {
Shot on {camera}.
}`);

    const result = render(document, { variables: { camera: "Sony A7R V, 85mm lens" } });

    expect(result.text).toBe("Shot on Sony A7R V, 85mm lens.");
  });

  it("reports undefined variables", () => {
    const document = parse(`# Variables
style = cinematic

# Prompt body
prompt = {
{missing}
}`);

    const result = render(document);

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatchObject({ code: "render.undefined_variable" });
  });

  it("reports circular variables", () => {
    const document = parse(`# Variables
a = {b}
b = {a}

# Prompt body
prompt = {
{a}
}`);

    const result = render(document);

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatchObject({ code: "render.circular_variable" });
  });

  it("warns about unused variables", () => {
    const result = validate(`# Variables
used = crisp
unused = muted

# Prompt body
prompt = {
{used}
}`);

    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual([
      {
        code: "render.unused_variable",
        message: "Variable `unused` is declared but not used."
      }
    ]);
  });
});
