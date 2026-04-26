import { describe, expect, it } from "vitest";
import { combine, parse, render } from "../src/index.js";

describe("combine", () => {
  it("combines strings, documents, and render results in order", () => {
    const document = parse(`# Variables
style = clean

# Prompt body
prompt = {
{style} light
}`);
    const rendered = render(
      parse(`# Variables
camera = 80mm

# Prompt body
prompt = {
shot on {camera}
}`)
    );

    const result = combine(["identity", document, rendered], { sep: "\n\n" });

    expect(result.text).toBe("identity\n\nclean light\n\nshot on 80mm");
    expect(result.parts).toEqual(["identity", "clean light", "shot on 80mm"]);
  });
});
