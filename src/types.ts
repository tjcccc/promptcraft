export type PromptIssue = {
  code: string;
  message: string;
  line?: number;
};

export type PromptWarning = PromptIssue;

export type PromptError = PromptIssue;

export type PromptDocument = {
  variables: Record<string, string>;
  bodies: Record<string, string>;
  source?: string;
};

export type RenderOptions = {
  variables?: Record<string, string>;
  body?: string;
};

export type RenderResult = {
  ok: boolean;
  text: string;
  prompts: Record<string, string>;
  variables: Record<string, string>;
  warnings: PromptWarning[];
  errors: PromptError[];
};

export type CombineOptions = {
  sep?: string;
};

export type CombineResult = {
  text: string;
  parts: string[];
  warnings: PromptWarning[];
  errors: PromptError[];
};

export type ValidationResult = {
  ok: boolean;
  warnings: PromptWarning[];
  errors: PromptError[];
};
