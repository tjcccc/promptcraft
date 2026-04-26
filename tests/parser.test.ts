import { describe, expect, it } from "vitest";
import { parse, PromptParseError } from "../src/index.js";

const source = `# Variables
base_style = realistic lighting, natural skin texture
camera = FUJIFILM GFX100 80mm
style = {base_style}, shot on {camera}

# Prompt body
prompt = {
A cinematic portrait.
{style}.
}
negative = {
low quality
}`;

describe("parse", () => {
  it("parses variables and multiple prompt bodies", () => {
    const document = parse(source);

    expect(document.variables).toEqual({
      base_style: "realistic lighting, natural skin texture",
      camera: "FUJIFILM GFX100 80mm",
      style: "{base_style}, shot on {camera}"
    });
    expect(document.bodies).toEqual({
      prompt: "A cinematic portrait.\n{style}.",
      negative: "low quality"
    });
  });

  it("throws line-numbered syntax errors", () => {
    expect(() =>
      parse(`# Variables
not a declaration
`)
    ).toThrow(PromptParseError);

    try {
      parse(`# Variables
not a declaration
`);
    } catch (error) {
      expect(error).toBeInstanceOf(PromptParseError);
      expect((error as PromptParseError).errors[0]).toMatchObject({
        code: "syntax.invalid_variable_declaration",
        line: 2
      });
    }
  });
});
